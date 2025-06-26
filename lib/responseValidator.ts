import { isPlainObject, mapValues } from 'lodash';

import SpecLoader from 'specLoader';
import {
  ErrorCodes,
  InvalidAPISpecFormat,
  ResponseNotDefinedInOpenAPISpec,
  RouteNotDefinedInOpenAPISpec,
  ValidationError
} from 'errors';
import {
  ErrorSchema,
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

export default class ResponseValidator {
  private invalidResponseHandler: InvalidResponseHandler;
  private isAllowedNotDefinedResponses: boolean;
  private onMissingResponse: OnError;
  private onResponseValidationError: OnResponseValidationError;

  constructor(
    private specLoader: SpecLoader,
    options: ValidatorOptions
  ) {
    this.invalidResponseHandler = options.invalidResponseHandler;
    this.isAllowedNotDefinedResponses = options.allowNotDefinedResponses;
    this.onMissingResponse = options.onMissingResponse;
    this.onResponseValidationError = options.onResponseValidationError;
  }

  async middleware(body: Json, req: Request, res: Response) {
    const endpoint = this.resolveEndpoint(req);

    let validator: Validator;

    try {
      validator = await this.resolveValidatorFromSchema(
        req.method,
        endpoint,
        res.statusCode
      );
    } catch (error) {
      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.onMissingResponse) {
        try {
          this.onMissingResponse(error, req.method, endpoint, res.statusCode);
        } catch (errorOnHandler) {
          return this.handleError(errorOnHandler, body, req, res);
        }
      }

      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.isAllowedNotDefinedResponses) {
        return body;
      }

      return this.handleError(error, body, req, res);
    }

    try {
      this.validateResponse(validator, body);
    } catch (error) {
      return this.handleError(error, body, req, res);
    }

    return body;
  }

  protected async resolveValidatorFromSchema(
    method: HTTPMethods,
    endpoint: string,
    statusCode: number
  ) {
    try {
      const validator = await this.specLoader.findValidatorForEndpoint(method, endpoint);

      if (validator.responses[statusCode.toString()]) {
        return validator.responses[statusCode.toString()];
      }
      if (validator.responses.default) {
        return validator.responses.default;
      }
    } catch (error) {
      if (error instanceof RouteNotDefinedInOpenAPISpec) {
        throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
      }

      throw error;
    }

    throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
  }

  private resolveEndpoint(req: Request): string {
    return req.originalUrl + req.route.path;
  }

  private validateResponse(validator: Validator, body: Json): void {
    validator.validate({ body: this.serializeDates(body), headers: {} });

    if (validator.errors) {
      throw new ValidationError(validator.errors);
    }
  }

  private serializeDates(body: Json): string | Json | (Json[]) {
    if (Array.isArray(body)) {
      return body.map(this.serializeDates) as Json[];
    }
    if (isPlainObject(body)) {
      return mapValues(body, this.serializeDates);
    }
    if (body instanceof Date) {
      return body.toISOString();
    }

    return body;
  }

  private handleError(error: ErrorSchema, body: Json, req: Request, res: Response): void {
    const originalStatusCode = res.statusCode;

    if (this.invalidResponseHandler) {
      try {
        this.invalidResponseHandler(error, body, req, res);
      } catch (thrownErrror) {
        this.defaultErrorHandler(thrownErrror, body, req, res);
      }
    } else {
      this.defaultErrorHandler(error, body, req, res);
    }

    if (this.onResponseValidationError) {
      const endpoint = this.resolveEndpoint(req);

      try {
        this.onResponseValidationError(
          error,
          req.method as HTTPMethods,
          endpoint,
          originalStatusCode,
          body
        );
      } catch {
        // ignore all errors on notification handlers
      }
    }
  }

  private defaultErrorHandler(error: ErrorSchema, _body: Json, _req: Request, res: Response): void {
    if (error instanceof ValidationError) {
      res.status(501).send({
        code: ErrorCodes.BAD_RESPONSE,
        errors: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        code: ErrorCodes.INVALID_API_SPEC_FORMAT,
        file: error.getFilePath(),
        error: error.getError()
      });
    } else if (error instanceof ResponseNotDefinedInOpenAPISpec) {
      res.status(501).send({
        code: ErrorCodes.RESPONSE_NOT_DEFINED_IN_API_SPEC,
        method: error.getMethod(),
        endpoint: error.getEndpoint(),
        statusCode: error.getStatusCode()
      });
    } else {
      res.status(500).send({
        error,
        code: ErrorCodes.INTERNAL_SERVER_ERROR
      });
    }
  }
}
