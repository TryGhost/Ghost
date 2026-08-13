import {ZipArchive, type Archiver} from 'archiver';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';

/**
 * The components a sync site export can contain, in the order they are written
 * to the zip. The streaming CSV components come first so their database
 * connections drain and release while the (buffered) content JSON is still
 * being built. `media` is deliberately absent: media is the component that
 * needs background jobs and email delivery, so it is only available through a
 * host archive webhook — never through this synchronous bundle.
 */
export const EXPORT_COMPONENTS = ['members', 'analytics', 'content', 'themes', 'routes'] as const;

export type ExportComponent = typeof EXPORT_COMPONENTS[number];

export interface SiteExporterDeps {
    /** Full site JSON in the same shape the `/db/` download produces. */
    exportContent(): Promise<unknown>;
    /** Members CSV as a text stream (rows already serialized). */
    exportMembersCSV(): Promise<NodeJS.ReadableStream>;
    /** Post analytics CSV as a text stream (rows already serialized). */
    exportPostAnalyticsCSV(): Promise<NodeJS.ReadableStream>;
    /** Names of all installed themes. */
    listThemes(): string[];
    /**
     * A single theme zipped to a temp file — the same artifact the theme
     * download endpoint serves. `cleanup` removes the temp file; the exporter
     * calls it once the archive is closed.
     */
    zipTheme(name: string): Promise<{zipPath: string; cleanup(): Promise<void>}>;
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
 * A component that fails before its data is acquired is skipped (and logged)
 * rather than failing the request — the response headers are typically already
 * sent, so a mid-flight HTTP error is impossible and a bundle missing one
 * piece beats a broken download.
 */
export class SiteExporter {
    #deps: SiteExporterDeps;

    constructor(deps: SiteExporterDeps) {
        this.#deps = deps;
    }

    /**
     * Builds a zip stream containing the selected components. Entries are
     * appended asynchronously; the caller pipes the returned archive to the
     * response while it fills. The archive is deflate-compressed (the JSON
     * and CSV entries compress well); the nested theme zips opt out per-entry
     * since they are already compressed.
     */
    createArchive(components: ExportComponent[]): Archiver {
        const archive = new ZipArchive();
        const cleanups: Array<() => Promise<void>> = [];

        // 'close' fires both after the archive ends normally and when it is
        // destroyed (e.g. the client disconnected), so temp files are removed
        // on every path.
        archive.once('close', () => {
            for (const cleanup of cleanups) {
                cleanup().catch(() => {});
            }
        });

        this.#populate(archive, new Set(components), cleanups).catch((err) => {
            archive.destroy(err instanceof Error ? err : new errors.InternalServerError({message: String(err)}));
        });

        return archive;
    }

    async #populate(archive: Archiver, components: Set<ExportComponent>, cleanups: Array<() => Promise<void>>): Promise<void> {
        for (const component of EXPORT_COMPONENTS) {
            // Stop composing when the archive is gone — the client hung up
            if (archive.destroyed) {
                return;
            }

            if (!components.has(component)) {
                continue;
            }

            await this.#appendComponent(archive, component, cleanups);
        }

        if (archive.destroyed) {
            return;
        }

        await archive.finalize();
    }

    /**
     * A failure while acquiring a component's data skips that component; for
     * the streaming CSV entries, a failure while the rows are still flowing
     * happens after this returns and instead tears the whole download down
     * (see `#appendStream`).
     */
    async #appendComponent(archive: Archiver, component: ExportComponent, cleanups: Array<() => Promise<void>>): Promise<void> {
        try {
            switch (component) {
            case 'content': {
                const data = await this.#deps.exportContent();
                archive.append(JSON.stringify(data), {name: 'export.json'});
                break;
            }
            case 'members':
                this.#appendStream(archive, await this.#deps.exportMembersCSV(), 'members.csv');
                break;
            case 'analytics':
                this.#appendStream(archive, await this.#deps.exportPostAnalyticsCSV(), 'post-analytics.csv');
                break;
            case 'themes':
                await this.#appendThemes(archive, cleanups);
                break;
            case 'routes':
                await this.#appendYamlFiles(archive);
                break;
            }
        } catch (err) {
            logging.error(new errors.InternalServerError({
                message: `Site export: the ${component} component failed and was skipped`,
                err: err instanceof Error ? err : undefined
            }));
        }
    }

    /**
     * Appends a streaming entry with its lifecycle tied to the archive, in
     * both directions:
     *
     * - source error → archive destroyed. archiver wraps sources with
     *   `.pipe()`, which never propagates errors — without this the response
     *   would hang forever on e.g. a dropped database connection, instead of
     *   failing the download.
     * - archive closed (finished or client hung up) → source destroyed, so a
     *   paused row stream releases its database connection instead of
     *   holding it for as long as the client takes to download.
     */
    #appendStream(archive: Archiver, source: NodeJS.ReadableStream, name: string): void {
        const destroyable = source as NodeJS.ReadableStream & {destroy?: () => void};

        // The archive can close while the source was still being acquired —
        // a 'close' listener registered now would never fire, so release the
        // source straight away instead of appending it
        if (archive.destroyed) {
            destroyable.destroy?.();
            return;
        }

        source.on('error', (err: Error) => {
            archive.destroy(err);
        });

        archive.once('close', () => {
            destroyable.destroy?.();
        });

        archive.append(source, {name});
    }

    /**
     * Themes are appended as one nested zip per theme — the exact artifact the
     * theme upload UI restores from. The zips are staged as temp files and
     * streamed off disk (`archive.file`) rather than buffered, so a site with
     * many large themes doesn't hold them all in memory. A theme that fails to
     * zip is skipped so the remaining themes still make it into the bundle.
     */
    async #appendThemes(archive: Archiver, cleanups: Array<() => Promise<void>>): Promise<void> {
        for (const name of this.#deps.listThemes()) {
            if (archive.destroyed) {
                return;
            }

            try {
                const {zipPath, cleanup} = await this.#deps.zipTheme(name);

                // The archive can close while the theme was still zipping —
                // its 'close' handler has already run the cleanups, so a
                // cleanup registered now would leak the temp file. Remove it
                // straight away and stop staging.
                if (archive.destroyed) {
                    cleanup().catch(() => {});
                    return;
                }

                cleanups.push(cleanup);
                archive.file(zipPath, {name: `themes/${name}.zip`, store: true});
            } catch (err) {
                logging.error(new errors.InternalServerError({
                    message: `Site export: the ${name} theme failed to zip and was skipped`,
                    err: err instanceof Error ? err : undefined
                }));
            }
        }
    }

    async #appendYamlFiles(archive: Archiver): Promise<void> {
        const files: Array<[string, () => Promise<string>]> = [
            ['routes.yaml', () => this.#deps.exportRoutesYaml()],
            ['redirects.yaml', () => this.#deps.exportRedirectsYaml()]
        ];

        for (const [filename, getContents] of files) {
            try {
                archive.append(await getContents(), {name: filename});
            } catch (err) {
                logging.error(new errors.InternalServerError({
                    message: `Site export: ${filename} failed and was skipped`,
                    err: err instanceof Error ? err : undefined
                }));
            }
        }
    }
}
