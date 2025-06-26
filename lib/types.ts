import { OpenAPI } from 'openapi-types';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

export enum HTTPMethods {
  CONNECT = 'connect',
  DELETE = 'delete',
  GET = 'get',
  HEAD = 'head',
  OPTIONS = 'options',
  PATCH = 'patch',
  POST = 'post',
  PUT = 'put',
  TRACE = 'trace'
}

export type Request = ExpressRequest & { method: HTTPMethods, originalBaseUrl: string };
export type Response = ExpressResponse;

export type ErrorSchema = {
  message: string
};

export type Json = {
  [key: string]: unknown
};

export type RequestData = {
  body?: Json,
  query?: Json
};

export type Validator = {
  body?: {
    errors?: ErrorSchema[],
    validate: (params: Json) => void
  },
  parameters?: {
    errors: ErrorSchema,
    validate: (params: Json) => void
  },
  errors?: ErrorSchema[],
  responses: {
    default: Validator,
    [key: string]: Validator
  },
  validate: (params: Json) => void
  [key: string]: unknown
}

export type EndpointSchema = {
  [key in HTTPMethods]: Validator
};

export type Schema = {
  [key: string]: EndpointSchema
};

export type Spec = OpenAPI.Document;

export type AJVConfiguration = {
  coerceTypes?: boolean
};

export type InvalidRequestHandler = (
  error: ErrorSchema,
  req: Request,
  res: Response
) => ErrorSchema;

export type InvalidResponseHandler = (
  error: ErrorSchema,
  body: Json,
  eq: Request,
  res: Response
) => ErrorSchema;

export type OnError = (
  error: ErrorSchema,
  method: HTTPMethods,
  endpoint: string,
  data: number | RequestData
) => void;

export type OnMissingPath = (
  error: ErrorSchema,
  method: HTTPMethods,
  endpoint: string
) => void;

export type OnResponseValidationError = (
  error: ErrorSchema,
  method: HTTPMethods,
  endpoint: string,
  statusCode: number,
  body?: Json
) => void;

export type ValidatorOptions = {
  allowNotDefinedPaths?: boolean,
  allowNotDefinedResponses?: boolean,
  invalidRequestHandler?: InvalidRequestHandler,
  invalidResponseHandler?: InvalidResponseHandler,
  onMissingPath?: OnMissingPath,
  onMissingResponse?: OnError,
  onRequestValidationError?: OnError,
  onResponseValidationError?: OnResponseValidationError
  validateResponses?: boolean
}
