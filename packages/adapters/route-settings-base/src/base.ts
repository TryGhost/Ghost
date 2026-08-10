export type DataShortFormResource = 'tag' | 'page' | 'post' | 'author';
export type DataLongFormResource = 'tags' | 'posts' | 'pages' | 'authors';

export type DataShortForm = `${DataShortFormResource}.${string}`;

export interface DataReadEntry {
    type: 'read';
    resource: DataLongFormResource;
    slug: string;
    redirect?: boolean;
    include?: string;
    visibility?: string;
    status?: string;
}

export interface DataBrowseEntry {
    type: 'browse';
    resource: DataLongFormResource;
    filter?: string;
    limit?: number | 'all';
    order?: string;
    include?: string;
    fields?: string;
    visibility?: string;
    status?: string;
    page?: number;
}

export type DataLongFormEntry = DataReadEntry | DataBrowseEntry;
export type DataEntry = DataShortForm | DataLongFormEntry;
export type RouteData = DataShortForm | Record<string, DataEntry>;

interface RouteBase {
    path: string;
    templates?: string[];
    data?: RouteData;
}

export interface ChannelRoute extends RouteBase {
    type: 'channel';
    filter?: string;
    order?: string;
    limit?: number | 'all';
    rss?: boolean;
}

export interface TemplateRoute extends RouteBase {
    type: 'template';
    contentType?: string;
}

export type Route = ChannelRoute | TemplateRoute;

export interface CollectionConfig {
    path: string;
    permalink: string;
    templates?: string[];
    filter?: string;
    order?: string;
    limit?: number | 'all';
    rss?: boolean;
    data?: RouteData;
}

export interface TaxonomyConfig {
    tag?: string;
    author?: string;
}

export interface RouteSettings {
    routes: Route[];
    collections: CollectionConfig[];
    taxonomies: TaxonomyConfig;
    /**
     * The verbatim YAML this model was parsed from. Stores persist it as-is —
     * structural edits made without regenerating the source are not reflected
     * in what a store persists.
     */
    readonly yamlSource: string;
}

/**
 * Concurrent `replace` calls have no ordering guarantee — serialize
 * externally if that matters.
 */
export interface RouteSettingsStore {
    get(): Promise<RouteSettings>;
    replace(settings: RouteSettings): Promise<void>;
}

export abstract class RouteSettingsStoreBase implements RouteSettingsStore {
    declare readonly requiredFns: readonly ['get', 'replace'];

    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: Object.freeze(['get', 'replace']),
            writable: false,
        });
    }

    abstract get(): Promise<RouteSettings>;
    abstract replace(settings: RouteSettings): Promise<void>;
}
