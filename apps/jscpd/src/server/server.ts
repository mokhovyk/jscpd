import express, { Express } from 'express';
import { JscpdServerService } from './service';
import { createRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { IOptions } from '@jscpd/core';

export interface ServerOptions {
  port?: number;
  host?: string;
  jscpdOptions?: Partial<IOptions>;
}

export class JscpdServer {
  private app: Express;
  private service: JscpdServerService;
  private server: ReturnType<Express['listen']> | null = null;

  constructor(
    workingDirectory: string,
    private options: ServerOptions = {}
  ) {
    this.service = new JscpdServerService(workingDirectory);
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      res.header('Content-Type', 'application/json');
      next();
    });
  }

  private setupRoutes(): void {
    const router = createRouter(this.service);
    this.app.use('/api', router);

    this.app.get('/', (req, res) => {
      res.json({
        name: 'jscpd-server',
        version: '1.0.0',
        endpoints: {
          'POST /api/check': 'Check code snippet for duplications',
          'GET /api/stats': 'Get overall project statistics',
          'GET /api/health': 'Server health check',
        },
        documentation: 'https://github.com/kucherenko/jscpd',
      });
    });
  }

  private setupErrorHandlers(): void {
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    const port = this.options.port || 3000;
    const host = this.options.host || '0.0.0.0';

    console.log('Initializing jscpd server...');
    console.log(`Working directory: ${this.service.getState().workingDirectory}`);
    console.log('Scanning codebase for duplications...');

    await this.service.initialize(this.options.jscpdOptions);

    console.log('Codebase scan complete!');
    console.log(`Starting server on ${host}:${port}...`);

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, host, () => {
          console.log(`✓ jscpd server is running at http://${host}:${port}`);
          console.log(`✓ API endpoints available at http://${host}:${port}/api`);
          console.log('\nAvailable endpoints:');
          console.log(`  POST http://${host}:${port}/api/check - Check code snippet for duplications`);
          console.log(`  GET  http://${host}:${port}/api/stats - Get overall project statistics`);
          console.log(`  GET  http://${host}:${port}/api/health - Server health check`);
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.service.close().then(resolve).catch(reject);
          }
        });
      });
    }
    await this.service.close();
  }

  getApp(): Express {
    return this.app;
  }

  getService(): JscpdServerService {
    return this.service;
  }
}

export async function startServer(
  workingDirectory: string,
  options: ServerOptions = {}
): Promise<JscpdServer> {
  const server = new JscpdServer(workingDirectory, options);
  await server.start();
  return server;
}
