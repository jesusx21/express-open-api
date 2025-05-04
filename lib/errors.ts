import { ErrorSchema, HTTPMethods } from 'types';

class ExpressOpenAPIError extends Error {
  private error?: ErrorSchema;

  constructor(error?: ErrorSchema) {
    super(error?.message);

    if (error) this.error = error;
  }

  get name() {
    return this.constructor.name;
  }

  getError() {
    return this.error;
  }
}

export class InvalidAPISpecFormat extends ExpressOpenAPIError {
  constructor(
    private specFilePath: string,
    error: ErrorSchema
) {
    super(error);
  }

  getFilePath() {
    return this.specFilePath;
  }
}

export class RouteNotDefinedInOpenAPISpec extends ExpressOpenAPIError {
  constructor(
    private method: HTTPMethods,
    private endpoint: string
  ) {
    super();
  }

  getMethod() {
    return this.method;
  }

  getEndpoint() {
    return this.endpoint;
  }
}
