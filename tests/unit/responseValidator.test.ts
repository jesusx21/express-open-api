import Sinon, { SinonSandbox, SinonStub } from 'sinon';

import ResponseValidator from 'responseValidator';
import SpecLoader from 'specLoader';
import {
  ErrorSchema,
  HTTPMethods,
  InvalidResponseHandler,
  Json,
  OnError,
  Request,
  Response,
  Validator,
  ValidatorOptions
} from 'types';
import {
  InvalidAPISpecFormat,
  ResponseNotDefinedInOpenAPISpec,
  RouteNotDefinedInOpenAPISpec,
  ValidationError
} from 'errors';

describe('ResponseValidator', () => {
  let req: Request;
  let res: Response;
  let body: Json;

  let options: ValidatorOptions;
  let responseValidator: ResponseValidator;
  let specLoader: SpecLoader;
  let validator: Validator;

  let sandbox: SinonSandbox;
  let specLoaderStub: SinonStub;

  let errorArgs: { error: ErrorSchema, endpoint?: string };

  const onError = (error: ErrorSchema, endpoint?: string) => {
    errorArgs = { endpoint, error };
  };

  beforeEach(() => {
    specLoader = new SpecLoader('tests/unit/fixtures/spec.yml');
    options = {
      onMissingResponse: Sinon.stub(),
      onResponseValidationError: Sinon.stub()
    };
    responseValidator = new ResponseValidator(specLoader, options);

    sandbox = Sinon.createSandbox();

    validator = {
      validate: Sinon.stub() as unknown as (params: Json) => void,
      responses: {
        default: { validate: Sinon.stub() } as unknown as Validator,
        200: { validate: Sinon.stub() } as unknown as Validator
      }
    } as Validator;

    specLoaderStub = sandbox.stub(specLoader, 'findValidatorForEndpoint');

    body = {};
    req = {
      originalUrl: 'http://localhost:3000/api/v1',
      method: HTTPMethods.GET,
      route: { path: '/pets' }
    } as Request;
    res = {
      send: Sinon.stub().returnsThis(),
      status: Sinon.stub().returnsThis(),
      statusCode: 200
    } as unknown as Response;
  });

  afterEach(() => {
    sandbox.reset();
  });

  describe('Resolve Endpoint', () => {
    it('should build the complete endpoint', async () => {
      const error = new ResponseNotDefinedInOpenAPISpec(
        HTTPMethods.GET,
        'http://localhost:3000/api/v1/pets',
        200
      );

      specLoaderStub.rejects(error);

      await responseValidator.middleware(body, req, res);

      expect(options.onMissingResponse).to.have.been.calledOnceWith(
        error,
        HTTPMethods.GET,
        'http://localhost:3000/api/v1/pets',
        200
      );
    });
  });

  describe('Resolve Validator From Schema', () => {
    it('should returns validator from schema provided', async () => {
      specLoaderStub.resolves(validator);

      await responseValidator.middleware(body, req, res);

      expect(validator.responses['200'].validate).to.have.been.calledOnce;
      expect(validator.responses.default.validate).to.not.have.been.calledOnce;
    });

    it('should returns validator default', async () => {
      validator = {
        ...validator,
        responses: {
          default: { validate: Sinon.stub() } as unknown as Validator
        }
      };

      specLoaderStub.resolves(validator);

      await responseValidator.middleware(body, req, res);

      expect(validator.responses.default.validate).to.have.been.calledOnce;
    });

    it('should throw response error when route is not defined in API spec', async () => {
      const error = new RouteNotDefinedInOpenAPISpec(
        HTTPMethods.GET,
        'http://localhost:3000/api/v1/pets'
      );

      options.onMissingResponse = (
        errorThrown: ErrorSchema,
        _method: HTTPMethods,
        endpoint,
        _statusCode
      ): void => onError(errorThrown, endpoint);

      specLoaderStub.rejects(error);

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(errorArgs.error).to.be.instanceOf(ResponseNotDefinedInOpenAPISpec);
      expect(errorArgs.endpoint).to.be.equal('http://localhost:3000/api/v1/pets');
    });

    it('should throw error when getting response fails', async () => {
      const error = new Error();

      options.invalidResponseHandler = ((
        errorThrown: ErrorSchema,
        _body: Json,
        _req: Request,
        _res: Response
      ): void => onError(errorThrown)) as InvalidResponseHandler;

      specLoaderStub.rejects(error);

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(errorArgs.error).to.be.instanceOf(Error);
    });

    it('should throw error when response nor default are defined', async () => {
      validator = {
        ...validator,
        responses: {} as { [key: string]: Validator, default: Validator }
      };

      specLoaderStub.resolves(validator);

      options.onMissingResponse = ((
        errorThrown: ErrorSchema,
        _method: HTTPMethods,
        _endpoint: string,
        _statusCode: number
      ): void => onError(errorThrown)) as OnError;

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(errorArgs.error).to.be.instanceOf(ResponseNotDefinedInOpenAPISpec);
    });
  });

  describe('Validate Response', () => {
    it('should returns body when response is valid', async () => {
      (validator.responses['200'].validate as SinonStub).resolves({ data: {} });

      specLoaderStub.resolves(validator);

      const result = await responseValidator.middleware(body, req, res);

      expect(result).to.be.deep.equal(body);
      expect(res.send).to.not.have.called;
    });

    it('should send error when response is not valid', async () => {
      const responseErrors = [{ message: 'The response does not match schema' }];

      validator = {
        ...validator,
        responses: {
          ...validator.responses,
          200: {
            ...validator.responses[200],
            errors: responseErrors
          }
        }
      };

      options.onResponseValidationError = (
        error: ErrorSchema,
        _method: HTTPMethods,
        _endpoint: string,
        _originalStatus: number,
        _body?: Json
      ): void => onError(error);

      specLoaderStub.resolves(validator);

      responseValidator = new ResponseValidator(specLoader, options);
      const result = await responseValidator.middleware(body, req, res);

      expect(result).to.be.undefined;
      expect(res.send).to.have.been.calledWith();
      expect(errorArgs.error).to.be.instanceOf(ValidationError);
    });
  });

  describe('Handle Error', () => {
    beforeEach(() => {
      const responseErrors = [{ message: 'The response does not match schema' }];

      validator = {
        ...validator,
        responses: {
          ...validator.responses,
          200: {
            ...validator.responses[200],
            errors: responseErrors
          }
        }
      };

      options.invalidResponseHandler = ((
        error: ErrorSchema,
        _body: Json,
        _req: Request,
        _res: Response
      ): void => onError(error)) as InvalidResponseHandler;

      specLoaderStub.resolves(validator);

      responseValidator = new ResponseValidator(specLoader, options);
    });

    it('should executes error handler when it is sent', async () => {
      await responseValidator.middleware(body, req, res);

      expect(errorArgs.error).to.be.instanceOf(ValidationError);
    });

    it('shoud use a default handler when handler fails', async () => {
      const error = new ValidationError([{ message: 'invalid data' }]);

      sandbox.stub(options, 'invalidResponseHandler')
        .throws(error);

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(501);
      expect(res.send).to.have.been.calledOnceWith({
        code: 'BAD_RESPONSE',
        errors: [{ message: 'invalid data' }]
      });
    });

    it('shoud use a default handler when handler is not set', async () => {
      options.invalidResponseHandler = undefined;

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(501);
      expect(res.send).to.have.been.calledOnceWith({
        code: 'BAD_RESPONSE',
        errors: [{ message: 'The response does not match schema' }]
      });
    });

    it('should executs on response validation function', async () => {
      options.onResponseValidationError = (
        error: ErrorSchema,
        _method: HTTPMethods,
        endpoint: string,
        _statusCode: number,
        _body?: Json
      ): void => {
        errorArgs = { error, endpoint };
      };

      responseValidator = new ResponseValidator(specLoader, options);
      await responseValidator.middleware(body, req, res);

      expect(errorArgs.error).to.be.instanceOf(ValidationError);
      expect(errorArgs.endpoint).to.be.equal('http://localhost:3000/api/v1/pets');
    });
  });

  describe('Default Error Handler', () => {
    beforeEach(() => {
      options.invalidResponseHandler = undefined;
    });

    it('should send bad response with status 501 when error sent is a Validation Error', async () => {
      const error = new ValidationError([{ message: 'invalid data' }]);

      specLoaderStub.rejects(error);
      responseValidator = new ResponseValidator(specLoader, options);

      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(501);
      expect(res.send).to.have.been.calledOnceWith({
        code: 'BAD_RESPONSE',
        errors: [{ message: 'invalid data' }]
      });
    });

    it('should send invalid api spec format with status 500 when error sent is a Invalid API Spec Format Error', async () => {
      const error = new InvalidAPISpecFormat('/file.yml', { message: 'Wheres the API' });

      specLoaderStub.rejects(error);
      responseValidator = new ResponseValidator(specLoader, options);

      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(500);
      expect(res.send).to.have.been.calledOnceWith({
        code: 'INVALID_API_SPEC_FORMAT',
        file: '/file.yml',
        error: { message: 'Wheres the API' }
      });
    });

    it('should send response not defined in open api spec with status 501 when response is not defined', async () => {
      const error = new ResponseNotDefinedInOpenAPISpec(
        HTTPMethods.GET,
        'http://localhost:3000/api/v1/pets',
        200
      );

      specLoaderStub.rejects(error);
      responseValidator = new ResponseValidator(specLoader, options);

      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(501);
      expect(res.send).to.have.been.calledOnceWith({
        code: 'RESPONSE_NOT_DEFINED_IN_API_SPEC',
        method: 'get',
        endpoint: 'http://localhost:3000/api/v1/pets',
        statusCode: 200
      });
    });

    it('should send internal server error with status 500 when error s unexpected', async () => {
      const error = new Error();

      specLoaderStub.rejects(error);
      responseValidator = new ResponseValidator(specLoader, options);

      await responseValidator.middleware(body, req, res);

      expect(res.status).to.have.been.calledOnceWith(500);
      expect(res.send).to.have.been.calledOnceWith({ error, code: 'INTERNAL_SERVER_ERROR' });
    });
  });
});
