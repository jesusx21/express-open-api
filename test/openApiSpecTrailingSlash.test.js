const chai = require('chai');
const path = require('path');
const request = require('supertest');

const createGoodEchoServer = require('./servers/simple');
const createBadEchoServer = require('./servers/differentResponses');
const expressOpenAPI = require('../index');

const { expect } = chai;

describe('Response Validations With Trailing Slash', () => {
  const OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/echo-trailing-slash.yml');

  it('should be ok on valid responses with query', (done) => {
    const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
      validateResponses: true
    });
    const app = createGoodEchoServer(middleware);

    request(app)
      .get('/api/echo')
      .query({ message: 'hello world' })
      .expect(200, { message: 'hello world' }, done);
  });

  it('should return 501 on different response body', (done) => {
    const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
      validateResponses: true
    });
    const app = createBadEchoServer(middleware);

    request(app)
      .get('/api/echo')
      .query({ message: 'hello world' })
      .expect(501)
      .end((error, res) => {
        if (error) return done(error);

        expect(res.body).to.be.deep.equal({
          code: 'BAD_RESPONSE',
          errors: [{
            keyword: 'required',
            dataPath: '.body',
            schemaPath: '#/body/required',
            message: "should have required property 'message'",
            params: {
              missingProperty: 'message'
            }
          }]
        });

        return done();
      });
  });
});

describe('Request Validations With Trailing Slash', () => {
  const OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/echo-trailing-slash.yml');

  it('should be ok on valid requests with query', (done) => {
    const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
      validateResponses: false
    });
    const app = createGoodEchoServer(middleware);

    request(app)
      .get('/api/echo')
      .query({ message: 'hello world' })
      .expect(200, { message: 'hello world' }, done);
  });

  it('should be ok on valid requests with params', (done) => {
    const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
      validateResponses: false
    });
    const app = createGoodEchoServer(middleware);

    request(app)
      .get('/api/echo/john.doe')
      .expect(200, { message: 'john.doe' }, done);
  });

  it('should return 400 if required query parameter is missing', (done) => {
    const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
      validateResponses: false
    });
    const app = createGoodEchoServer(middleware);

    request(app)
      .get('/api/echo')
      .expect(400)
      .end((error, res) => {
        if (error) return done(error);

        expect(res.body).to.be.deep.equal({
          code: 'BAD_REQUEST',
          errors: [{
            keyword: 'required',
            dataPath: '.query',
            schemaPath: '#/properties/query/required',
            message: "should have required property 'message'",
            params: {
              missingProperty: 'message'
            }
          }]
        });

        return done();
      });
  });
});
