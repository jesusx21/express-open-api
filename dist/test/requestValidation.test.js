"use strict";
/* eslint consistent-return: "off" */
const chai = require('chai');
const path = require('path');
const request = require('supertest');
const sinon = require('sinon');
const createEchoServer = require('./servers/simple');
const expressOpenAPI = require('../index');
const { expect } = chai;
describe('Request Validations', () => {
    const OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/echo.yml');
    describe('GET', () => {
        it('should be ok on valid requests with query', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .expect(200, { message: 'hello world' }, done);
        });
        it('should be ok on valid requests with params', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo/john.doe')
                .expect(200, { message: 'john.doe' }, done);
        });
        it('should return 400 if required query parameter is missing', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .expect(400)
                .end((error, res) => {
                if (error)
                    return done(error);
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
                done();
            });
        });
        it('should return 400 if unexpected body is sent', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .send({ colors: true })
                .expect(400)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body).to.be.deep.equal({
                    code: 'BAD_REQUEST',
                    errors: [{
                            message: 'unexpected payload received',
                        }]
                });
                done();
            });
        });
        it('should call request validator handler if required query parameter is missing', (done) => {
            const spy = sinon.spy((error, req, res, next) => next());
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                const call = spy.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1].constructor.name).to.be.equal('IncomingMessage');
                expect(call.args[2].constructor.name).to.be.equal('ServerResponse');
                done();
            });
        });
        it('should call request validator handler if unexpected body is sent', (done) => {
            const spy = sinon.spy((error, req, res, next) => next());
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .send({ colors: true })
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                const call = spy.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1].constructor.name).to.be.equal('IncomingMessage');
                expect(call.args[2].constructor.name).to.be.equal('ServerResponse');
                done();
            });
        });
        it('should return 500 on request validator handler and unexpected error', (done) => {
            const spy = sinon.stub().throws();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .send({ colors: true })
                .expect(500)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body.code).to.equal('INTERNAL_SERVER_ERROR');
                expect(res.body.error).to.not.be.undefined;
                done();
            });
        });
        it('should call on request error handler if required query parameter is missing', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                onRequestValidationError: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .expect(400)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1]).to.be.equal('GET');
                expect(call.args[2]).to.be.equal('/api/echo');
                expect(call.args[3]).to.be.deep.equal({});
                done();
            });
        });
        it('should call on request error handler if unexpected body is sent', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                onRequestValidationError: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .send({ colors: true })
                .expect(400)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1]).to.be.equal('GET');
                expect(call.args[2]).to.be.equal('/api/echo');
                expect(call.args[3]).to.be.deep.equal({
                    query: {
                        message: 'hello world'
                    },
                    body: {
                        colors: true
                    }
                });
                done();
            });
        });
        it('should do nothing when call on request error handler and unexpected error', (done) => {
            const stub = sinon.stub().throws();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                onRequestValidationError: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .send({ colors: true })
                .expect(400, done);
        });
    });
    describe('POST', () => {
        it('should be ok on valid requests', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .send({ message: 'hello world' })
                .expect(200, { message: 'hello world' }, done);
        });
        it('should return 400 if required body is missing', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .expect(400)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body).to.be.deep.equal({
                    code: 'BAD_REQUEST',
                    errors: [{
                            keyword: 'required',
                            dataPath: '',
                            schemaPath: '#/required',
                            message: "should have required property 'message'",
                            params: {
                                missingProperty: 'message'
                            }
                        }]
                });
                done();
            });
        });
        it('should return 400 if unexpected query parameters are sent', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .send({ message: 'hello world' })
                .query({ colors: true })
                .expect(400)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body).to.be.deep.equal({
                    code: 'BAD_REQUEST',
                    errors: [{
                            message: 'unexpected query parameters received'
                        }]
                });
                done();
            });
        });
        it('should call request validator handler if required body is missing', (done) => {
            const spy = sinon.spy((error, req, res, next) => next());
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                const call = spy.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1].constructor.name).to.be.equal('IncomingMessage');
                expect(call.args[2].constructor.name).to.be.equal('ServerResponse');
                done();
            });
        });
        it('should call request validator handler if unexpected query parameters are sent', (done) => {
            const spy = sinon.spy((error, req, res, next) => next());
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .send({ message: 'hello world' })
                .query({ colors: true })
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                const call = spy.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1].constructor.name).to.be.equal('IncomingMessage');
                expect(call.args[2].constructor.name).to.be.equal('ServerResponse');
                done();
            });
        });
        it('should return 500 on request validator handler and unexpected error', (done) => {
            const spy = sinon.stub().throws();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .send({ message: 'hello world' })
                .query({ colors: true })
                .expect(500)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body.code).to.equal('INTERNAL_SERVER_ERROR');
                expect(res.body.error).to.not.be.undefined;
                done();
            });
        });
        it('should call on request error handler if required body is missing', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                onRequestValidationError: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .expect(400)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1]).to.be.equal('POST');
                expect(call.args[2]).to.be.equal('/api/echo');
                done();
            });
        });
        it('should call on request error handler if unexpected query parameters are sent', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                onRequestValidationError: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .post('/api/echo')
                .send({ message: 'hello world' })
                .query({ colors: true })
                .expect(400)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0].constructor.name).to.be.equal('ValidationError');
                expect(call.args[1]).to.be.equal('POST');
                expect(call.args[2]).to.be.equal('/api/echo');
                done();
            });
        });
    });
    describe('Undefined OpenAPI Spec for Route', () => {
        it('should be ok if allowed not defined paths', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: true
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(200, { foo: 'bar' }, done);
        });
        it('should return 400 if not allowed undefined paths', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: false
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(400, done);
        });
        it('should call request validator handler if not allowed undefined paths', (done) => {
            const spy = sinon.spy((error, req, res, next) => next());
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: false,
                invalidRequestHandler: spy
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                done();
            });
        });
        it('should call on missing path handler if allowed undefined paths', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: true,
                onMissingPath: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0]).to.be.equal('GET');
                expect(call.args[1]).to.be.equal('/api/foo');
                expect(call.args[2].constructor.name).to.be.equal('RouteNotDefinedInOpenAPISpec');
                done();
            });
        });
        it('should call on missing path handler if not allowed undefined paths', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: false,
                onMissingPath: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(400)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0]).to.be.equal('GET');
                expect(call.args[1]).to.be.equal('/api/foo');
                done();
            });
        });
        it('should return 500 when call on missing path handler and unexpected error', (done) => {
            const stub = sinon.stub().throws();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: false,
                allowNotDefinedPaths: false,
                onMissingPath: stub
            });
            const app = createEchoServer(middleware);
            request(app)
                .get('/api/foo')
                .expect(500)
                .end((error, res) => {
                if (error)
                    return done(error);
                expect(res.body.code).to.equal('INTERNAL_SERVER_ERROR');
                expect(res.body.error).to.not.be.undefined;
                done();
            });
        });
    });
});
//# sourceMappingURL=requestValidation.test.js.map