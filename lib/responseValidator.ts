import autoBind from 'autobind-decorator';
import { isDate, isPlainObject, mapValues } from 'lodash';

import SpecLoader from 'specLoader';
import {
  ErrorSchema,
  HTTPErrorCodes,
  HTTPMethods,
  InvalidResponseHandler,
  Json,
  OnError,
  OnResponseValidationError,
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
} from './errors';

@autoBind
export default class ResponseValidator {
  private invalidResponseHandler: InvalidResponseHandler;
  private isAllowedNotDefinedResponses: boolean;
  private onError: OnResponseValidationError;
  private onMissingResponse: OnError;

  constructor(
    private specLoader: SpecLoader,
    options: ValidatorOptions
  ) {
    this.invalidResponseHandler = options.invalidResponseHandler;
    this.isAllowedNotDefinedResponses = options.allowNotDefinedResponses;
    this.onError = options.onResponseValidationError;
    this.onMissingResponse = options.onMissingResponse;
  }

  async middleware(body: Json, req: Request, res: Response): Promise<Json | void> {
    const endpoint = this.resolveEndpoint(req);
    const method = req.method as HTTPMethods;

    let validator: Validator;

    try {
      validator = await this.resolveValidatorFromSchema(method, endpoint, res.statusCode);
    } catch (error) {
      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.onMissingResponse) {
        try {
          this.onMissingResponse(error, method, endpoint, res.statusCode);
        } catch (errorOnHandler) {
          return this.errorHandler(errorOnHandler, body, req, res);
        }
      }

      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.isAllowedNotDefinedResponses) {
        return body;
      }

      return this.errorHandler(error, body, req, res);
    }

    try {
      this.validateResponse(validator, body);
    } catch (error) {
      return this.errorHandler(error, body, req, res);
    }

    return body;
  }

  private defaultErrorHandler(error: ErrorSchema, _body: Json, _req: Request, res: Response) {
    if (error instanceof ValidationError) {
      res.status(501).send({
        code: HTTPErrorCodes.BAD_RESPONSE,
        errors: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        code: HTTPErrorCodes.INVALID_API_SPEC_FORMAT,
        file: error.getFilePath(),
        error: error.getError()
      });
    } else if (error instanceof ResponseNotDefinedInOpenAPISpec) {
      res.status(501).send({
        code: HTTPErrorCodes.RESPONSE_NOT_DEFINED_IN_API_SPEC,
        method: error.getMethod(),
        endpoint: error.getEndpoint(),
        statusCode: error.getStatusCode()
      });
    } else {
      res.status(500).send({
        error,
        code: HTTPErrorCodes.INTERNAL_SERVER_ERROR
      });
    }
  }

  private errorHandler(error: ErrorSchema, body: Json, req: Request, res: Response) {
    // status code may be changed by the error handlers below
    const originalStatusCode = res.statusCode;

    if (this.invalidResponseHandler) {
      try {
        this.invalidResponseHandler(error, body, req, res);
      } catch (error) {
        this.defaultErrorHandler(error, body, req, res);
      }
    } else {
      this.defaultErrorHandler(error, body, req, res);
    }

    if (this.onError) {
      const endpoint = this.resolveEndpoint(req);

      try {
        this.onError(error, req.method, endpoint, originalStatusCode, body);
      } catch (error) {
        // ignore all errors on notification handlers
      }
    }
  }

  private resolveEndpoint(req: Request) {
    return req.originalBaseUrl + req.route.path;
  }

  private async resolveValidatorFromSchema(
    method: HTTPMethods,
    endpoint: string,
    statusCode: number
  ) {
    try {
      const validator = await this.specLoader.findValidatorForEndpoint(method, endpoint);

      const httpStatusCode = statusCode.toString();

      if (validator.responses[httpStatusCode]) {
        return validator.responses[httpStatusCode]
      } else if (validator.responses.default) {
        return validator.responses.default
      }
    } catch (error) {
      if (error instanceof RouteNotDefinedInOpenAPISpec) {
        throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
      }

      throw error;
    }

    throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
  }

  private serializeDates(body: Json): String | Json | Json[] {
    if (Array.isArray(body)) {
      return body.map(this.serializeDates);
    } else if (isPlainObject(body)) {
      return mapValues(body, this.serializeDates);
    } else if (isDate(body)) {
      return body.toJSON();
    } else {
      return body;
    }
  }

  private validateResponse(validator: Validator, body: Json) {
    validator.validate({ body: this.serializeDates(body), headers: {}});

    if (validator.errors) {
      throw new ValidationError(validator.errors);
    }
  }
}
