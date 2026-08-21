import { ZipArchive, type Archiver } from 'archiver';
import * as errors from '@tryghost/errors';
import logging from '@tryghost/logging';

/**
 * The components a sync site export can contain, in zip-entry order. The
 * streaming CSVs come first so their DB connections release while the
 * (buffered) content JSON is still being built. `media` is deliberately
 * absent: it needs background jobs and email delivery, so it is only
 * available through a host archive webhook.
 */
export const EXPORT_COMPONENTS = ['members', 'analytics', 'content', 'themes', 'routes'] as const;

export type ExportComponent = (typeof EXPORT_COMPONENTS)[number];

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
   * download endpoint serves. The exporter calls `cleanup` once the
   * archive is closed.
   */
  zipTheme(name: string): Promise<{ zipPath: string; cleanup(): Promise<void> }>;
  /** The raw routes.yaml source. */
  exportRoutesYaml(): Promise<string>;
  /** The redirects config serialized to yaml. */
  exportRedirectsYaml(): Promise<string>;
}

/**
 * Composes a site export zip from the same services the individual export
 * endpoints call, streamed while it is being built. A component that fails
 * to acquire is skipped and logged rather than failing the request: the
 * response headers are typically already sent, so a mid-flight HTTP error
 * is impossible and a bundle missing one piece beats a broken download.
 */
export class SiteExporter {
  #deps: SiteExporterDeps;

  constructor(deps: SiteExporterDeps) {
    this.#deps = deps;
  }

  /**
   * Builds a zip stream of the selected components; the caller pipes it to
   * the response while it fills. Deflate-compressed — the nested theme zips
   * opt out per-entry since they are already compressed.
   */
  createArchive(components: ExportComponent[]): Archiver {
    const archive = new ZipArchive();
    const cleanups: Array<() => Promise<void>> = [];

    // 'close' fires on normal end and on destroy (client disconnect),
    // so temp files are removed on every path
    archive.once('close', () => {
      for (const cleanup of cleanups) {
        cleanup().catch(() => {});
      }
    });

    this.#populate(archive, new Set(components), cleanups).catch((err) => {
      archive.destroy(
        err instanceof Error ? err : new errors.InternalServerError({ message: String(err) }),
      );
    });

    return archive;
  }

  async #populate(
    archive: Archiver,
    components: Set<ExportComponent>,
    cleanups: Array<() => Promise<void>>,
  ): Promise<void> {
    for (const component of EXPORT_COMPONENTS) {
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

  async #appendComponent(
    archive: Archiver,
    component: ExportComponent,
    cleanups: Array<() => Promise<void>>,
  ): Promise<void> {
    try {
      switch (component) {
        case 'content': {
          const data = await this.#deps.exportContent();
          archive.append(JSON.stringify(data), { name: 'export.json' });
          break;
        }
        case 'members':
          this.#appendStream(archive, await this.#deps.exportMembersCSV(), 'members.csv');
          break;
        case 'analytics':
          this.#appendStream(
            archive,
            await this.#deps.exportPostAnalyticsCSV(),
            'post-analytics.csv',
          );
          break;
        case 'themes':
          await this.#appendThemes(archive, cleanups);
          break;
        case 'routes':
          await this.#appendYamlFiles(archive);
          break;
      }
    } catch (err) {
      logging.error(
        new errors.InternalServerError({
          message: `Site export: the ${component} component failed and was skipped`,
          err: err instanceof Error ? err : undefined,
        }),
      );
    }
  }

  /**
   * Ties a streaming entry's lifecycle to the archive in both directions:
   * a source error destroys the archive — archiver wraps sources with
   * `.pipe()`, which never propagates errors, so the response would
   * otherwise hang forever — and a closed archive destroys the source, so
   * a paused row stream releases its DB connection.
   */
  #appendStream(archive: Archiver, source: NodeJS.ReadableStream, name: string): void {
    const destroyable = source as NodeJS.ReadableStream & { destroy?: () => void };

    // Closed while the source was being acquired — a 'close' listener
    // registered now would never fire
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

    archive.append(source, { name });
  }

  /**
   * One nested zip per theme — the exact artifact the theme upload UI
   * restores from — staged as temp files and streamed off disk rather than
   * buffered. A theme that fails to zip is skipped so the rest still make
   * it into the bundle.
   */
  async #appendThemes(archive: Archiver, cleanups: Array<() => Promise<void>>): Promise<void> {
    for (const name of this.#deps.listThemes()) {
      if (archive.destroyed) {
        return;
      }

      try {
        const { zipPath, cleanup } = await this.#deps.zipTheme(name);

        // Closed while this theme was zipping — the close handler has
        // already run the cleanups, so remove the temp file directly
        if (archive.destroyed) {
          cleanup().catch(() => {});
          return;
        }

        cleanups.push(cleanup);
        archive.file(zipPath, { name: `themes/${name}.zip`, store: true });
      } catch (err) {
        logging.error(
          new errors.InternalServerError({
            message: `Site export: the ${name} theme failed to zip and was skipped`,
            err: err instanceof Error ? err : undefined,
          }),
        );
      }
    }
  }

  async #appendYamlFiles(archive: Archiver): Promise<void> {
    const files: Array<[string, () => Promise<string>]> = [
      ['routes.yaml', () => this.#deps.exportRoutesYaml()],
      ['redirects.yaml', () => this.#deps.exportRedirectsYaml()],
    ];

    for (const [filename, getContents] of files) {
      try {
        archive.append(await getContents(), { name: filename });
      } catch (err) {
        logging.error(
          new errors.InternalServerError({
            message: `Site export: ${filename} failed and was skipped`,
            err: err instanceof Error ? err : undefined,
          }),
        );
      }
    }
  }
}
