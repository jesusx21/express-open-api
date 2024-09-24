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
const SwaggerParser = require('swagger-parser');
const { InvalidAPISpecFormat, RouteNotDefinedInOpenAPISpec } = require('../errors');
class SpecLoader {
    constructor(specFilePath) {
        this.specFilePath = specFilePath;
        this.enableTypeCoertion = true;
    }
    findValidatorForEndpoint(method, endpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const schema = yield this.getValidationSchema();
            if (!this._hasValidatorForEndpoint(schema, method, endpoint)) {
                throw new RouteNotDefinedInOpenAPISpec(method, endpoint);
            }
            return this._getEndpoint(schema, endpoint)[method.toLowerCase()];
        });
    }
    getValidationSchema() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.schema)
                return this.schema;
            const spec = yield this.getSpec();
            this.schema = apiSchemaBuilder.buildSchemaSync(spec, {
                ajvConfigBody: this._getAJVConfiguration(),
                ajvConfigParams: this._getAJVConfiguration()
            });
            return this.schema;
        });
    }
    getSpec() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.spec)
                return this.spec;
            return this.loadAPISpec();
        });
    }
    loadAPISpec() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.spec = yield SwaggerParser.validate(this.specFilePath);
            }
            catch (error) {
                throw new InvalidAPISpecFormat(this.specFilePath, error);
            }
            return this.spec;
        });
    }
    _getAJVConfiguration() {
        if (this.enableTypeCoertion) {
            return { coerceTypes: true };
        }
        return {};
    }
    _hasValidatorForEndpoint(schema, method, endpoint) {
        const endpointValidator = this._getEndpoint(schema, endpoint);
        return endpointValidator && endpointValidator[method.toLowerCase()];
    }
    _getEndpoint(schema, endpoint) {
        if (endpoint.endsWith('/')) {
            const endpointWithoutTrailingSlash = endpoint.substring(0, endpoint.length - 1);
            return schema[endpointWithoutTrailingSlash] || schema[endpoint];
        }
        else {
            const endpointWithTrailingSlash = endpoint + '/';
            return schema[endpoint] || schema[endpointWithTrailingSlash];
        }
    }
}
module.exports = SpecLoader;
//# sourceMappingURL=specLoader.js.map