const apiSchemaBuilder = require('api-schema-builder');
const SwaggerParser = require('swagger-parser');

const {
  InvalidAPISpecFormat,
  RouteNotDefinedInOpenAPISpec
} = require('../errors');

class SpecLoader {
  constructor(specFilePath) {
    this.specFilePath = specFilePath;
    this.enableTypeCoertion = true;
  }

  async findValidatorForEndpoint(method, endpoint) {
    const schema = await this.getValidationSchema();

    if (!this._hasValidatorForEndpoint(schema, method, endpoint)) {
      throw new RouteNotDefinedInOpenAPISpec(method, endpoint);
    }

    return this._getEndpoint(schema, endpoint)[method.toLowerCase()];
  }

  async getValidationSchema() {
    if (this.schema) return this.schema;

    const spec = await this.getSpec();
    this.schema = apiSchemaBuilder.buildSchemaSync(spec, {
      ajvConfigBody: this._getAJVConfiguration(),
      ajvConfigParams: this._getAJVConfiguration()
    });

    return this.schema;
  }

  async getSpec() {
    if (this.spec) return this.spec;

    return this.loadAPISpec();
  }

  async loadAPISpec() {
    try {
      this.spec = await SwaggerParser.validate(this.specFilePath);
    } catch (error) {
      throw new InvalidAPISpecFormat(this.specFilePath, error);
    }

    return this.spec;
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
    } else {
      const endpointWithTrailingSlash = endpoint + '/';

      return schema[endpoint] || schema[endpointWithTrailingSlash];
    }
  }
}

module.exports = SpecLoader;
