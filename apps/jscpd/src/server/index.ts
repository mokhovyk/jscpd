import express, {Express, Request, Response} from 'express';
import {IClone, IMapFrame, IOptions, IStatistic, IStore, Statistic} from '@jscpd/core';
import {EntryWithContent, getFilesToDetect, InFilesDetector} from '@jscpd/finder';
import {getStore} from '../init/store';
import {Tokenizer, getSupportedFormats, getFormatByFile} from '@jscpd/tokenizer';
import {createHash} from 'crypto';
import {getDefaultOptions} from '@jscpd/core';
import {Detector} from '@jscpd/core';

interface CheckRequest {
  code: string;
  format?: string;
  filename?: string;
}

interface CheckResponse {
  duplications: IClone[];
  statistics: {
    snippetLines: number;
    snippetTokens: number;
    duplicatedLines: number;
    duplicatedTokens: number;
    duplicationsFound: number;
    percentageDuplicated: number;
    percentageTokens: number;
  };
}

export class JscpdServer {
  private app: Express;
  private store: IStore<IMapFrame> | null = null;
  private statistic: Statistic | null = null;
  private options: IOptions;
  private codebaseIndexed = false;

  constructor(private workingDirectory: string, options: Partial<IOptions> = {}) {
    this.app = express();
    this.app.use(express.json({limit: '10mb'}));

    this.options = {
      ...getDefaultOptions(),
      ...options,
      path: [workingDirectory],
      format: options.format || getSupportedFormats(),
      silent: true,
    };

    const hashFunction = (value: string): string => {
      return createHash('md5').update(value).digest('hex');
    };
    this.options.hashFunction = this.options.hashFunction || hashFunction;

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({status: 'ok', codebaseIndexed: this.codebaseIndexed});
    });

    this.app.get('/stats', async (_req: Request, res: Response) => {
      try {
        if (!this.statistic) {
          await this.indexCodebase();
        }

        const stats = this.statistic!.getStatistic();
        res.json(stats);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to retrieve statistics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    this.app.post('/check', async (req: Request, res: Response) => {
      try {
        const {code, format, filename}: CheckRequest = req.body;

        if (!code) {
          return res.status(400).json({
            error: 'Missing required field: code',
          });
        }

        if (!this.statistic || !this.store) {
          await this.indexCodebase();
        }

        const detectedFormat = format || (filename ? getFormatByFile(filename, this.options.formatsExts) : undefined) || 'javascript';

        const snippetId = `snippet_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const tokenizer = new Tokenizer();
        const snippetTokenMaps = tokenizer.generateMaps(snippetId, code, detectedFormat, this.options);

        if (snippetTokenMaps.length === 0) {
          return res.json({
            duplications: [],
            statistics: {
              snippetLines: code.split('\n').length,
              snippetTokens: 0,
              duplicatedLines: 0,
              duplicatedTokens: 0,
              duplicationsFound: 0,
              percentageDuplicated: 0,
              percentageTokens: 0,
            },
          } as CheckResponse);
        }

        const detector = new Detector(tokenizer, this.store!, [], this.options);

        const allClones: IClone[] = [];
        let totalSnippetLines = 0;
        let totalSnippetTokens = 0;

        for (const tokenMap of snippetTokenMaps) {
          totalSnippetLines += tokenMap.getLinesCount();
          totalSnippetTokens += tokenMap.getTokensCount();

          this.store!.namespace(detectedFormat);
          const clones = await detector.detect(snippetId, code, detectedFormat);
          allClones.push(...clones);
        }

        const duplicatedLinesSet = new Set<number>();
        let totalDuplicatedTokens = 0;

        for (const clone of allClones) {
          if (clone.duplicationA.sourceId === snippetId) {
            const startLine = clone.duplicationA.start.line;
            const endLine = clone.duplicationA.end.line;
            for (let i = startLine; i <= endLine; i++) {
              duplicatedLinesSet.add(i);
            }
            totalDuplicatedTokens += (clone.duplicationA.end.position - clone.duplicationA.start.position);
          }
          if (clone.duplicationB.sourceId === snippetId) {
            const startLine = clone.duplicationB.start.line;
            const endLine = clone.duplicationB.end.line;
            for (let i = startLine; i <= endLine; i++) {
              duplicatedLinesSet.add(i);
            }
            totalDuplicatedTokens += (clone.duplicationB.end.position - clone.duplicationB.start.position);
          }
        }

        const duplicatedLines = duplicatedLinesSet.size;
        const percentageDuplicated = totalSnippetLines > 0
          ? Math.round((10000 * duplicatedLines) / totalSnippetLines) / 100
          : 0;
        const percentageTokens = totalSnippetTokens > 0
          ? Math.round((10000 * totalDuplicatedTokens) / totalSnippetTokens) / 100
          : 0;

        const response: CheckResponse = {
          duplications: allClones,
          statistics: {
            snippetLines: totalSnippetLines,
            snippetTokens: totalSnippetTokens,
            duplicatedLines,
            duplicatedTokens: totalDuplicatedTokens,
            duplicationsFound: allClones.length,
            percentageDuplicated,
            percentageTokens,
          },
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to check code snippet',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  private async indexCodebase(): Promise<void> {
    if (this.codebaseIndexed && this.statistic && this.store) {
      return;
    }

    this.store = getStore(this.options.store);
    this.statistic = new Statistic();
    const tokenizer = new Tokenizer();

    const files: EntryWithContent[] = getFilesToDetect(this.options);
    const detector = new InFilesDetector(tokenizer, this.store, this.statistic, this.options);

    await detector.detect(files);
    this.codebaseIndexed = true;
  }

  public async start(port: number = 3000): Promise<void> {
    await this.indexCodebase();

    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`jscpd server is running on http://localhost:${port}`);
        console.log(`Working directory: ${this.workingDirectory}`);
        console.log(`\nEndpoints:`);
        console.log(`  GET  /health - Health check`);
        console.log(`  GET  /stats  - Get project statistics`);
        console.log(`  POST /check  - Check code snippet for duplications`);
        resolve();
      });
    });
  }

  public async close(): Promise<void> {
    if (this.store) {
      await this.store.close();
    }
  }

  public getApp(): Express {
    return this.app;
  }
}

