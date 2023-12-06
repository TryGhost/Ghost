import {Entity} from '../../common/base/entity.base';

type SnippetData = {
    name: string;
    lexical?: string;
    mobiledoc?: string;
};

export class Snippet extends Entity<SnippetData> implements SnippetData {
    get name() {
        return this.attr.name;
    }

    set name(value) {
        this.set('name', value);
    }

    get lexical() {
        return this.attr.lexical;
    }

    set lexical(value) {
        this.set('lexical', value);
    }

    get mobiledoc() {
        return this.attr.mobiledoc;
    }

    set mobiledoc(value) {
        this.set('mobiledoc', value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(data: any) {
        return new Snippet(data);
    }
}
