import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from './types';

export function validateCheckRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { code, language, filename } = req.body;

  if (!code) {
    const error: ErrorResponse = {
      error: 'ValidationError',
      message: 'Missing required field: code',
      statusCode: 400,
    };
    res.status(400).json(error);
    return;
  }

  if (typeof code !== 'string') {
    const error: ErrorResponse = {
      error: 'ValidationError',
      message: 'Field "code" must be a string',
      statusCode: 400,
    };
    res.status(400).json(error);
    return;
  }

  if (code.trim().length === 0) {
    const error: ErrorResponse = {
      error: 'ValidationError',
      message: 'Field "code" cannot be empty',
      statusCode: 400,
    };
    res.status(400).json(error);
    return;
  }

  if (language !== undefined && typeof language !== 'string') {
    const error: ErrorResponse = {
      error: 'ValidationError',
      message: 'Field "language" must be a string',
      statusCode: 400,
    };
    res.status(400).json(error);
    return;
  }

  if (filename !== undefined && typeof filename !== 'string') {
    const error: ErrorResponse = {
      error: 'ValidationError',
      message: 'Field "filename" must be a string',
      statusCode: 400,
    };
    res.status(400).json(error);
    return;
  }

  next();
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  const error: ErrorResponse = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    statusCode: 500,
  };

  res.status(error.statusCode).json(error);
}

export function notFoundHandler(req: Request, res: Response): void {
  const error: ErrorResponse = {
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  };
  res.status(404).json(error);
}

