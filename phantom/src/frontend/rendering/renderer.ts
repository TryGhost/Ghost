import Handlebars from 'handlebars';
import {registerHelpers} from './helpers.js';
import type {ThemeBundle} from '../themes/types.js';

type RenderOptions = {
    template: string;
    data: Record<string, unknown>;
};

const buildTemplate = (
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
        page: data.page,
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
    // Helpers are pure functions of the render data; register them once on
    // the shared instance instead of per request.
    registerHelpers(Handlebars);
    let registeredBundleKey: string | null = null;

    const registerBundle = (bundle: ThemeBundle) => {
        const key = `${bundle.theme.name}@${bundle.theme.version ?? 'dev'}`;
        if (registeredBundleKey === key) {
            return;
        }
        for (const [name, partial] of Object.entries(bundle.partials)) {
            Handlebars.registerPartial(name, partial);
        }
        registeredBundleKey = key;
    };

    const render = ({template, data}: RenderOptions, bundle: ThemeBundle) => {
        registerBundle(bundle);
        return buildTemplate(bundle, template, data);
    };

    return {render};
};
