import { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { OpenAPI } from 'openapi-types';

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

export type AJVConfig = { coerceTypes?: boolean; };
export type APISpec = OpenAPI.Document;
export type Json = { [key: string]: any };
export type SpecificJson<T> = { [key: string]: T; };
export type ErrorSchema = {
  message: string,
  [key: string]: any
};

export type Validator = {
  body?: {
    errors: ErrorSchema,
    validate: (params: Json) => void
  },
  parameters?: {
    errors: ErrorSchema,
    validate: (params: Json) => void
  },
  errors?: ErrorSchema[] | string,
  responses: {
    default: Validator,
    [key: string]: Validator
  },
  validate: (params: Json) => void
  [key: string]: any
};

export type EndpointSchema = {
  [key in HTTPMethods]: Validator
};

export type Schema = {
  [key: string]: EndpointSchema
};

export type SchemaSyncOptions = {
  ajvConfigBody?: AJVConfig,
  ajvConfigParams?: AJVConfig
};

export type RequestData = {
  body?: Json,
  query?: Json
};

export type Next = (error?: ErrorSchema) => void;
export type Request = ExpressRequest & { method: HTTPMethods, originalBaseUrl: string };
export type Middleware = (req: Request, res: Response, next: Next) => any;
export type Response = ExpressResponse;

export type ErrorHandler = (error: ErrorSchema, req: Request, res: Response, next: Next) => void;
export type InvalidResponseHandler = (error: ErrorSchema, body: Json, req: Request, res: Response) => Error;
export type InvalidRequestHandler = (error: ErrorSchema, req: Request, res: Response) => Error;
export type OnError = (error: ErrorSchema, method: HTTPMethods, endpoint: string, data: number | RequestData) => void;
export type OnMissingPath = (error: ErrorSchema, method: HTTPMethods, endpoint: string) => void;
export type OnResponseValidationError = (error: ErrorSchema, method: HTTPMethods, endpoint: string, statusCode: number, body?: Json) => void;

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
};

export enum HTTPErrorCodes {
  BAD_RESPONSE = 'BAD_RESPONSE',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INVALID_API_SPEC_FORMAT = 'INVALID_API_SPEC_FORMAT',
  RESPONSE_NOT_DEFINED_IN_API_SPEC = 'RESPONSE_NOT_DEFINED_IN_API_SPEC'
};
