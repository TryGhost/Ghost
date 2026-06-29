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
    rss: boolean;
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
}
