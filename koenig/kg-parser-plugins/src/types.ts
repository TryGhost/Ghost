export interface CardSection {
    type: string;
    name: string;
    payload: Record<string, unknown>;
}

export interface Atom {
    name: string;
    type: string;
    value: string;
    payload: Record<string, unknown>;
}

export interface Builder {
    createCardSection(name: string, payload?: Record<string, unknown>): CardSection;
    createAtom(name: string): Atom;
}

export interface PluginOptions {
    addSection: (section: CardSection) => void;
    nodeFinished: () => void;
    addMarkerable: (atom: Atom) => void;
}

export type ParserPlugin = (node: Node, builder: Builder, options: PluginOptions) => void;

export interface ParserPluginOptions {
    createDocument?: (html: string) => Document;
    cleanBasicHtml?: (html: string) => string | null;
}
