import { Request, Response, Router } from 'express';
import { JscpdServerService } from './service';
import { validateCheckRequest } from './middleware';
import { CheckSnippetRequest, ErrorResponse } from './types';

export function createRouter(service: JscpdServerService): Router {
  const router = Router();

  router.post('/check', validateCheckRequest, async (req: Request, res: Response) => {
    try {
      const request: CheckSnippetRequest = req.body;
      const result = await service.checkSnippet(request);
      res.json(result);
    } catch (err) {
      const error = err as Error;
      const response: ErrorResponse = {
        error: error.name || 'CheckError',
        message: error.message,
        statusCode: 400,
      };
      res.status(response.statusCode).json(response);
    }
  });

  router.get('/stats', (req: Request, res: Response) => {
    try {
      const stats = service.getStatistics();
      
      if (!stats.statistics) {
        const error: ErrorResponse = {
          error: 'NotReady',
          message: 'Statistics not available yet. Server is still initializing.',
          statusCode: 503,
        };
        res.status(503).json(error);
        return;
      }
      
      res.json(stats);
    } catch (err) {
      const error = err as Error;
      const response: ErrorResponse = {
        error: error.name || 'StatsError',
        message: error.message,
        statusCode: 500,
      };
      res.status(response.statusCode).json(response);
    }
  });

  router.get('/health', (req: Request, res: Response) => {
    const state = service.getState();
    res.json({
      status: state.isScanning ? 'initializing' : 'ready',
      workingDirectory: state.workingDirectory,
      lastScanTime: state.lastScanTime,
    });
  });

  return router;
}

