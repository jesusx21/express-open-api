class ValidationError extends Error {
  constructor(errors = []) {
    super();

    this.errors = errors instanceof Array ? errors : [{ message: errors }];
  }

  getErrors() {
    return this.errors;
  }
}

class RouteNotDefinedOnOpenAPISpec extends Error {
  constructor(method, endpoint) {
    super();

    this.method = method;
    this.endpoint = endpoint;
  }

  getMethod() {
    return this.method;
  }

  getEndpoint() {
    return this.endpoint;
  }
}

class InvalidAPISpecFormat extends Error {
  constructor(specFilePath, error) {
    super();

    this.specFilePath = specFilePath;
    this.error = error;
  }

  getFilePath() {
    return this.specFilePath;
  }

  getError() {
    return this.error;
  }
}

module.exports = { ValidationError, RouteNotDefinedOnOpenAPISpec, InvalidAPISpecFormat };
