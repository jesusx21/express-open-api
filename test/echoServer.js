const express = require('express');

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

  app.get('/api/echo/:username', middleware, (req, res) => {
    res.send({ message: req.params.username });
  });

  app.get('/api/foo', middleware, (req, res) => {
    res.send({ foo: 'bar' });
  });

  return app;
}

module.exports = createEchoServer;
