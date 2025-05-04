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

export type ErrorSchema = {
  message: string,
  [key: string]: any
};

export type Json = {
  [key: string]: any
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
  [key: string]: any
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
