const express = require('express');

function createEchoServer(middleware) {
  const app = express();

  app.use(express.json());

  app.get('/', middleware, (req, res) => {
    res.send({ version: 'v1' });
  });

  app.get('/api/echo', middleware, (req, res) => {
    res.send({ result: req.query.message });
  });

  app.post('/api/echo', middleware, (req, res) => {
    res.send({ result: req.body.message });
  });

  app.get('/api/echo/:username', middleware, (req, res) => {
    if (req.params.username === 'forbidden') {
      res.status(401).send({ notice: 'You are forbidden' });
    } else {
      res.send({ result: req.params.username });
    }
  });

  app.get('/api/foo', middleware, (req, res) => {
    res.send({ foo: 'bar' });
  });

  return app;
}

module.exports = createEchoServer;
