# Express OpenAPI
Another OpenAPI Validator for express.

## Installation
You can install this with `npm`:

```sh
npm install --save express-open-api
```

Or with `yarn`:

```sh
yarn add express-open-api
```

## Usage
You need to have an OpenAPI Spec file somewhere

```javascript
const express = require('express');
const expressOpenAPI = require('express-open-api');

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
  invalidRequestHandler: (error, req, res, next) => next(), // ignore all validation errors
  onRequestValidationError: (error) => console.log(error) // prints all errors
}
```

#### allowNotDefinedPaths
Default: `false`

Allow or not to have not defined paths in the spec file for express routes.

When `false` it will enforce to have a path defined in the OpenAPI spec files for every express route. If you have a route with a missing path in the OpenAPI spec files then it will return a `400` error.

```json
{
  "code": "ENDPOINT_NOT_DEFINED_IN_API_SPEC",
  "method": "GET",
  "endpoint": "/path/to/foo"
}
```

When `true` it will allow you to have routes without a spec. In other words, it will ignore any missing path in the OpenAPI spec files. This could be useful if you have en existent API and you want to incrementally add paths to your spec files as you go.

#### invalidRequestHandler
Optional

You may override the default behaviour of the validation middleware when an error is found in a request to a route. When defined, the function is called with the following signature:

```javascript
function errorHandler(error, req, res, next) {
  // Do something...
}
```
Please note that if you error handler has an error then the middleware will return a `500 Internal Server Error`. In the function you can define anything you need to handle errors. Please be aware that error could be any of these classes:

 * `ValidationError`
 * `RouteNotDefinedOnOpenAPISpec`
 * `InvalidAPISpecFormat`

See below for more details about these errors. If you do not define an error handler the default behaviour is as follows:

`ValidationError` will be a `400 Bad Request` error. With payload:

```
{
  "code": "BAD_REQUEST",
  "errors": [{
    // ... list of AJV errors
  }]
}
```

`RouteNotDefinedOnOpenAPISpec` will be a `400 Bad Request` error. With payload:

```
{
  "code": "ENDPOINT_NOT_DEFINED_IN_API_SPEC",
  "method": "GET|POST|DELETE|PUT|...",
  "endpont": "/path/to/endpoint"
}
```

`InvalidAPISpecFormat` will be a `500 Internal Server Error`. With payload:

```
{
  "code": "ENDPOINT_NOT_DEFINED_IN_API_SPEC",
  "file": "/path/to/spec.yml".
  "error": {
    // ... swagger-parser error
  }
}
```

#### onRequestValidationError
Optional

This function will be called anytime the middleware finds an error while validating request. You can use this function to log errors or send them to a error monitor system.

```javascript
function onRequestValidationError(error, method, path) => {
  console.error(`[ERROR] ${method} ${path}: ${error}`);
}
```

Errors that could be reported:

 * `ValidationError`
 * `RouteNotDefinedOnOpenAPISpec`
 * `InvalidAPISpecFormat`

NOTE: Any error throwed by this function will be ignored by the middleware.

### Errors
Those errors will be throwed when a validation error occours in the validation middleware. You can import errors with:

```javascript
const {
  ValidationError,
  RouteNotDefinedOnOpenAPISpec,
  InvalidAPISpecFormat
} = require('express-open-api/errors');
```

#### ValidationError
This errors happens when the API Specification in the OpenAPI Spec files does not match with the requested received in a given path. The available public methods are:

 * getErrors(). Return a list of errors found in the request. It validates the request body and query parameters when available. The errors has the format defined by the AJV library.

#### RouteNotDefinedOnOpenAPISpec
When `allowNotDefinedPaths` is set to `false` and the requested route is not defined in the paths of the OpenAPI spec files. The available public methods are:

 * getMethod(). HTTP method for the endpoint. Could be `GET`, `POST`, `DELETE`, `PUT`, etc.
 * getEndpoint(). This is the full endpoint route.

#### InvalidAPISpecFormat
If the OpenAPI Spec files has not a valid OpenAPI format this error will be throwed. The available public method are:

 * getFilePath(). The path to the main OpenAPI Spec file.
 * getError(). The error returned by `swagger-parser` when validating the file.
