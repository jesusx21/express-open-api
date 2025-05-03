import express, { Request, Response } from 'express';

import { Middleware } from '../../lib/types';
import { Middleware as MiddlewareType } from './types';

export default function createEchoServer(middlewares: Middleware[]) {
  const app = express();
  const middlewareFunctions = middlewares as unknown as MiddlewareType;

  app.use(express.json());

  app.get('/', middlewareFunctions, (_req: Request, res: Response) => {
    res.send({ version: 'v1' });
  });

  app.get('/api/echo', middlewareFunctions, (req: Request, res: Response) => {
    res.send({ result: req.query.message });
  });

  app.post('/api/echo', middlewareFunctions, (req: Request, res: Response) => {
    res.send({ result: req.body.message });
  });

  app.get('/api/echo/:username', middlewareFunctions, (req: Request, res: Response) => {
    if (req.params.username === 'forbidden') {
      res.status(401).send({ notice: 'You are forbidden' });
    } else {
      res.send({ result: req.params.username });
    }
  });

  app.get('/api/foo', middlewareFunctions, (_req: Request, res: Response) => {
    res.send({ foo: 'bar' });
  });

  return app;
}
