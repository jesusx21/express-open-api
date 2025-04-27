class ValidationError extends Error {
  constructor(errors = []) {
    super();

    this.errors = errors instanceof Array ? errors : [{ message: errors }];
  }

  getErrors() {
    return this.errors;
  }
}

class ResponseNotDefinedInOpenAPISpec extends Error {
  constructor(method, endpoint, statusCode) {
    super();

    this.method = method;
    this.endpoint = endpoint;
    this.statusCode = statusCode;
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

module.exports = {
  ValidationError,
  ResponseNotDefinedInOpenAPISpec,
};
