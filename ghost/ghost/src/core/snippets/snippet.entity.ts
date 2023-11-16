import {SerializedLexicalNode} from 'lexical';
import {Entity} from '../../common/entity';

type SnippetContent = {
    namespace: 'KoenigEditor',
    nodes: SerializedLexicalNode
};

type SnippetData = {
    readonly name: string;
    lexical: SnippetContent;
};

export class Snippet extends Entity<SnippetData> implements SnippetData {
    get name() {
        return this.attr.name;
    }

    get lexical() {
        return this.attr.lexical;
    }

    set lexical(value) {
        this.set('lexical', value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(data: any) {
        return new Snippet(data);
    }
}
