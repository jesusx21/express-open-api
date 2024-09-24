"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const apiSchemaBuilder = require('api-schema-builder');
const autoBind = require('auto-bind');
const isEmpty = require('lodash.isempty');
const { ValidationError, RouteNotDefinedInOpenAPISpec, InvalidAPISpecFormat } = require('../errors');
class RequestValidator {
    constructor(specLoader, options) {
        this.specLoader = specLoader;
        this.isAllowedNotDefinedPaths = options.allowNotDefinedPaths;
        this.errorHandler = options.invalidRequestHandler;
        this.onError = options.onRequestValidationError;
        this.onMissingPath = options.onMissingPath;
        autoBind(this);
    }
    middleware(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = this._resolveEndpoint(req);
            let validator;
            try {
                validator = yield this.specLoader.findValidatorForEndpoint(req.method, endpoint);
            }
            catch (error) {
                if (error instanceof RouteNotDefinedInOpenAPISpec && this.onMissingPath) {
                    try {
                        this.onMissingPath(req.method, endpoint, error);
                    }
                    catch (errorOnHandler) {
                        return this._errorHandler(errorOnHandler, req, res, next);
                    }
                }
                if (error instanceof RouteNotDefinedInOpenAPISpec && this.isAllowedNotDefinedPaths) {
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
                }
                catch (error) {
                    return this._errorHandler(error, req, res, next);
                }
            }
            if (validator.body) {
                try {
                    this._validateBody(validator, req);
                }
                catch (error) {
                    return this._errorHandler(error, req, res, next);
                }
            }
            return next();
        });
    }
    _resolveEndpoint(req) {
        return req.baseUrl + req.route.path;
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
            }
            catch (errorOnHandler) {
                this._defaultErrorHandler(errorOnHandler, req, res);
            }
        }
        else {
            this._defaultErrorHandler(error, req, res);
        }
        if (this.onError) {
            const endpoint = this._resolveEndpoint(req);
            try {
                this.onError(error, req.method, endpoint, this._serializeRequestData(req));
            }
            catch (_error) {
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
        }
        else if (error instanceof InvalidAPISpecFormat) {
            res.status(500).send({
                code: 'INVALID_API_SPEC_FORMAT',
                file: error.getFilePath(),
                error: error.getError()
            });
        }
        else if (error instanceof RouteNotDefinedInOpenAPISpec) {
            res.status(400).send({
                code: 'ENDPOINT_NOT_DEFINED_IN_API_SPEC',
                method: error.getMethod(),
                endpoint: error.getEndpoint()
            });
        }
        else {
            res.status(500).send({
                code: 'INTERNAL_SERVER_ERROR',
                error
            });
        }
    }
    _serializeRequestData(req) {
        const result = {};
        if (this._hasPayload(req)) {
            result.body = req.body;
        }
        if (this._hasQueryParameters(req)) {
            result.query = req.query;
        }
        return result;
    }
    _hasQueryParameters(req) {
        return !isEmpty(req.query);
    }
    _hasPayload(req) {
        return !isEmpty(req.body);
    }
}
module.exports = RequestValidator;
//# sourceMappingURL=requestValidator.js.map