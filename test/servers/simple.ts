import express, { Request, Response } from 'express';

import { Middleware } from '../../lib/types';
import { Middleware as MiddlewareType } from './types';

function dateWithDaysOffset(offset: number): Date {
  const date = new Date();

  date.setDate(date.getDate() + offset);

  return date;
}

export default function createEchoServer(middlewares: Middleware[]) {
  const app = express();
  const middlewareFunctions = middlewares as unknown as MiddlewareType;

  app.use(express.json());

  app.get('/', middlewareFunctions, (_req: Request, res: Response) => {
    res.send({ version: 'v1' });
  });

  app.get('/api/echo', middlewareFunctions, (req: Request, res: Response) => {
    res.send({ message: req.query.message });
  });

  app.post('/api/echo', middlewareFunctions, (req: Request, res: Response) => {
    res.send({ message: req.body.message });
  });

  app.get('/api/time', middlewareFunctions, (_req: Request, res: Response) => {
    const now = new Date();
    const yesterday = dateWithDaysOffset(-1);
    const tomorrow = dateWithDaysOffset(1);

    res.send({
      time: now,
      metadata: {
        yesterday,
        tomorrow
      },
      dates: [
        yesterday, now, tomorrow
      ]
    });
  });

  app.get('/api/echo/:username', middlewareFunctions, (req: Request, res: Response) => {
    res.send({ message: req.params.username });
  });

  app.get('/api/foo', middlewareFunctions, (_req: Request, res: Response) => {
    res.send({ foo: 'bar' });
  });

  return app;
}
