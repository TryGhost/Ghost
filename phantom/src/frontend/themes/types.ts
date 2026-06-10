import type {TemplateDelegate} from 'handlebars';

export type ThemeManifest = {
    name: string;
    version: string | null;
    config: Record<string, unknown>;
    templates: string[];
    customTemplates: string[];
    partials: string[];
    layouts: Record<string, string | null>;
};

export type ThemeBundle = {
    templates: Record<string, TemplateDelegate>;
    partials: Record<string, TemplateDelegate>;
    theme: ThemeManifest;
};
