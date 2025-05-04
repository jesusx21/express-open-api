import SwaggerParser from 'swagger-parser';
import { OpenAPI } from 'openapi-types';

import { InvalidAPISpecFormat } from 'errors';

export default class SpecLoader {
  private spec?: OpenAPI.Document;

  constructor(
    private specFilePath: string
  ) {}

  async loadAPISpec() {
    try {
      // @ts-ignore
      this.spec = await SwaggerParser.validate(this.specFilePath);
    } catch (error: any) {
      throw new InvalidAPISpecFormat(this.specFilePath, error);
    }

    return this.spec;
  }
}
