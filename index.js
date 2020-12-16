const fs = require('fs');
const mung = require('express-mung');

const RequestValidator = require('./lib/requestValidator');
const ResponseValidator = require('./lib/responseValidator');
const SpecLoader = require('./lib/specLoader');

const DEFAULT_OPTIONS = {
  allowNotDefinedPaths: false,
  allowNotDefinedResponses: false,
  validateResponses: true
};

function expressOpenAPI(specFilePath, options = DEFAULT_OPTIONS) {
  if (!fs.existsSync(specFilePath)) {
    throw new Error(`OpenAPI spec file does not exists: ${specFilePath}`);
  }

  const optionsToApply = { ...DEFAULT_OPTIONS, ...options };
  const middlewares = [];

  const specLoader = new SpecLoader(specFilePath);
  const requestValidator = new RequestValidator(specLoader, optionsToApply);

  middlewares.push(requestValidator.middleware);

  if (optionsToApply.validateResponses) {
    const responseValidator = new ResponseValidator(specLoader, optionsToApply);

    middlewares.push(mung.jsonAsync(responseValidator.middleware, { mungError: true }));
  }

  return middlewares;
}

module.exports = expressOpenAPI;
