import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";

export class InMemoryRecommendationRepository implements RecommendationRepository {
    recommendations: Recommendation[] = [
        new Recommendation({
            title: "She‘s A Beast",
            reason: "She helped me get back into the gym after 8 years of chilling",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://www.shesabeast.co/content/images/size/w256h256/2022/08/transparent-icon-black-copy-gray-bar.png",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: false
        }),
        new Recommendation({
            title: "Lenny‘s Newsletter",
            reason: "He knows his stuff about product management and gives away lots of content for free. Highly recommended!",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Fc7cde267-8f9e-47fa-9aef-5be03bad95ed%2Fapple-touch-icon-1024x1024.png",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: false
        }),
        new Recommendation({
            title: "Clickhole",
            reason: "Funny",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://clickhole.com/wp-content/uploads/2020/05/cropped-clickhole-icon-180x180.png",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: false
        }),
        new Recommendation({
            title: "The Verge",
            reason: "Consistently best tech news, I read it every day!",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://www.theverge.com/icons/apple_touch_icon.png",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: false
        }),
        new Recommendation({
            title: "The Counteroffensive with Tim Mak",
            reason: "On-the-ground war reporting from Ukraine.",
            excerpt: "The Pragmatic Programmer is one of those rare tech books you’ll read, re-read, and read again over the years. Whether you’re new to the field or an experienced practitioner, you’ll come away with fresh insights each and every time.",
            featuredImage: "https://www.thepragmaticprogrammer.com/image.png",
            favicon: "https://substackcdn.com/image/fetch/w_96,h_96,c_fill,f_webp,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2Ff3f2b2ad-681f-45e1-9496-db80f45e853d_403x403.png",
            url: "https://www.thepragmaticprogrammer.com/",
            oneClickSubscribe: true
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
