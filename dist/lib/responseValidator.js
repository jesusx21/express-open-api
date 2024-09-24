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
const autoBind = require('auto-bind');
const isPlainObject = require('lodash.isplainobject');
const isDate = require('lodash.isdate');
const mapValues = require('lodash.mapvalues');
const { ValidationError, ResponseNotDefinedInOpenAPISpec, RouteNotDefinedInOpenAPISpec, InvalidAPISpecFormat } = require('../errors');
class ResponseValidator {
    constructor(specLoader, options) {
        this.specLoader = specLoader;
        this.isAllowedNotDefinedResponses = options.allowNotDefinedResponses;
        this.errorHandler = options.invalidResponseHandler;
        this.onError = options.onResponseValidationError;
        this.onMissingResponse = options.onMissingResponse;
        autoBind(this);
    }
    middleware(body, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = this._resolveEndpoint(req);
            let validator;
            try {
                validator = yield this._resolveValidatorFromSchema(req.method, endpoint, res.statusCode);
            }
            catch (error) {
                if (error instanceof ResponseNotDefinedInOpenAPISpec && this.onMissingResponse) {
                    try {
                        this.onMissingResponse(req.method, endpoint, res.statusCode, error);
                    }
                    catch (errorOnHandler) {
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
            }
            catch (error) {
                return this._errorHandler(error, body, req, res);
            }
            return body;
        });
    }
    _resolveEndpoint(req) {
        return req.originalBaseUrl + req.route.path;
    }
    _resolveValidatorFromSchema(method, endpoint, statusCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const validator = yield this.specLoader.findValidatorForEndpoint(method, endpoint);
                if (validator.responses[statusCode.toString()]) {
                    return validator.responses[statusCode.toString()];
                }
                else if (validator.responses.default) {
                    return validator.responses.default;
                }
            }
            catch (error) {
                if (error instanceof RouteNotDefinedInOpenAPISpec) {
                    throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
                }
                throw error;
            }
            throw new ResponseNotDefinedInOpenAPISpec(method, endpoint, statusCode);
        });
    }
    _validateResponse(validator, body) {
        validator.validate({ body: this._serializeDates(body), headers: {} });
        if (validator.errors) {
            throw new ValidationError(validator.errors);
        }
    }
    _serializeDates(body) {
        if (Array.isArray(body)) {
            return body.map(this._serializeDates);
        }
        else if (isPlainObject(body)) {
            return mapValues(body, this._serializeDates);
        }
        else if (isDate(body)) {
            return body.toJSON();
        }
        else {
            return body;
        }
    }
    _errorHandler(error, body, req, res) {
        // status code may be changed by the error handlers below
        const originalStatusCode = res.statusCode;
        if (this.errorHandler) {
            try {
                this.errorHandler(error, body, req, res);
            }
            catch (error) {
                this._defaultErrorHandler(error, body, req, res);
            }
        }
        else {
            this._defaultErrorHandler(error, body, req, res);
        }
        if (this.onError) {
            const endpoint = this._resolveEndpoint(req);
            try {
                this.onError(error, req.method, endpoint, originalStatusCode, body);
            }
            catch (error) {
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
        }
        else if (error instanceof InvalidAPISpecFormat) {
            res.status(500).send({
                code: 'INVALID_API_SPEC_FORMAT',
                file: error.getFilePath(),
                error: error.getError()
            });
        }
        else if (error instanceof ResponseNotDefinedInOpenAPISpec) {
            res.status(501).send({
                code: 'RESPONSE_NOT_DEFINED_IN_API_SPEC',
                method: error.getMethod(),
                endpoint: error.getEndpoint(),
                statusCode: error.getStatusCode()
            });
        }
        else {
            res.status(500).send({
                code: 'INTERNAL_SERVER_ERROR',
                error
            });
        }
    }
}
module.exports = ResponseValidator;
//# sourceMappingURL=responseValidator.js.map