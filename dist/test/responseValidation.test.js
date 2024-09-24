"use strict";
/* eslint consistent-return: "off" */
const chai = require('chai');
const path = require('path');
const request = require('supertest');
const sinon = require('sinon');
const createGoodEchoServer = require('./servers/simple');
const createBadEchoServer = require('./servers/differentResponses');
const expressOpenAPI = require('../index');
const { expect } = chai;
describe('Response Validations', () => {
    const OPEN_API_SPEC_PATH = path.join(__dirname, '/samples/echo.yml');
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
    it('should be ok on valid responses with date-time', (done) => {
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true
        });
        const app = createGoodEchoServer(middleware);
        const clock = sinon.useFakeTimers(Date.UTC(2021, 0, 1));
        request(app)
            .get('/api/time')
            .expect(200, {
            time: '2021-01-01T00:00:00.000Z',
            metadata: {
                yesterday: '2020-12-31T00:00:00.000Z',
                tomorrow: '2021-01-02T00:00:00.000Z'
            },
            dates: [
                '2020-12-31T00:00:00.000Z',
                '2021-01-01T00:00:00.000Z',
                '2021-01-02T00:00:00.000Z'
            ]
        }, (error) => {
            clock.restore();
            done(error);
        });
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
            if (error)
                return done(error);
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
            done();
        });
    });
    it('should be ok on different response body but response validation is disabled', (done) => {
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: false
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(200, { result: 'hello world' }, done);
    });
    it('should return 501 when response spec is not defined', (done) => {
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true,
            invalidRequestHandler: (error, req, res, next) => next()
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/foo')
            .expect(501)
            .end((error, res) => {
            if (error)
                return done(error);
            expect(res.body).to.be.deep.equal({
                code: 'RESPONSE_NOT_DEFINED_IN_API_SPEC',
                method: 'GET',
                endpoint: '/api/foo',
                statusCode: 200
            });
            done();
        });
    });
    it('should return 501 when route spec is not defined', (done) => {
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo/forbidden')
            .expect(501)
            .end((error, res) => {
            if (error)
                return done(error);
            expect(res.body).to.be.deep.equal({
                code: 'RESPONSE_NOT_DEFINED_IN_API_SPEC',
                method: 'GET',
                endpoint: '/api/echo/:username',
                statusCode: 401
            });
            done();
        });
    });
    it('should call response validator handler if response is not as expected', (done) => {
        const spy = sinon.spy((error, body, req, res) => res.status(res.statusCode).send(body));
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true,
            invalidResponseHandler: spy,
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(200)
            .end((error) => {
            if (error)
                return done(error);
            expect(spy.calledOnce).to.be.true;
            const call = spy.getCalls()[0];
            expect(call.args[0].constructor.name).to.be.equal('ValidationError');
            expect(call.args[1]).to.be.deep.equal({ result: 'hello world' });
            expect(call.args[2].constructor.name).to.be.equal('IncomingMessage');
            expect(call.args[3].constructor.name).to.be.equal('ServerResponse');
            done();
        });
    });
    it('should return 500 on response validator handler and unexpected error', (done) => {
        const spy = sinon.stub().throws();
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true,
            invalidResponseHandler: spy
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(500)
            .end((error, res) => {
            if (error)
                return done(error);
            expect(res.body.code).to.equal('INTERNAL_SERVER_ERROR');
            expect(res.body.error).to.not.be.undefined;
            done();
        });
    });
    it('should call on response error handler on invalid responses', (done) => {
        const spy = sinon.stub();
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true,
            onResponseValidationError: spy
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(501)
            .end((error) => {
            if (error)
                return done(error);
            expect(spy.calledOnce).to.be.true;
            const call = spy.getCalls()[0];
            expect(call.args[0].constructor.name).to.be.equal('ValidationError');
            expect(call.args[1]).to.be.equal('GET');
            expect(call.args[2]).to.be.equal('/api/echo');
            expect(call.args[3]).to.be.equal(200);
            expect(call.args[4]).to.be.deep.equal({ result: 'hello world' });
            done();
        });
    });
    it('should do nothing when call on response error handler and unexpected error', (done) => {
        const stub = sinon.stub().throws();
        const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
            validateResponses: true,
            onResponseValidationError: stub
        });
        const app = createBadEchoServer(middleware);
        request(app)
            .get('/api/echo')
            .query({ message: 'hello world' })
            .expect(501, done);
    });
    describe('Undefined OpenAPI Spec for Response', () => {
        it('should be ok if response spec is not defined and not defined respones are allowed', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: true
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo/forbidden')
                .expect(401, { notice: 'You are forbidden' }, done);
        });
        it('should return 501 if not allowed undefined paths and unexpcted response', (done) => {
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: false
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .expect(501, done);
        });
        it('should call request validator handler if not allowed undefined paths', (done) => {
            const spy = sinon.spy((error, body, req, res) => res.status(res.statusCode).send(body));
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: false,
                invalidResponseHandler: spy
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo')
                .query({ message: 'hello world' })
                .expect(200)
                .end((error) => {
                if (error)
                    return done(error);
                expect(spy.calledOnce).to.be.true;
                done();
            });
        });
        it('should call on missing response handler if allowed undefined responses', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: true,
                onMissingResponse: stub
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo/forbidden')
                .expect(401)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0]).to.be.equal('GET');
                expect(call.args[1]).to.be.equal('/api/echo/:username');
                expect(call.args[2]).to.be.equal(401);
                expect(call.args[3].constructor.name).to.be.equal('ResponseNotDefinedInOpenAPISpec');
                done();
            });
        });
        it('should call on missing response handler if not allowed undefined responses', (done) => {
            const stub = sinon.stub();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: false,
                onMissingResponse: stub
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo/forbidden')
                .expect(501)
                .end((error) => {
                if (error)
                    return done(error);
                expect(stub.calledOnce).to.be.true;
                const call = stub.getCalls()[0];
                expect(call.args[0]).to.be.equal('GET');
                expect(call.args[1]).to.be.equal('/api/echo/:username');
                expect(call.args[2]).to.be.equal(401);
                expect(call.args[3].constructor.name).to.be.equal('ResponseNotDefinedInOpenAPISpec');
                done();
            });
        });
        it('should return 500 when call on missing response handler and unexpected error', (done) => {
            const stub = sinon.stub().throws();
            const middleware = expressOpenAPI(OPEN_API_SPEC_PATH, {
                validateResponses: true,
                allowNotDefinedResponses: false,
                onMissingResponse: stub
            });
            const app = createBadEchoServer(middleware);
            request(app)
                .get('/api/echo/forbidden')
                .expect(500, done);
        });
    });
});
//# sourceMappingURL=responseValidation.test.js.map