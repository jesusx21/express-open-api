const autoBind = require('auto-bind');

const {
  ValidationError,
  ResponseNotDefinedInOpenAPISpec,
  RouteNotDefinedInOpenAPISpec,
  InvalidAPISpecFormat
} = require('../errors');

class ResponseValidator {
  constructor(specLoader, options) {
    this.specLoader = specLoader;
    this.isAllowedNotDefinedResponses = options.allowNotDefinedResponses;
    this.errorHandler = options.invalidResponseHandler;
    this.onError = options.onResponseValidationError;
    this.onMissingResponse = options.onMissingResponse;

    autoBind(this);
  }

  async middleware(body, req, res) {
    const endpoint = this._resolveEndpoint(req);

    let validator;

    try {
      validator = await this._resolveValidatorFromSchema(req.method, endpoint, res.statusCode);
    } catch (error) {
      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.onMissingResponse) {
        try {
          this.onMissingResponse(req.method, endpoint, res.statusCode, error);
        } catch (errorOnHandler) {
          return this._errorHandler(errorOnHandler, body, req, res);
        }
      }

      if (error instanceof ResponseNotDefinedInOpenAPISpec && this.isAllowedNotDefinedResponses) {
        return body;
      }

      return this._errorHandler(error, body, req, res);
    }

    try {
      this._validateResponse(validator, body);
    } catch (error) {
      return this._errorHandler(error, body, req, res);
    }

    return body;
  }

  _resolveEndpoint(req) {
    return req.baseUrl + req.route.path;
  }

  async _resolveValidatorFromSchema(method, endpoint, statusCode) {
    try {
      const validator = await this.specLoader.findValidatorForEndpoint(method, endpoint);

      if (validator.responses[statusCode.toString()]) {
        return validator.responses[statusCode.toString()];
      } else if (validator.responses.default) {
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

  _validateResponse(validator, body) {
    validator.validate({ body, headers: {} });

    if (validator.errors) {
      throw new ValidationError(validator.errors);
    }
  }

  _errorHandler(error, body, req, res) {
    // status code may be changed by the error handlers below
    const originalStatusCode = res.statusCode;

    if (this.errorHandler) {
      try {
        this.errorHandler(error, body, req, res);
      } catch (error) {
        this._defaultErrorHandler(error, body, req, res);
      }
    } else {
      this._defaultErrorHandler(error, body, req, res);
    }

    if (this.onError) {
      const endpoint = this._resolveEndpoint(req);

      try {
        this.onError(error, req.method, endpoint, originalStatusCode);
      } catch (error) {
        // ignore all errors on notification handlers
      }
    }
  }

  _defaultErrorHandler(error, body, req, res) {
    if (error instanceof ValidationError) {
      res.status(501).send({
        code: 'BAD_RESPONSE',
        errors: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        code: 'INVALID_API_SPEC_FORMAT',
        file: error.getFilePath(),
        error: error.getError()
      });
    } else if (error instanceof ResponseNotDefinedInOpenAPISpec) {
      res.status(501).send({
        code: 'RESPONSE_NOT_DEFINED_IN_API_SPEC',
        method: error.getMethod(),
        endpoint: error.getEndpoint(),
        statusCode: error.getStatusCode()
      });
    } else {
      res.status(500).send({
        code: 'INTERNAL_SERVER_ERROR',
        error
      });
    }
  }
}

module.exports = ResponseValidator;
