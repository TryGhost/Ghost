import { useQuery } from "@tanstack/react-query";
import type { Moment } from "moment";
import moment from "moment";

export interface ChangelogEntry {
    id: string;
    title: string;
    excerpt: string;
    url: string;
    publishedAt: Moment;
    featured: boolean;
}

interface RawChangelogEntry {
    id: string;
    title: string;
    excerpt: string;
    url: string;
    published_at: string;
    featured: boolean;
}

function deserializeChangelogEntry(raw: RawChangelogEntry): ChangelogEntry {
    return {
        id: raw.id,
        title: raw.title,
        excerpt: raw.excerpt,
        url: raw.url,
        publishedAt: moment(raw.published_at),
        featured: raw.featured,
    };
}

interface RawChangelogResponse {
    posts: RawChangelogEntry[];
    changelogUrl: string;
}

export interface ChangelogResponse {
    entries: ChangelogEntry[];
    changelogUrl: string;
}

export const useChangelog = () =>
    useQuery({
        queryKey: ["changelog"],
        queryFn: async (): Promise<RawChangelogResponse> => {
            const response = await fetch("https://ghost.org/changelog.json");
            if (!response.ok) {
                throw new Error("Failed to fetch changelog");
            }
            return response.json();
        },
        select: (data: RawChangelogResponse): ChangelogResponse => ({
            entries: (data?.posts || []).map(deserializeChangelogEntry),
            changelogUrl: data.changelogUrl,
        }),
        staleTime: Infinity,
    });
