export type IncomingRecommendation = {
    id: string;
    title: string;
    url: URL;
    excerpt: string|null;
    favicon: URL|null;
    featuredImage: URL|null;
    recommendingBack: boolean;
}