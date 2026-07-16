import {KoenigDecoratorNode} from './KoenigDecoratorNode.js';
import type {ExportDOMOptions, ExportDOMOutput} from './export-dom.js';
import readTextContent from './utils/read-text-content.js';
import {buildDefaultVisibility, isVisibilityRestricted, migrateOldVisibilityFormat} from './utils/visibility.js';
import type {LexicalEditor, SerializedLexicalNode} from 'lexical';
import type {Visibility} from './utils/visibility.js';

type RenderFn<TNode = unknown, TOutput extends ExportDOMOutput = ExportDOMOutput> = {
    bivarianceHack(node: TNode, options: ExportDOMOptions): TOutput;
}['bivarianceHack'];
type VersionedRenderFn<TNode = unknown, TOutput extends ExportDOMOutput = ExportDOMOutput> = Record<string | number, RenderFn<TNode, TOutput>>;
type WidenLiteral<T> =
    T extends string ? string :
    T extends number ? number :
    T extends boolean ? boolean :
    T extends readonly (infer U)[] ? U[] :
    T;
/**
 * Validates the required arguments passed to `generateDecoratorNode`
*/
function validateArguments(nodeType: string, properties: readonly DecoratorNodeProperty[]) {
    /* c8 ignore start */
    if (!nodeType) {
        throw new Error('[generateDecoratorNode] A unique "nodeType" should be provided');
    }

    properties.forEach((prop: DecoratorNodeProperty) => {
        if (!('name' in prop) || !('default' in prop)){
            throw new Error('[generateDecoratorNode] Properties should have both "name" and "default" attributes.');
        }

        if (prop.urlType && !['url', 'html', 'markdown'].includes(prop.urlType)) {
            throw new Error('[generateDecoratorNode] "urlType" should be either "url", "html" or "markdown"');
        }

        if ('wordCount' in prop && typeof prop.wordCount !== 'boolean') {
            throw new Error('[generateDecoratorNode] "wordCount" should be of boolean type.');
        }
    });
    /* c8 ignore stop */
}

/**
 * @typedef {Object} DecoratorNodeProperty
 * @property {string} name - The property's name.
 * @property {*} default - The property's default value
 * @property {('url'|'html'|'markdown'|null)} urlType - If the property contains a URL, the URL's type: 'url', 'html' or 'markdown'. Use 'url' is the property contains only a URL, 'html' or 'markdown' if the property contains HTML or markdown code, that may contain URLs.
 * @property {boolean} wordCount - Whether the property should be counted in the word count
 *
 * @param {string} nodeType – The node's type (must be unique)
 * @param {DecoratorNodeProperty[]} properties - An array of properties for the generated class
 * @param {boolean} hasVisibility - Whether to add a visibility property to the node
 * @param {Function} defaultRenderFn - A function that returns a @tryghost/kg-lexical-html-renderer compatible object, e.g. {element: Div, type: 'inner}
 * @returns {Object} - The generated class.
 */
export interface DecoratorNodeProperty<Name extends string = string, Default = unknown> {
    name: Name;
    default: Default;
    urlType?: string;
    urlPath?: string;
    wordCount?: boolean;
    privateName?: string;
}

export type DecoratorNodeValueMap<Props extends readonly DecoratorNodeProperty[], HasVisibility extends boolean = false> = {
    [Prop in Props[number] as Prop['name']]: WidenLiteral<Prop['default']>;
} & (HasVisibility extends true ? {visibility: Visibility} : unknown);

export type DecoratorNodeData<Props extends readonly DecoratorNodeProperty[], HasVisibility extends boolean = false> = Partial<DecoratorNodeValueMap<Props, HasVisibility>>;

type GeneratedDecoratorNodeInstance<TDataset extends Record<string, unknown>, TOutput extends ExportDOMOutput = ExportDOMOutput> = GeneratedDecoratorNodeBase<TDataset> & TDataset & {
    exportDOM(editor: LexicalEditor, options?: ExportDOMOptions): TOutput;
};

// An intersection rather than Lexical's `Spread` utility: `Spread` isn't provably
// assignable to `SerializedLexicalNode` when TDataset is an unresolved generic, which
// breaks the `exportJSON` override inside `generateDecoratorNode`. The trade-off is
// that a dataset property colliding with `type`/`version` at an incompatible type
// produces `never` — keep such properties compatible (e.g. HeaderNode's `version: number`).
export type SerializedGeneratedDecoratorNode<TDataset extends Record<string, unknown> = Record<string, unknown>> = SerializedLexicalNode & TDataset;

export interface GeneratedDecoratorNodeClass<TDataset extends Record<string, unknown>, TOutput extends ExportDOMOutput = ExportDOMOutput> {
    new (data?: Partial<TDataset>, key?: string): GeneratedDecoratorNodeInstance<TDataset, TOutput>;
    prototype: GeneratedDecoratorNodeInstance<TDataset, TOutput>;
    getType(): string;
    clone(node: GeneratedDecoratorNodeInstance<TDataset, TOutput>): GeneratedDecoratorNodeInstance<TDataset, TOutput>;
    transform(): null;
    getPropertyDefaults(): TDataset;
    readonly urlTransformMap: Record<string, string | Record<string, string>>;
    importJSON(serializedNode: Record<string, unknown>): GeneratedDecoratorNodeInstance<TDataset, TOutput>;
}

// Type-only base class used as the return type of generateDecoratorNode.
// This ensures TypeScript recognizes generated nodes as LexicalNode subclasses
// while preserving the dynamic property index signature.
export class GeneratedDecoratorNodeBase<TDataset extends Record<string, unknown> = Record<string, unknown>> extends KoenigDecoratorNode {
    [key: string]: unknown;

    constructor(data?: Partial<TDataset>, key?: string) {
        super(key);
    }

    getDataset(): Record<string, unknown> {
        return {};
    }

    exportJSON(): {type: string; version: number; [key: string]: unknown} {
        return {type: '', version: 1};
    }

    static getPropertyDefaults(): Record<string, unknown> {
        return {};
    }

    static get urlTransformMap(): Record<string, string | Record<string, string>> {
        return {};
    }

    static importJSON(_serializedNode: Record<string, unknown>): GeneratedDecoratorNodeBase<Record<string, unknown>> {
        return new GeneratedDecoratorNodeBase();
    }

    static transform() {
        return null;
    }

    isKoenigCard(): true {
        return true;
    }

    hasDynamicData(): boolean {
        return false;
    }

    hasEditMode(): boolean {
        return true;
    }

    getIsVisibilityActive(): boolean {
        return false;
    }
}

export function generateDecoratorNode<
    Props extends readonly DecoratorNodeProperty[] = readonly [],
    HasVisibility extends boolean = false,
    TOutput extends ExportDOMOutput = ExportDOMOutput,
    // When not passed explicitly, TRenderNode is inferred from `defaultRenderFn`'s
    // node parameter — the render fn's declared node type is trusted, not validated
    // against the generated node shape. Pass explicit type arguments (see HeaderNode)
    // to have render fns checked against a known node type.
    TRenderNode = GeneratedDecoratorNodeInstance<DecoratorNodeValueMap<Props, HasVisibility>, TOutput>
>({nodeType, properties, defaultRenderFn, version = 1, hasVisibility}: {
    nodeType: string;
    properties?: Props;
    defaultRenderFn?: RenderFn<TRenderNode, TOutput> | VersionedRenderFn<TRenderNode, TOutput>;
    version?: number;
    hasVisibility?: HasVisibility;
}): GeneratedDecoratorNodeClass<DecoratorNodeValueMap<Props, HasVisibility>, TOutput> {
    type GeneratedDataset = DecoratorNodeValueMap<Props, HasVisibility>;
    type GeneratedRenderFn = RenderFn<TRenderNode, TOutput>;
    type GeneratedVersionedRenderFn = VersionedRenderFn<TRenderNode, TOutput>;

    const nodeProperties = properties ?? [];

    validateArguments(nodeType, nodeProperties);

    // Adds a `privateName` field to the properties for convenience (e.g. `__name`):
    // properties: [{name: 'name', privateName: '__name', type: 'string', default: 'hello'}, {...}]
    const internalProps = nodeProperties.map((prop) => {
        return Object.defineProperties({}, {
            ...Object.getOwnPropertyDescriptors(prop),
            privateName: {
                configurable: true,
                enumerable: true,
                value: `__${prop.name}`,
                writable: true
            }
        }) as DecoratorNodeProperty & {privateName: string};
    });

    // Adds `visibility` property to the properties array if `hasVisibility` is true
    // uses a getter for `default` to avoid problems with mutation of nested objects
    if (hasVisibility) {
        internalProps.push({
            name: 'visibility',
            get default() {
                return buildDefaultVisibility();
            },
            privateName: '__visibility'
        });
    }

    class GeneratedDecoratorNode extends KoenigDecoratorNode {
        [key: string]: unknown;

        constructor(data: Partial<GeneratedDataset> = {}, key?: string) {
            super(key);
            const dataset = data as Record<string, unknown>;
            internalProps.forEach((prop) => {
                if (typeof prop.default === 'boolean') {
                    this[prop.privateName] = dataset[prop.name] ?? prop.default;
                } else {
                    this[prop.privateName] = dataset[prop.name] || prop.default;
                }
            });
        }

        /**
         * Returns the node's unique type
         * @extends DecoratorNode
         * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
         * @returns {string}
         */
        static getType() {
            return nodeType;
        }

        isKoenigCard(): true {
            return true;
        }

        /**
         * Creates a copy of an existing node with all its properties
         * @extends DecoratorNode
         * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
         */
        static clone(node: GeneratedDecoratorNodeInstance<DecoratorNodeValueMap<Props, HasVisibility>, TOutput>) {
            return new this(node.getDataset() as Partial<GeneratedDataset>, node.__key);
        }

        /**
         * Returns default values for any properties, allowing our editor code
         * to detect when a property has been changed
         */
        static getPropertyDefaults() {
            return internalProps.reduce((obj: Record<string, unknown>, prop) => {
                obj[prop.name] = prop.default;
                return obj;
            }, {}) as GeneratedDataset;
        }

        /**
         * Transforms URLs contained in the payload to relative paths (`__GHOST_URL__/relative/path/`),
         * so that URLs to be changed without having to update the database
         * @see https://github.com/TryGhost/SDK/tree/main/packages/url-utils
         */
        static get urlTransformMap() {
            const map: Record<string, string> = {};

            internalProps.forEach((prop) => {
                if (prop.urlType) {
                    if (prop.urlPath) {
                        map[prop.urlPath] = prop.urlType;
                    } else {
                        map[prop.name] = prop.urlType;
                    }
                }
            });

            return map;
        }

        /**
         * Convenience method to get all properties of the node
         * @returns {Object} - The node's properties
         */
        getDataset() {
            const self = this.getLatest();

            const dataset: Record<string, unknown> = {};
            internalProps.forEach((prop) => {
                dataset[prop.name] = self[prop.privateName];
            });

            return dataset;
        }

        /**
         * Converts JSON to a Lexical node
         * @see https://lexical.dev/docs/concepts/serialization#lexicalnodeimportjson
         * @extends DecoratorNode
         * @param {Object} serializedNode - Lexical's representation of the node, in JSON format
         */
        static importJSON(serializedNode: Record<string, unknown>) {
            const data: Record<string, unknown> = {};

            // migrate older nodes that were saved with an earlier version of the visibility format
            serializedNode.visibility = migrateOldVisibilityFormat(serializedNode.visibility as Visibility);

            internalProps.forEach((prop) => {
                data[prop.name] = serializedNode[prop.name];
            });

            return new this(data as Partial<GeneratedDataset>);
        }

        /**
         * Serializes a Lexical node to JSON. The JSON content is then saved to the database.
         * @extends DecoratorNode
         * @see https://lexical.dev/docs/concepts/serialization#lexicalnodeexportjson
         */
        exportJSON(): SerializedGeneratedDecoratorNode<GeneratedDataset> {
            const dataset = {
                type: nodeType,
                version: version,
                ...internalProps.reduce((obj: Record<string, unknown>, prop) => {
                    obj[prop.name] = this[prop.name];
                    return obj;
                }, {})
            } as SerializedGeneratedDecoratorNode<GeneratedDataset>;
            return dataset;
        }

        exportDOM(_editor: LexicalEditor, options: ExportDOMOptions = {}): TOutput {
            // this.__version is used when a node has a version property which
            // means it's set from the serialized version data at runtime
            const nodeVersion = typeof this.__version === 'string' || typeof this.__version === 'number' ? this.__version : version;
            const node = this as unknown as TRenderNode;

            const nodeRenderers = options.nodeRenderers as Record<string, GeneratedRenderFn | GeneratedVersionedRenderFn> | undefined;
            if (nodeRenderers?.[nodeType]) {
                const render = nodeRenderers[nodeType];

                if (typeof render === 'object') {
                    const versionRenderer = render[nodeVersion];
                    if (!versionRenderer) {
                        throw new Error(`[generateDecoratorNode] ${nodeType}: options.nodeRenderers['${nodeType}'] for version ${nodeVersion} is required`);
                    }
                    return versionRenderer(node, options);
                } else {
                    return render(node, options);
                }
            }

            if (typeof defaultRenderFn === 'object') {
                const render = defaultRenderFn[nodeVersion];
                if (!render) {
                    throw new Error(`[generateDecoratorNode] ${nodeType}: "defaultRenderFn" for version ${nodeVersion} is required`);
                }
                return render(node, options);
            }

            if (!defaultRenderFn) {
                throw new Error(`[generateDecoratorNode] ${nodeType}: "defaultRenderFn" is required`);
            }

            return defaultRenderFn(node, options);
        }

        /* c8 ignore start */
        /**
         * Inserts node in the DOM. Required when extending the DecoratorNode.
         * @extends DecoratorNode
         * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
         */
        createDOM() {
            return document.createElement('div');
        }

        /**
         * Required when extending the DecoratorNode
         * @extends DecoratorNode
         * @see https://lexical.dev/docs/concepts/nodes#extending-decoratornode
         */
        updateDOM() {
            return false;
        }

        /**
         * Defines whether a node is a top-level block.
         * @see https://lexical.dev/docs/api/classes/lexical.DecoratorNode#isinline
         */
        isInline() {
            // All our cards are top-level blocks. Override if needed.
            return false;
        }
        /* c8 ignore stop */

        /**
         * Defines whether a node has dynamic data that needs to be fetched from the server when rendering
         */
        hasDynamicData() {
            return false;
        }

        /**
         * Defines whether a node has an edit mode in the editor UI
         */
        hasEditMode() {
            // Most of our cards have an edit mode. Override if needed.
            return true;
        }

        /*
        * Returns the text content of the node, used by the editor to calculate the word count
        * This method filters out properties without `wordCount: true`
        */
        getTextContent() {
            const self = this.getLatest();
            const propertiesWithText = nodeProperties.filter(prop => !!prop.wordCount);

            const text = propertiesWithText.map(
                prop => readTextContent(self, prop.name)
            ).filter(Boolean).join('\n');

            return text ? `${text}\n\n` : '';
        }

        /**
         * Returns true/false for whether the node's visibility property
         * is active or not. Always false if a node has no visibility property
         * @returns {boolean}
         */
        getIsVisibilityActive() {
            if (!internalProps.some(prop => prop.name === 'visibility')) {
                return false;
            }

            const self = this.getLatest();
            const visibility = self.__visibility;

            return isVisibilityRestricted(visibility as Visibility);
        }
    }

    /**
     * Generates getters and setters for each property, following ES6 syntax
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set
     *
     * Example: for a given property 'content', the generated getter and setter will be:
     * get content() {
     *    const self = this.getLatest();
     *    return self.__content;
     * }
     *
     * set content(newVal) {
     *   const writable = this.getWritable();
     *   writable.__content = newVal;
     * }
     *
     * They can be used as `node.content` (getter) and `node.content = 'new value'` (setter)
     */
    internalProps.forEach((prop) => {
        Object.defineProperty(GeneratedDecoratorNode.prototype, prop.name, {
            get: function () {
                const self = this.getLatest();
                return self[prop.privateName];
            },
            set: function (newVal) {
                const writable = this.getWritable();
                writable[prop.privateName] = newVal;
            }
        });
    });

    return GeneratedDecoratorNode as unknown as GeneratedDecoratorNodeClass<DecoratorNodeValueMap<Props, HasVisibility>, TOutput>;
}
