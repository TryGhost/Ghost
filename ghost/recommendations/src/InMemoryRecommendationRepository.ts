import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";

export class InMemoryRecommendationRepository implements RecommendationRepository {
    recommendations: Recommendation[] = [
        new Recommendation({
            title: "The Pragmatic Programmer",
            reason: "This is a great book for any developer, regardless of their experience level. It's a classic that's stood the test of time.",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://www.thepragmaticprogrammer.com/favicon.ico",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: false
        })
    ];

    async add(recommendation: Recommendation): Promise<Recommendation> {
        this.recommendations.push(recommendation);
        return Promise.resolve(recommendation);
    }

    async edit(id: string, data: Partial<Recommendation>): Promise<Recommendation> {
        const existing = await this.getById(id);
        const updated = {...existing, ...data};
        this.recommendations = this.recommendations.map(r => r.id === id ? updated : r);
        return Promise.resolve(updated);
    }

    async remove(id: string): Promise<void> {
        await this.getById(id);
        this.recommendations = this.recommendations.filter(r => r.id !== id);
    }

    async getById(id: string): Promise<Recommendation> {
        const existing = this.recommendations.find(r => r.id === id);
        if (!existing) {
            throw new Error("Recommendation not found");
        }
        return Promise.resolve(existing);
    }

    async getAll(): Promise<Recommendation[]> {
        return Promise.resolve(this.recommendations);
    }
}
