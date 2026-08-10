import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";

/** Ghost Admin API member-label resource. */
export interface Label {
    id: string;
    name: string;
    slug: string;
    created_at: string;
    updated_at: string;
    count?: {
        members: number;
    };
}

export const label = createBuilder<Label>(() => {
    const now = new Date().toISOString();
    const name = `${faker.word.adjective()} ${faker.word.noun()}`;

    return {
        id: generateId(),
        name,
        slug: `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        created_at: now,
        updated_at: now
    };
});
