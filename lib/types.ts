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
export type ErrorSchema = { message: string };
export type Json = { [key: string]: any };
export type SpecificJson<T> = { [key: string]: T; };

export type Schema = {
  [key: string]: { [key in HTTPMethods]: any }
};

export type SchemaSyncOptions = {
  ajvConfigBody?: AJVConfig,
  ajvConfigParams?: AJVConfig
};
