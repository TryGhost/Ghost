import {ZipArchive, type Archiver} from 'archiver';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';

/**
 * The components a sync site export can contain, in the order they are written
 * to the zip. `media` is deliberately absent: media is the component that needs
 * background jobs and email delivery, so it is only available through a host
 * archive webhook — never through this synchronous bundle.
 */
export const EXPORT_COMPONENTS = ['content', 'members', 'analytics', 'themes', 'routes'] as const;

export type ExportComponent = typeof EXPORT_COMPONENTS[number];

type ComponentStatus = 'ok' | 'failed';

export interface SiteExporterDeps {
    /** Full site JSON in the same shape the `/db/` download produces. */
    exportContent(): Promise<unknown>;
    /** Members CSV as a text stream (rows already serialized). */
    exportMembersCSV(): Promise<NodeJS.ReadableStream>;
    /** Post analytics CSV as a text stream (rows already serialized). */
    exportPostAnalyticsCSV(): Promise<NodeJS.ReadableStream>;
    /** Names of all installed themes. */
    listThemes(): string[];
    /** A single theme, zipped — the same artifact the theme download endpoint serves. */
    zipTheme(name: string): Promise<Buffer>;
    /** The raw routes.yaml source. */
    exportRoutesYaml(): Promise<string>;
    /** The redirects config serialized to yaml. */
    exportRedirectsYaml(): Promise<string>;
}

/**
 * Composes a full site export zip from the same services the individual export
 * endpoints call — content JSON, members CSV, post analytics CSV, themes,
 * routes and redirects. No HTTP self-calls, no background jobs: the zip is
 * streamed while it is being built.
 *
 * A component that fails before its data is acquired is skipped rather than
 * failing the request — the response headers are typically already sent, so a
 * mid-flight HTTP error is impossible. `export-report.json` records what made
 * it into the bundle and what did not.
 */
export class SiteExporter {
    #deps: SiteExporterDeps;

    constructor(deps: SiteExporterDeps) {
        this.#deps = deps;
    }

    /**
     * Builds a zip stream containing the selected components. Entries are
     * appended asynchronously; the caller pipes the returned archive to the
     * response while it fills. STORE (no compression) keeps CPU low and
     * time-to-first-byte short — theme zips are already compressed and the
     * JSON/CSV entries are not worth stalling the stream for.
     */
    createArchive(components: ExportComponent[]): Archiver {
        const archive = new ZipArchive({store: true});

        this.#populate(archive, new Set(components)).catch((err) => {
            archive.destroy(err instanceof Error ? err : new errors.InternalServerError({message: String(err)}));
        });

        return archive;
    }

    async #populate(archive: Archiver, components: Set<ExportComponent>): Promise<void> {
        const report: {exported_on: string; components: Partial<Record<ExportComponent, ComponentStatus>>} = {
            exported_on: new Date().toISOString(),
            components: {}
        };

        for (const component of EXPORT_COMPONENTS) {
            if (!components.has(component)) {
                continue;
            }

            try {
                await this.#appendComponent(archive, component);
                report.components[component] = 'ok';
            } catch (err) {
                logging.error(new errors.InternalServerError({
                    message: `Site export: the ${component} component failed and was skipped`,
                    err: err instanceof Error ? err : undefined
                }));
                report.components[component] = 'failed';
            }
        }

        archive.append(JSON.stringify(report, null, 4), {name: 'export-report.json'});

        await archive.finalize();
    }

    async #appendComponent(archive: Archiver, component: ExportComponent): Promise<void> {
        switch (component) {
        case 'content': {
            const data = await this.#deps.exportContent();
            archive.append(JSON.stringify(data), {name: 'export.json'});
            break;
        }
        case 'members':
            archive.append(await this.#deps.exportMembersCSV(), {name: 'members.csv'});
            break;
        case 'analytics':
            archive.append(await this.#deps.exportPostAnalyticsCSV(), {name: 'post-analytics.csv'});
            break;
        case 'themes':
            await this.#appendThemes(archive);
            break;
        case 'routes': {
            archive.append(await this.#deps.exportRoutesYaml(), {name: 'routes.yaml'});
            archive.append(await this.#deps.exportRedirectsYaml(), {name: 'redirects.yaml'});
            break;
        }
        }
    }

    /**
     * Themes are appended as one nested zip per theme — the exact artifact the
     * theme upload UI restores from. A theme that fails to zip is skipped so
     * the remaining themes still make it into the bundle; any failure marks
     * the whole component failed in the report.
     */
    async #appendThemes(archive: Archiver): Promise<void> {
        let failed = 0;

        for (const name of this.#deps.listThemes()) {
            try {
                archive.append(await this.#deps.zipTheme(name), {name: `themes/${name}.zip`});
            } catch (err) {
                failed += 1;
                logging.error(new errors.InternalServerError({
                    message: `Site export: the ${name} theme failed to zip and was skipped`,
                    err: err instanceof Error ? err : undefined
                }));
            }
        }

        if (failed > 0) {
            throw new errors.InternalServerError({message: `${failed} theme(s) could not be zipped`});
        }
    }
}
