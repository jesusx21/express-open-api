// @ts-ignore
import apiSchemaBuilder from 'api-schema-builder';
import SwaggerParser from 'swagger-parser';

import { InvalidAPISpecFormat, RouteNotDefinedInOpenAPISpec } from 'errors';
import { Spec, Schema, AJVConfiguration, HTTPMethods, Validator, EndpointSchema } from 'types';
import { isNil } from 'lodash';

export default class SpecLoader {
  private enableTypeCoercion: boolean;
  private schema?: Schema;
  private spec?: Spec;

  constructor(
    private specFilePath: string
  ) {
    this.enableTypeCoercion = true;
  }

  async findValidatorForEndpoint(method: HTTPMethods, endpoint: string): Promise<Validator> {
    const schema = await this.getValidationSchema();

    if (!this.hasValidatorForEndpoint(schema, method, endpoint)) {
      throw new RouteNotDefinedInOpenAPISpec(method, endpoint);
    }

    const endpointSchema = this.getEndpoint(schema, endpoint);

    return endpointSchema[method];
  }

  async getValidationSchema(): Promise<Schema> {
    if (this.schema) return this.schema;

    const spec = await this.getSpec();
    this.schema = apiSchemaBuilder.buildSchemaSync(
      spec,
      {
        ajvConfigBody: this.getAJVConfiguration(),
        ajvConfigParams: this.getAJVConfiguration()
      }
    )

    return this.schema;
  }

  async getSpec(): Promise<Spec> {
    if (this.spec) return this.spec;

    return this.loadAPISpec();
  }

  async loadAPISpec(): Promise<Spec> {
    try {
      // @ts-ignore
      this.spec = await SwaggerParser.validate(this.specFilePath);
    } catch (error: any) {
      throw new InvalidAPISpecFormat(this.specFilePath, error);
    }

    return this.spec;
  }

  private getAJVConfiguration(): AJVConfiguration {
    if (this.enableTypeCoercion) {
      return { coerceTypes: true };
    }

    return {};
  }

  private hasValidatorForEndpoint(schema: Schema, method: HTTPMethods, endpoint: string): boolean {
    const endpointSchema = this.getEndpoint(schema, endpoint);

    if (isNil(endpointSchema)) return false;

    return !isNil(endpointSchema[method]);
  }

  private getEndpoint(schema: Schema, endpoint: string): EndpointSchema {
    if (endpoint.endsWith('/')) {
      const endpointWithoutTrailingSlash = endpoint.substring(0, endpoint.length - 1);

      return schema[endpointWithoutTrailingSlash] || schema[endpoint];
    }

    const endpointWithTrailingSlash = endpoint + '/';

    return schema[endpoint] || schema[endpointWithTrailingSlash];
  }
}
