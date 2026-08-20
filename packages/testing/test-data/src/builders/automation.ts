import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";

/** Ghost Admin API automation resource (list shape). */
export interface Automation {
    id: string;
    name: string;
    slug: string;
    status: "active" | "inactive";
    stats: {
        last_run_created_at: string | null;
        total_run_count: number;
        in_progress_run_count: number;
    };
}

export const automation = createBuilder<Automation>(() => {
    const name = `${faker.word.adjective()} ${faker.word.noun()} flow`;

    return {
        id: generateId(),
        name,
        slug: `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        status: "inactive",
        stats: {
            last_run_created_at: null,
            total_run_count: 0,
            in_progress_run_count: 0
        }
    };
});
