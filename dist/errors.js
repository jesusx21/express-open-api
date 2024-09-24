"use strict";
class ValidationError extends Error {
    constructor(errors = []) {
        super();
        this.errors = errors instanceof Array ? errors : [{ message: errors }];
    }
    getErrors() {
        return this.errors;
    }
}
class RouteNotDefinedInOpenAPISpec extends Error {
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
module.exports = {
    ValidationError,
    RouteNotDefinedInOpenAPISpec,
    ResponseNotDefinedInOpenAPISpec,
    InvalidAPISpecFormat
};
//# sourceMappingURL=errors.js.map