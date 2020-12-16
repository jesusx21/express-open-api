# Express OpenAPI
Another OpenAPI Validator for express.

## Installation
You can install this with `npm`:

```sh
npm install --save @abiee/express-open-api
```

Or with `yarn`:

```sh
yarn add @abiee/express-open-api
```

## Usage
You need to have an OpenAPI Spec file somewhere

```javascript
const express = require('express');
const expressOpenAPI = require('@abiee/express-open-api');

const app = express();
const middleware = expressOpenAPI('/path/to/your/spec.yml');

app.get('/foo', middleware, (req, res) => {
  res.send({ foo: 'bar' });
});

app.get('/xyz', middleware, (req, res) => {
  res.send({ message: 'foobar' });
});
```

The valiator middleware can be created with:

```javascript
expressOpenAPI(pathToSpecFile, options);
```

### Options
Full options object:

```javascript
{
  allowNotDefinedPaths: false,
  allowNotDefinedResponses: false,
  validateResponses: true,
  invalidRequestHandler: (error, req, res, next) => next(), // ignore all errors
  invalidResponseHandler: (error, body, req, res) => res.status(res.statusCode).send(body), // ignore all errors
  onRequestValidationError: (error, method, endpoint) => console.log(error), // prints all errors
  onResponseValidationError: (error, method, endpoint, statusCode) => console.log(error), // prints all errors
  onMissingPath: (method, endpoint, error) => console.log(error), // prints all paths that are missed in the spec file
  onMissingResponse: (method, endpoint, statusCode, error) => console.log(error) // prints all responses without OpenAPI spec
}
```

#### allowNotDefinedPaths
Default: `false`

Allow or not to have not defined paths in the OpenAPI spec file for express routes.

When `false` it will enforce to have the path defined in the OpenAPI spec files for express routes. If you have a route with a missing path in the OpenAPI spec files then it will return a `400` error.

```json
{
  "code": "ENDPOINT_NOT_DEFINED_IN_API_SPEC",
  "method": "GET",
  "endpoint": "/path/to/foo"
}
```

When `true` it will allow you to have routes without an OpenAPI spec. In other words, it will ignore any missing path in the OpenAPI spec files. This could be useful if you have en existent API and you want to incrementally add paths to your spec files as you go.

### allowNotDefinedResponses
Default: `false`

Allow or no to have not defined respones in the spec file when express returns a response.

When `false` it will enforce to have all responses defined in the OpenAPI spec files for express routes. If you have a route with a defined route but missing response status code in the OpenAPI spec files then it will return a `501` error.

```json
{
  "code": "RESPONSE_NOT_DEFINED_IN_API_SPEC",
  "method": "GET",
  "endpoint": "/path/to/foo",
  "statusCode": 401
}
```

Note: the middleware will look uf for the status code first, if not found then will look up for a `default` response.

#### validateResponses
Default: `true`

Validate responses or not. When `false` all respones will be ignored by the validator. When `true` it will validate all respones against the OpenAPI spec file. If a response is not valid then it will call `invalidResponseHandler()` when defined, or will use the default error handler returning a `501` error.

```
{
  "code": "BAD_RESPONSE",
  "errors": [{
    // ... list of ajv errors
  }]
}
```

#### invalidRequestHandler
Optional

You may override the default behaviour of the validation middleware when an error is found in a request to a route. When defined, the function is called with the following signature:

```javascript
function errorHandler(error, req, res, next)
```
Please note that if you error handler has an error then the middleware will return a `500 Internal Server Error`. In the function you can define anything you need to handle errors. Please be aware that error could be any of these classes:

 * `ValidationError`
 * `RouteNotDefinedInOpenAPISpec`
 * `InvalidAPISpecFormat`
 * Generic errors

See below for more details about these errors. If you do not define an error handler the default behaviour is as follows:

`ValidationError` will be a `400 Bad Request` error. With payload:

```
{
  "code": "BAD_REQUEST",
  "errors": [{
    // ... list of ajv errors
  }]
}
```

`RouteNotDefinedInOpenAPISpec` will be a `400 Bad Request` error with payload:

```
{
  "code": "ENDPOINT_NOT_DEFINED_IN_API_SPEC",
  "method": "GET|POST|DELETE|PUT|...",
  "endpont": "/path/to/endpoint"
}
```

`InvalidAPISpecFormat` will be a `500 Internal Server Error` with payload:

```
{
  "code": "INVALID_API_SPEC_FORMAT",
  "file": "/path/to/spec.yml".
  "error": {
    // ... swagger-parser error
  }
}
```

On unexpcted errors will be a `500 Internal Server Error` with payload:

```
{
  "code": "INTERNAL_SERVER_ERROR",
  "error": {
    // ... serialized error to JSON
  }
}
```

#### invalidResponseHandler
Optional

You may override the default behaviour of the validation middleware when an error is found in the response of a route. When defined, the function is called with the following signature:

```javascript
function errorHandler(error, body, req, res)
```
Please note that if you error handler has an error then the middleware will return a `500 Internal Server Error`. In the function you can define anything you need to handle errors. Please be aware that error could be any of these classes:

 * `ValidationError`
 * `ResponseNotDefinedInOpenAPISpec`
 * `InvalidAPISpecFormat`
 * Generic errors

See below for more details about these errors. If you do not define an error handler the default behaviour is as follows:

`ValidationError` will be a `501 Not Implemented` error. With payload:

```
{
  "code": "BAD_RESPONSE",
  "errors": [{
    // ... list of ajv errors
  }]
}
```

`ResponseNotDefinedInOpenAPISpec` will be a `501 Not Implemented` error with payload:

```
{
  "code": "RESPONSE_NOT_DEFINED_IN_API_SPEC",
  "method": "GET|POST|DELETE|PUT|...",
  "endpont": "/path/to/endpoint",
  "statusCode": 200|400|401|...
}
```

`InvalidAPISpecFormat` will be a `500 Internal Server Error` with payload:

```
{
  "code": "INVALID_API_SPEC_FORMAT",
  "file": "/path/to/spec.yml".
  "error": {
    // ... swagger-parser error
  }
}
```

On unexpcted errors will be a `500 Internal Server Error` with payload:

```
{
  "code": "INTERNAL_SERVER_ERROR",
  "error": {
    // ... serialized error to JSON
  }
}
```

#### onRequestValidationError
Optional

This function will be called anytime the middleware finds an error while validating request. You can use this function to log errors or send them to a error monitor system.

```javascript
function onError(error, method, endpoint)
```

Errors that could be reported:

 * `ValidationError`
 * `RouteNotDefinedInOpenAPISpec`
 * `InvalidAPISpecFormat`

NOTE: Any error throwed by this function will be ignored by the middleware.

#### onResponseValidationError
Optional

This function will be called anytime the middleware finds an error while validating the response. You can use this function to log errors or send them to a error monitor system.

```javascript
function onError(error, method, endpoint, statusCode)
```

Errors that could be reported:

 * `ValidationError`
 * `ResponseNotDefinedInOpenAPISpec`
 * `InvalidAPISpecFormat`

NOTE: Any error throwed by this function will be ignored by the middleware.

#### onMissingPath
Optional

This function will be called when a path is not defined for a route. This is just a notification. You can use this function to log errors or send them to a error monitor system.

```
function onMissingPath(method, endpoint, error)
```

#### onMissingResponse
Optional

This function will be called when a returned response is not defined for a route. This is just a notification. You can use this function to log errors or send them to a error monitor system.

```
function onMissingResponse(method, endpoint, statusCode, error)
```

### Errors
Those errors will be throwed when a validation error occours in the validation middleware. You can import errors with:

```javascript
const {
  ValidationError,
  RouteNotDefinedInOpenAPISpec,
  ResponseNotDefinedInOpenAPISpec,
  InvalidAPISpecFormat
} = require('@abiee/express-open-api/errors');
```

#### ValidationError
This errors happens when the API Specification in the OpenAPI Spec files does not match with the requested received in a given path. The available public methods are:

 * getErrors(). Return a list of errors found in the request. It validates the request body and query parameters when available. The errors has the format defined by the AJV library.

#### RouteNotDefinedInOpenAPISpec
When `allowNotDefinedPaths` is set to `false` and the requested route is not defined in the paths of the OpenAPI spec files. The available public methods are:

 * getMethod(). HTTP method for the endpoint. Could be `GET`, `POST`, `DELETE`, `PUT`, etc.
 * getEndpoint(). This is the full endpoint route.

#### InvalidAPISpecFormat
If the OpenAPI Spec files has not a valid OpenAPI format this error will be throwed. The available public method are:

 * getFilePath(). The path to the main OpenAPI Spec file.
 * getError(). The error returned by `swagger-parser` when validating the file.

## Examples
Here are some use cases that shows how the validation middleware can be used.

### Custom validation responses
You may have your own API standards and the default server responses are breaking them. You can change the default responses as you need:

```javascript
const express = require('express');
const expressOpenAPI = require('@abiee/express-open-api');
const {
  ValidationError,
  RouteNotDefinedInOpenAPISpec,
  ResponseNotDefinedInOpenAPISpec,
  InvalidAPISpecFormat
} = require('@abiee/express-open-api/errors');

const app = express();

const middleware = expressOpenAPI('/path/to/your/spec.yml', {
  invalidRequestHandler: (error, req, res, next) => {
    if (error instanceof ValidationError) {
      res.status(400).send({
        status: 10001,
        message: 'invalid request',
        errorList: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        status: 10010,
        message: 'invalid api spec'
      });
    } else if (error instanceof RouteNotDefinedInOpenAPISpec) {
      res.status(400).send({
        status: 10012,
        message: 'invalid route'
      });
    } else {
      res.status(500).send({
        status: 10000,
        message: 'server error'
      });
    }
  },
  invalidResponseHandler: (error, body, req, res) => {
    if (error instanceof ValidationError) {
      res.status(400).send({
        status: 10002,
        message: 'invalid response',
        errorList: error.getErrors()
      });
    } else if (error instanceof InvalidAPISpecFormat) {
      res.status(500).send({
        status: 10010,
        message: 'invalid api spec'
      });
    } else if (error instanceof ResponseNotDefinedInOpenAPISpec) {
      // ignore undefined specs
      res.status(res.statusCode).send(body);
    } else {
      res.status(500).send({
        status: 10000,
        message: 'server error'
      });
    }
  }
});

app.get('/foo', middleware, (req, res) => {
  res.send({ foo: 'bar' });
});

app.get('/xyz', middleware, (req, res) => {
  res.send({ message: 'foobar' });
});
```

### Validate against OpenAPI but do not change actual API behaviour
You may just monitor the compliance of your OpenAPI Specification agains the actual API. This could be useful for contract testing in `production` without break anything.

```javascript
const express = require('express');
const expressOpenAPI = require('@abiee/express-open-api');
const Sentry = require('@sentry/node');
const {
  ValidationError,
  RouteNotDefinedInOpenAPISpec,
  ResponseNotDefinedInOpenAPISpec,
  InvalidAPISpecFormat
} = require('@abiee/express-open-api/errors');

Sentry.init({ /* ... */ });

const app = express();

const middleware = expressOpenAPI('/path/to/your/spec.yml', {
  allowNotDefinedPaths: true,
  allowNotDefinedResponses: true,
  invalidRequestHandler: (error, req, res, next) => {
    if (error instanceof InvalidAPISpecFormat) {
      return res.status(500).send({ code: 'INTERNAL_SERVER_ERROR' });
    }

    next(); // ignore all validation errors
  },
  invalidResponseHandler: (error, body, req, res) => {
    res.status(res.statusCode).send(body); // ignore all validation errors
  },
  onRequestValidationError: (error, method, endpoint) => {
    if (error instanceof ValidationError) {
      Sentry.captureException(error);
    }
  },
  onResponseValidationError: (error, method, endpoint, statusCode) => {
    if (error instanceof ValidationError) {
      Sentry.captureException(error);
    }
  }
});

app.get('/foo', middleware, (req, res) => {
  res.send({ foo: 'bar' });
});

app.get('/xyz', middleware, (req, res) => {
  res.send({ message: 'foobar' });
});
```
