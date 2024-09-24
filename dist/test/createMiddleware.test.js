"use strict";
/* eslint consistent-return: "off" */
const chai = require('chai');
const path = require('path');
const request = require('supertest');
const createEchoServer = require('./servers/simple');
const expressOpenAPI = require('../index');
const { expect } = chai;
describe('Create middleware', () => {
    const OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/multiple-files.yml');
    const INVALID_OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/invalid-multiple-files.yml');
    it('should be ok on valid requests', (done) => {
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH);
        const app = createEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(200, { message: 'hello world' }, done);
    });
    it('should throw if OpenAPI spec file does not exists', () => {
        expect(() => {
            expressOpenAPI('./samples/does-not-exists.yml');
        }).to.throw();
    });
    it('should return 500 error if api spec is broken for request validation', (done) => {
        const middleware = expressOpenAPI(INVALID_OPEN_API_SPEC_PATH);
        const app = createEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(500)
            .end((error, res) => {
            if (error)
                return done(error);
            expect(res.body.code).to.be.equal('INVALID_API_SPEC_FORMAT');
            expect(res.body.error).to.not.be.undefined;
            done();
        });
    });
    it('should return 500 error if api spec is broken for response validation', (done) => {
        const middleware = expressOpenAPI(INVALID_OPEN_API_SPEC_PATH, {
            invalidRequestHandler: (error, req, res, next) => next()
        });
        const app = createEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(500)
            .end((error, res) => {
            if (error)
                return done(error);
            expect(res.body.code).to.be.equal('INVALID_API_SPEC_FORMAT');
            expect(res.body.error).to.not.be.undefined;
            done();
        });
    });
});
//# sourceMappingURL=createMiddleware.test.js.map