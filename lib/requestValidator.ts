import autoBind from 'autobind-decorator';
import { isEmpty } from 'lodash';

import SpecLoader from 'specLoader';
import { ErrorCodes } from 'errors/codes';
import {
  InvalidAPISpecFormat,
  RouteNotDefinedInOpenAPISpec,
  ValidationError
} from 'errors';
import {
  ErrorSchema,
  InvalidRequestHandler,
  Json,
  Next,
  OnError,
  OnMissingPath,
  Request,
  Response,
  Validator,
  ValidatorOptions
} from 'types';

@autoBind
export default class RequestValidator {
  private isAllowedNotDefinedPaths: boolean;
  private errorHandler: InvalidRequestHandler;
  private onError: OnError;
  private onMissingPath: OnMissingPath;

  constructor(
    private specLoader: SpecLoader,
    options: ValidatorOptions
  ) {
    this.isAllowedNotDefinedPaths = options.allowNotDefinedPaths;
    this.errorHandler = options.invalidRequestHandler;
    this.onError = options.onRequestValidationError;
    this.onMissingPath = options.onMissingPath;
  }

  async middleware(req: Request, res: Response, next: Next): Promise<void> {
    const endpoint = this.resolveEndpoint(req);

    let validator: Validator;

    try {
      validator = await this.specLoader.findValidatorForEndpoint(req.method, endpoint);
    } catch (error) {
      if (error instanceof RouteNotDefinedInOpenAPISpec && this.onMissingPath) {
        try {
          this.onMissingPath(error, req.method, endpoint);
        } catch (errorOnHandler) {
          return this.handleError(errorOnHandler, req, res, next);
        }
      }

      if (error instanceof RouteNotDefinedInOpenAPISpec && this.isAllowedNotDefinedPaths) {
        return next();
      }

      return this.handleError(error, req, res, next);
    }

    if (this.hasQueryParameters(req) && !validator.parameters) {
      const error = new ValidationError('unexpected query parameters received');

      return this.handleError(error, req, res, next);
    }

    if (this.hasPayload(req) && !validator.body) {
      const error = new ValidationError('unexpected payload received');

      return this.handleError(error, req, res, next);
    }

    if (validator.parameters) {
      try {
        this.validateQueryParameters(validator, req);
      } catch (error) {
        return this.handleError(error, req, res, next);
      }
    }

    if (validator.body) {
      try {
        this.validateBody(validator, req);
      } catch (error) {
        return this.handleError(error, req, res, next);
      }
    }

    return next();
  }

  private handleError(error: ErrorSchema, req: Request, res: Response, next: Next): void {
    if (!this.errorHandler) {
      this.defaultErrorHandler(error, req, res);
    } else {
      try {
        this.errorHandler(error, req, res, next);
      } catch (errorOnHandler) {
        this.defaultErrorHandler(errorOnHandler, req, res);
      }
    }

    if (!this.onError) return;

    const endpoint = this.resolveEndpoint(req);

    try {
      this.onError(error, req.method, endpoint, this.serializeRequestData(req));
    } catch {
      // ignore all errors on notification handlers
    }
  }

  private defaultErrorHandler(error: ErrorSchema, req: Request, res: Response): void {
    if (error instanceof ValidationError) {
      res.status(400).send({
        code: ErrorCodes.BAD_REQUEST,
        errors: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        code: ErrorCodes.INVALID_API_SPEC_FORMAT,
        file: error.getFilePath(),
        error: error.getError()
      });
    } else if (error instanceof RouteNotDefinedInOpenAPISpec) {
      res.status(400).send({
        code: ErrorCodes.ENDPOINT_NOT_DEFINED_IN_API_SPEC,
        method: error.getMethod(),
        endpoint: error.getEndpoint()
      });
    } else {
      res.status(500).send({
        error,
        code: ErrorCodes.INTERNAL_SERVER_ERROR
      });
    }
  }

  private resolveEndpoint(req: Request): string {
    return req.baseUrl + req.route.path;
  }

  private serializeRequestData(req: Request): Json {
    const result: Json = {};

    if (this.hasPayload(req)) {
      result.body = req.body;
    }

    if (this.hasQueryParameters(req)) {
      result.query = req.query;
    }

    return result;
  }

  private hasPayload(req: Request): boolean {
    return !isEmpty(req.body);
  }

  private hasQueryParameters(req: Request): boolean {
    return !isEmpty(req.query);
  }

  private validateQueryParameters(validator: Validator, req: Request): void {
    validator.parameters.validate({ path: req.params, query: req.query });

    if (validator.parameters.errors) {
      throw new ValidationError(validator.parameters?.errors);
    }
  }

  private validateBody(validator: Validator, req: Request): void {
    validator.body.validate(req.body);

    if (validator.body.errors) {
      throw new ValidationError(validator.body.errors);
    }
  }
}
