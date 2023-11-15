import ObjectID from 'bson-objectid';

export class Snippet {
    constructor(
        public readonly id: ObjectID,
        public name: string,
        public mobiledoc: string,
        public lexical: string,
        public readonly createdAt: Date | null,
        public readonly createdBy: ObjectID | null,
        public readonly updatedAt: Date | null,
        public readonly updatedBy: ObjectID | null
    ) {}

    toJSON() {
        return {
            id: this.id.toHexString(),
            name: this.name,
            mobiledoc: this.mobiledoc,
            lexical: this.lexical,
            createdAt: this.createdAt,
            createdBy: this.createdBy,
            updatedAt: this.updatedAt,
            updatedBy: this.updatedBy
        };
    }
}
