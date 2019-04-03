// flow-typed signature: 21f1132afbffdbb241aef0338fe51cd3
// flow-typed version: 7694406420/humps_v2.x.x/flow_>=v0.25.x

// @flow strict

/**
 * Flow libdef for 'humps'
 * See https://www.npmjs.com/package/humps
 * by Vincent Driessen, 2018-12-21
 */

declare module "humps" {
  declare type Options = {|
    separator?: string,
    split?: RegExp | string
  |};

  declare export function camelize(string): string;
  declare export function pascalize(string): string;
  declare export function decamelize(string, options?: Options): string;
  declare export function depascalize(string, options?: Options): string;

  declare export function camelizeKeys(
    { +[string]: mixed },
    options?: Options
  ): { [string]: mixed };
  declare export function pascalizeKeys(
    { +[string]: mixed },
    options?: Options
  ): { [string]: mixed };
  declare export function decamelizeKeys(
    { +[string]: mixed },
    options?: Options
  ): { [string]: mixed };
  declare export function depascalizeKeys(
    { +[string]: mixed },
    options?: Options
  ): { [string]: mixed };

  declare export default {|
    camelize: typeof camelize,
    pascalize: typeof pascalize,
    decamelize: typeof decamelize,
    depascalize: typeof depascalize,
    camelizeKeys: typeof camelizeKeys,
    pascalizeKeys: typeof pascalizeKeys,
    decamelizeKeys: typeof decamelizeKeys,
    depascalizeKeys: typeof depascalizeKeys
  |};
}
