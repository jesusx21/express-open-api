const express = require('express');

function dateWithDaysOffset(offset) {
  const date = new Date();

  date.setDate(date.getDate() + offset);

  return date;
}

function createEchoServer(middleware) {
  const app = express();

  app.use(express.json());

  app.get('/', middleware, (req, res) => {
    res.send({ version: 'v1' });
  });

  app.get('/api/echo', middleware, (req, res) => {
    res.send({ message: req.query.message });
  });

  app.post('/api/echo', middleware, (req, res) => {
    res.send({ message: req.body.message });
  });

  app.get('/api/time', middleware, (req, res) => {
    const now = new Date();
    const yesterday = dateWithDaysOffset(-1);
    const tomorrow = dateWithDaysOffset(1);

    res.send({
      time: now,
      metadata: {
        yesterday,
        tomorrow
      }
    });
  });

  app.get('/api/echo/:username', middleware, (req, res) => {
    res.send({ message: req.params.username });
  });

  app.get('/api/foo', middleware, (req, res) => {
    res.send({ foo: 'bar' });
  });

  return app;
}

module.exports = createEchoServer;
