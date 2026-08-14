/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The `locals._templateOptions` contract — the ONE module that owns the key
 * and its accessors. Both the engine (express-hbs's renderTemplate reads the
 * per-request options off the render locals) and the rendering pipeline
 * (update-local-template-options middleware port, format-response) go through
 * these; renaming the key here is the only way to rename it anywhere.
 *
 * from express-hbs lib/hbs.js:getLocalTemplateOptions /
 * updateLocalTemplateOptions @ 2.5.0.
 */

export type LocalTemplateOptions = Record<string, unknown>;

export function getLocalTemplateOptions(locals: Record<string, any>): LocalTemplateOptions {
    return (locals._templateOptions as LocalTemplateOptions | undefined) || {};
}

export function updateLocalTemplateOptions(locals: Record<string, any>, templateOptions: LocalTemplateOptions | undefined): void {
    locals._templateOptions = templateOptions;
}
