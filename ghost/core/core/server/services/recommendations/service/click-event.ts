import ObjectId from 'bson-objectid';

export class ClickEvent {
    id: string;
    recommendationId: string;
    memberId: string|null;
    createdAt: Date;

    get deleted() {
        return false;
    }

    private constructor(data: {id: string, recommendationId: string, memberId: string|null, createdAt: Date}) {
        this.id = data.id;
        this.recommendationId = data.recommendationId;
        this.memberId = data.memberId;
        this.createdAt = data.createdAt;
    }

    static create(data: {id?: string, recommendationId: string, memberId?: string|null, createdAt?: Date}) {
        const id = data.id ?? ObjectId().toString();

        const d = {
            id,
            recommendationId: data.recommendationId,
            memberId: data.memberId ?? null,
            createdAt: data.createdAt ?? new Date()
        };

        return new ClickEvent(d);
    }
}
