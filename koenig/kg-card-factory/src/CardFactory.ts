export interface FactoryOptions {
    siteUrl?: string;
    [key: string]: unknown;
}

export interface CardPayload {
    [key: string]: unknown;
}

export interface CardTransformOptions {
    assetsOnly?: boolean;
    siteUrl?: string;
    [key: string]: unknown;
}

export interface DomNode {
    nodeType?: number;
    nodeValue?: string;
    appendChild?(child: unknown): void;
    [key: string]: unknown;
}

export interface DomProvider {
    createComment(text: string): DomNode;
    createDocumentFragment(): DomNode;
    createElement?(tag: string): DomNode;
    createTextNode?(text: string): DomNode;
    [key: string]: unknown;
}

export interface CardRenderEnv {
    dom: DomProvider;
    [key: string]: unknown;
}

export interface CardRenderArgs {
    env: CardRenderEnv;
    payload: CardPayload;
    options?: Record<string, unknown>;
}

export interface CardDefinition {
    name: string;
    type: string;
    config?: { commentWrapper?: boolean };
    render(args: CardRenderArgs): DomNode;
    absoluteToRelative?(payload: CardPayload, options: CardTransformOptions): CardPayload;
    relativeToAbsolute?(payload: CardPayload, options: CardTransformOptions): CardPayload;
    toTransformReady?(payload: CardPayload, options: CardTransformOptions): CardPayload;
}

export class CardFactory {
    factoryOptions: FactoryOptions;

    constructor(options: FactoryOptions = {}) {
        this.factoryOptions = options;
    }

    createCard(card: CardDefinition) {
        const {factoryOptions} = this;
        const {name, type, config = {}} = card;

        return {
            name,
            type,
            factoryOptions,

            render({env, payload, options}: CardRenderArgs): DomNode {
                const {dom} = env;
                const cardOptions = Object.assign({}, factoryOptions, options);
                const cardOutput = card.render({env, payload, options: cardOptions});

                if (cardOutput.nodeType === 3 && cardOutput.nodeValue === '') {
                    return cardOutput;
                }

                if (config.commentWrapper) {
                    const cleanName = name.replace(/^card-/, '');
                    const beginComment = dom.createComment(`kg-card-begin: ${cleanName}`);
                    const endComment = dom.createComment(`kg-card-end: ${cleanName}`);
                    const fragment = dom.createDocumentFragment();
                    fragment.appendChild!(beginComment);
                    fragment.appendChild!(cardOutput);
                    fragment.appendChild!(endComment);
                    return fragment;
                }

                return cardOutput;
            },

            absoluteToRelative(payload: CardPayload, _options?: CardTransformOptions) {
                if (card.absoluteToRelative) {
                    const defaultOptions = {assetsOnly: false, siteUrl: factoryOptions.siteUrl};
                    const options = Object.assign({}, defaultOptions, _options);
                    return card.absoluteToRelative(payload, options);
                }
                return payload;
            },

            relativeToAbsolute(payload: CardPayload, _options?: CardTransformOptions) {
                if (card.relativeToAbsolute) {
                    const defaultOptions = {assetsOnly: false, siteUrl: factoryOptions.siteUrl};
                    const options = Object.assign({}, defaultOptions, _options);
                    return card.relativeToAbsolute(payload, options);
                }
                return payload;
            },

            toTransformReady(payload: CardPayload, _options?: CardTransformOptions) {
                if (card.toTransformReady) {
                    const defaultOptions = {assetsOnly: false, siteUrl: factoryOptions.siteUrl};
                    const options = Object.assign({}, defaultOptions, _options);
                    return card.toTransformReady(payload, options);
                }
                return payload;
            }
        };
    }
}
