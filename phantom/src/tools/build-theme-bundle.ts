import {promises as fs} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import handlebars from 'handlebars';

type ThemeBundle = {
    name: string;
    version: string | null;
    config: Record<string, unknown>;
    templates: string[];
    customTemplates: string[];
    partials: string[];
    layouts: Record<string, string | null>;
};

const TEMPLATE_EXTENSION = '.hbs';

const toPosixPath = (value: string) => value.split(path.sep).join('/');

const getArg = (flag: string) => {
    const index = process.argv.indexOf(flag);
    if (index === -1) {
        return null;
    }
    return process.argv[index + 1] ?? null;
};

const walkFiles = async (root: string): Promise<string[]> => {
    const entries = await fs.readdir(root, {withFileTypes: true});
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walkFiles(entryPath));
            continue;
        }
        files.push(entryPath);
    }

    return files;
};

const loadPackageJson = async (themeRoot: string) => {
    const packagePath = path.join(themeRoot, 'package.json');
    try {
        const raw = await fs.readFile(packagePath, 'utf8');
        return JSON.parse(raw) as {name?: string; version?: string; config?: Record<string, unknown>};
    } catch {
        return {};
    }
};

const buildBundle = async (themeRoot: string) => {
    const packageJson = await loadPackageJson(themeRoot);
    const files = await walkFiles(themeRoot);
    const templateFiles = files.filter((file) => path.extname(file) === TEMPLATE_EXTENSION);

    const templates: Record<string, string> = {};
    const partials: Record<string, string> = {};
    const layouts: Record<string, string | null> = {};

    for (const filePath of templateFiles) {
        const relativePath = path.relative(themeRoot, filePath);
        const source = await fs.readFile(filePath, 'utf8');
        const layoutMatch = source.match(/\{\{!<\s*([^}\s]+)\s*\}\}/);
        const layout = layoutMatch?.[1] ?? null;
        const precompiled = handlebars.precompile(source, {preventIndent: true}) as unknown as string;

        if (relativePath.startsWith(`partials${path.sep}`)) {
            const partialName = toPosixPath(relativePath.replace(/^partials[\/]/, '').replace(TEMPLATE_EXTENSION, ''));
            partials[partialName] = precompiled;
            continue;
        }

        const templateName = path.basename(relativePath, TEMPLATE_EXTENSION);
        templates[templateName] = precompiled;
        layouts[templateName] = layout;
    }

    const templateNames = Object.keys(templates).sort();
    const partialNames = Object.keys(partials).sort();

    const theme: ThemeBundle = {
        name: packageJson.name ?? path.basename(themeRoot),
        version: packageJson.version ?? null,
        config: packageJson.config ?? {},
        templates: templateNames,
        customTemplates: templateNames.filter((name) => name.startsWith('custom-')),
        partials: partialNames,
        layouts
    };

    return {templates, partials, theme};
};

const renderModule = (bundle: {templates: Record<string, string>; partials: Record<string, string>; theme: ThemeBundle}) => {
    const templateEntries = Object.entries(bundle.templates)
        .map(([name, compiled]) => `    ${JSON.stringify(name)}: Handlebars.template(${compiled})`)
        .join(',\n');
    const partialEntries = Object.entries(bundle.partials)
        .map(([name, compiled]) => `    ${JSON.stringify(name)}: Handlebars.template(${compiled})`)
        .join(',\n');

    return `import Handlebars from 'handlebars';

export const templates = {\n${templateEntries}\n};
export const partials = {\n${partialEntries}\n};
export const theme = ${JSON.stringify(bundle.theme, null, 4)};

export default {templates, partials, theme};
`;
};

const run = async () => {
    const themeRoot = getArg('--theme')
        ?? path.resolve('..', 'ghost', 'core', 'content', 'themes', 'source');
    const outputPath = getArg('--out')
        ?? path.resolve('content', 'themes', 'source', 'bundle.mjs');

    const bundle = await buildBundle(themeRoot);
    const moduleSource = renderModule(bundle);
    await fs.mkdir(path.dirname(outputPath), {recursive: true});
    await fs.writeFile(outputPath, moduleSource, 'utf8');

    const summary = {
        theme: bundle.theme.name,
        templates: bundle.theme.templates.length,
        partials: bundle.theme.partials.length,
        output: outputPath
    };

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
};

run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
