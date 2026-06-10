import Handlebars from 'handlebars';
import {registerHelpers} from './helpers.js';
import type {ThemeBundle} from '../themes/types.js';

type RenderOptions = {
    template: string;
    data: Record<string, unknown>;
};

const buildTemplate = (
    instance: typeof Handlebars,
    bundle: ThemeBundle,
    templateName: string,
    data: Record<string, unknown>
) => {
    const template = bundle.templates[templateName];
    if (!template) {
        throw new Error(`Missing template: ${templateName}`);
    }

    const layoutName = bundle.theme.layouts[templateName];
    const templateData = {
        root: data,
        site: data.site,
        custom: data.custom,
        member: data.member,
        context: data.context
    };
    const body = template(data, {data: templateData});
    if (!layoutName) {
        return body;
    }

    const layout = bundle.templates[layoutName];
    if (!layout) {
        throw new Error(`Missing layout template: ${layoutName}`);
    }

    return layout({
        ...data,
        body
    }, {data: templateData});
};

export const createRenderer = () => {
    const registerBundle = (bundle: ThemeBundle) => {
        for (const [name, partial] of Object.entries(bundle.partials)) {
            Handlebars.registerPartial(name, partial);
        }
    };

    const render = ({template, data}: RenderOptions, bundle: ThemeBundle) => {
        registerHelpers(Handlebars);
        registerBundle(bundle);
        return buildTemplate(Handlebars, bundle, template, data);
    };

    return {render};
};
