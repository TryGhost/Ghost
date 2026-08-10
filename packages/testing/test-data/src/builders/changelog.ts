import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateSlug} from "../utils";

/**
 * Raw entry shape from the ghost.org changelog feed
 * (https://ghost.org/changelog.json): snake_case, `featured` is a
 * "true"/"false" string, `published_at` is ISO (offsets like "+00:00" occur).
 */
export interface ChangelogEntry {
    slug: string;
    title: string;
    custom_excerpt: string | null;
    url: string;
    published_at: string;
    featured: "true" | "false";
    feature_image?: string;
    html?: string;
}

export const changelogEntry = createBuilder<ChangelogEntry>(() => {
    const title = `${faker.commerce.productAdjective()} ${faker.commerce.productName()}`;
    const slug = `${generateSlug(title)}-${faker.string.alphanumeric(6).toLowerCase()}`;

    return {
        slug,
        title,
        custom_excerpt: faker.lorem.sentence(),
        url: `https://ghost.org/changelog/${slug}/`,
        published_at: new Date().toISOString(),
        featured: "false"
    };
});
