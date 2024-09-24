"use strict";
const fs = require('fs');
const mung = require('express-mung');
const sourceMapSupport = require('source-map-support');
const RequestValidator = require('./lib/requestValidator');
const ResponseValidator = require('./lib/responseValidator');
const SpecLoader = require('./lib/specLoader');
sourceMapSupport.install();
const DEFAULT_OPTIONS = {
    allowNotDefinedPaths: false,
    allowNotDefinedResponses: false,
    validateResponses: true
};
function expressOpenAPI(specFilePath, options = DEFAULT_OPTIONS) {
    if (!fs.existsSync(specFilePath)) {
        throw new Error(`OpenAPI spec file does not exists: ${specFilePath}`);
    }
    const optionsToApply = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
    const middlewares = [];
    const specLoader = new SpecLoader(specFilePath);
    const requestValidator = new RequestValidator(specLoader, optionsToApply);
    middlewares.push(requestValidator.middleware);
    if (optionsToApply.validateResponses) {
        const responseValidator = new ResponseValidator(specLoader, optionsToApply);
        // When an error is thrown express leaves req.baseUrl as an empty string, but we need it
        // in order to find the right OpenAPI schema
        middlewares.push((req, _res, next) => {
            req.originalBaseUrl = req.baseUrl;
            next();
        });
        middlewares.push(mung.jsonAsync(responseValidator.middleware, { mungError: true }));
    }
    return middlewares;
}
module.exports = expressOpenAPI;
//# sourceMappingURL=index.js.map