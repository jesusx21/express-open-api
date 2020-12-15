const apiSchemaBuilder = require('api-schema-builder');
const autoBind = require('auto-bind');
const fs = require('fs');
const isEmpty = require('lodash.isempty');
const SwaggerParser = require('swagger-parser');

const { ValidationError, RouteNotDefinedOnOpenAPISpec, InvalidAPISpecFormat } = require('./errors');

const DEFAULT_OPTIONS = {
  allowNotDefinedPaths: false
};

class OpenAPISpecLoader {
  constructor(specFilePath) {
    this.specFilePath = specFilePath;

    this.load();
  }

  async getSpec() {
    if (this.spec) return this.spec;

    return this.load();
  }

  async load() {
    try {
      this.spec = await SwaggerParser.validate(this.specFilePath);
    } catch (error) {
      throw new InvalidAPISpecFormat(this.specFilePath, error);
    }

    return this.spec;
  }
}

class RequestValidator {
  constructor(specLoader, options) {
    this.specLoader = specLoader;
    this.isAllowedNotDefinedPaths = options.allowNotDefinedPaths;
    this.errorHandler = options.invalidRequestHandler;
    this.onError = options.onRequestValidationError;
    this.onMissingPath = options.onMissingPath;

    autoBind(this);
  }

  async middleware(req, res, next) {
    const endpoint = this._resolveEndpoint(req);

    let validator;

    try {
      validator = await this._resolveValidatorFromSchema(req.method, endpoint);
    } catch (error) {
      if (error instanceof RouteNotDefinedOnOpenAPISpec && this.onMissingPath) {
        try {
          this.onMissingPath(req.method, endpoint);
        } catch (errorOnHandler) {
          return this._errorHandler(errorOnHandler, req, res, next);
        }
      }

      if (error instanceof RouteNotDefinedOnOpenAPISpec && this.isAllowedNotDefinedPaths) {
        return next();
      }

      return this._errorHandler(error, req, res, next);
    }

    if (this._hasQueryParameters(req) && !validator.parameters) {
      const error = new ValidationError('unexpected query parameters received');
      return this._errorHandler(error, req, res, next);
    }

    if (this._hasPayload(req) && !validator.body) {
      const error = new ValidationError('unexpected payload received');
      return this._errorHandler(error, req, res, next);
    }

    if (validator.parameters) {
      try {
        this._validateQueryParameters(validator, req);
      } catch (error) {
        return this._errorHandler(error, req, res, next);
      }
    }

    if (validator.body) {
      try {
        this._validateBody(validator, req);
      } catch (error) {
        return this._errorHandler(error, req, res, next);
      }
    }

    return next();
  }

  _resolveEndpoint(req) {
    return req.baseUrl + req.route.path;
  }

  async _resolveValidatorFromSchema(method, endpoint) {
    const schema = await this._getSchema();

    if (!this._hasValidatorForEndpoint(schema, method.toLowerCase(), endpoint)) {
      throw new RouteNotDefinedOnOpenAPISpec(method, endpoint);
    }

    return schema[endpoint][method.toLowerCase()];
  }

  _hasValidatorForEndpoint(schema, method, endpoint) {
    return schema[endpoint] && schema[endpoint][method];
  }

  async _getSchema() {
    if (this.schema) return this.schema;

    const spec = await this.specLoader.getSpec();
    this.schema = apiSchemaBuilder.buildSchemaSync(spec);

    return this.schema;
  }

  _hasQueryParameters(req) {
    return !isEmpty(req.query);
  }

  _hasPayload(req) {
    return !isEmpty(req.body);
  }

  _validateQueryParameters(validator, req) {
    validator.parameters.validate({ path: req.params, query: req.query });

    if (validator.parameters.errors) {
      throw new ValidationError(validator.parameters.errors);
    }
  }

  _validateBody(validator, req) {
    validator.body.validate(req.body);

    if (validator.body.errors) {
      throw new ValidationError(validator.body.errors);
    }
  }

  _errorHandler(error, req, res, next) {
    if (this.errorHandler) {
      try {
        this.errorHandler(error, req, res, next);
      } catch (errorOnHandler) {
        this._defaultErrorHandler(errorOnHandler, req, res);
      }
    } else {
      this._defaultErrorHandler(error, req, res);
    }

    if (this.onError) {
      const endpoint = this._resolveEndpoint(req);

      try {
        this.onError(error, req.method, endpoint);
      } catch (_error) {
        // ignore all errors on notification handlers
      }
    }
  }

  _defaultErrorHandler(error, req, res) {
    if (error instanceof ValidationError) {
      res.status(400).send({
        code: 'BAD_REQUEST',
        errors: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        code: 'INVALID_API_SPEC_FORMAT',
        file: error.getFilePath(),
        error: error.getError()
      });
    } else if (error instanceof RouteNotDefinedOnOpenAPISpec) {
      res.status(400).send({
        code: 'ENDPOINT_NOT_DEFINED_IN_API_SPEC',
        method: error.getMethod(),
        endpoint: error.getEndpoint()
      });
    } else {
      res.status(500).send({
        code: 'INTERNAL_ERROR',
        error
      });
    }
  }
}

function expressOpenAPI(specFilePath, options) {
  if (!fs.existsSync(specFilePath)) {
    throw new Error(`OpenAPI spec file does not exists: ${specFilePath}`);
  }

  const specLoader = new OpenAPISpecLoader(specFilePath);
  const requestValidator = new RequestValidator(specLoader, { ...DEFAULT_OPTIONS, ...options });

  return requestValidator.middleware;
}

module.exports = expressOpenAPI;
