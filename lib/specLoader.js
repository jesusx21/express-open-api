const apiSchemaBuilder = require('api-schema-builder');
const SwaggerParser = require('swagger-parser');

const {
  InvalidAPISpecFormat,
  RouteNotDefinedInOpenAPISpec
} = require('../errors');

class SpecLoader {
  constructor(specFilePath) {
    this.specFilePath = specFilePath;
  }

  async findValidatorForEndpoint(method, endpoint) {
    const schema = await this.getValidationSchema();

    if (!this._hasValidatorForEndpoint(schema, method, endpoint)) {
      throw new RouteNotDefinedInOpenAPISpec(method, endpoint);
    }

    return schema[endpoint][method.toLowerCase()];
  }

  async getValidationSchema() {
    if (this.schema) return this.schema;

    const spec = await this.getSpec();
    this.schema = apiSchemaBuilder.buildSchemaSync(spec);

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

  _hasValidatorForEndpoint(schema, method, endpoint) {
    return schema[endpoint] && schema[endpoint][method.toLowerCase()];
  }
}

module.exports = SpecLoader;
