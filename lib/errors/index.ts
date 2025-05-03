import { ErrorSchema, HTTPMethods } from '../types';

class ExpressOpenAPIError extends Error {
  private error: ErrorSchema;

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
    public specFilePath: string,
    error: ErrorSchema
  ) {
    super(error);
  }

  getFilePath() {
    return this.specFilePath;
  }
}

export class ResponseNotDefinedInOpenAPISpec extends ExpressOpenAPIError {
  constructor(
    private method: HTTPMethods,
    private endpoint: string,
    private statusCode: number
  ) {
    super();
  }

  getMethod() {
    return this.method;
  }

  getEndpoint() {
    return this.endpoint;
  }

  getStatusCode() {
    return this.statusCode;
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

export class ValidationError extends Error {
  private errors: ErrorSchema[];

  constructor(errors?: ErrorSchema[] | string) {
    super();

    this.errors = errors instanceof Array ? errors : [{ message: errors }];
  }

  getErrors() {
    return this.errors;
  }
}
