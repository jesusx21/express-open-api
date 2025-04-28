// @ts-ignore
import apiSchemaBuilder from 'api-schema-builder';
import SwaggerParser from 'swagger-parser';
import { isEmpty } from 'lodash';

import { APISpec, HTTPMethods, Json, SchemaSyncOptions, Validator } from './types';
import { InvalidAPISpecFormat, RouteNotDefinedInOpenAPISpec } from './errors';
import { Schema } from './types';

export default class SpecLoader {
  private enableTypeCoertion: boolean;
  private schema: Schema;
  private spec: APISpec;

  constructor(
    private specFilePath: string
) {
    this.enableTypeCoertion = true;
  }

  async findValidatorForEndpoint(method: HTTPMethods, endpoint: string): Promise<Validator> {
    const schema = await this.getValidationSchema();

    if (!this.hasValidatorForEndpoint(schema, method, endpoint)) {
      throw new RouteNotDefinedInOpenAPISpec(method, endpoint);
    }

    return this.getEndpoint(schema, endpoint)[method];
  }

  async getValidationSchema(): Promise<Schema> {
    if (this.schema) return this.schema

    await this.loadAPISpec();

    this.schema = this.buildSchemaSync(
      this.spec,
      {
        ajvConfigBody: this.getAJVConfiguration(),
        ajvConfigParams: this.getAJVConfiguration()
      }
    );

    return this.schema;
  }

  async getSpec() {
    return this.spec;
  }

  async loadAPISpec(): Promise<APISpec> {
    if (this.spec) return this.spec;;

    try {
      // @ts-ignore
      this.spec = await SwaggerParser.validate(this.specFilePath);
    } catch (error) {
      throw new InvalidAPISpecFormat(this.specFilePath, error);
    }

    return this.spec;
  }

  private buildSchemaSync(spec: APISpec, options?: SchemaSyncOptions): Schema {
    return apiSchemaBuilder.buildSchemaSync(spec, options) as Schema;
  }

  private getAJVConfiguration(): Json {
    if (!this.enableTypeCoertion) return {};

    return { coerceTypes: true };
  }

  private getEndpoint(schema: Schema, endpoint: string) {
    if (endpoint.endsWith('/')) {
      const endpointWithoutTrailingSlash = endpoint.substring(0, endpoint.length - 1);

      return schema[endpointWithoutTrailingSlash] || schema[endpoint];
    } else {
      const endpointWithTrailingSlash = `${endpoint}/`;

      return schema[endpoint] || schema[endpointWithTrailingSlash];
    }
  }

  private hasValidatorForEndpoint(schema: Schema, method: HTTPMethods, endpoint: string): boolean {
    const endpointValidator = this.getEndpoint(schema, endpoint);

    return !isEmpty(endpointValidator) && !isEmpty(endpointValidator[method]);
  }
}
