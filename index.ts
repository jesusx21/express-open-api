import mung from 'express-mung';
import sourceMapSupport from 'source-map-support';
import * as fs from 'fs';
import { NextFunction } from 'express';

import RequestValidator from './lib/requestValidator';
import ResponseValidator from './lib/responseValidator';
import SpecLoader from './lib/specLoader';
import {
  Middleware,
  Request,
  Response,
  ValidatorOptions
} from './lib/types';

sourceMapSupport.install();

const DEFAULT_OPTIONS = {
  allowNotDefinedPaths: false,
  allowNotDefinedResponses: false,
  validateResponses: true
};

export default function expressOpenAPI(
  specFilePath: string,
  options: ValidatorOptions = DEFAULT_OPTIONS
) {
  if (!fs.existsSync(specFilePath)) {
    throw new Error(`OpenAPI spec file does not exists: ${specFilePath}`);
  }

  const optionsToApply = { ...DEFAULT_OPTIONS, ...options };
  const middlewares: Middleware[] = [];

  const specLoader = new SpecLoader(specFilePath);
  const requestValidator = new RequestValidator(specLoader, optionsToApply);

  middlewares.push(requestValidator.middleware);

  if (optionsToApply.validateResponses) {
    const responseValidator = new ResponseValidator(specLoader, optionsToApply);

    // When an error is thrown express leaves req.baseUrl as an empty string, but we need it
    // in order to find the right OpenAPI schema
    middlewares.push((req: Request, _res: Response, next: NextFunction) => {
      req.originalBaseUrl = req.baseUrl;

      next();
    });

    middlewares.push(mung.jsonAsync(responseValidator.middleware, { mungError: true }));
  }

  return middlewares;
}
