import {Meta, createQuery} from '../utils/api/hooks';

export type MemberEventMember = {
    id: string;
    uuid: string;
    name?: string;
    email?: string;
};

export type MemberEventPost = {
    id: string;
    uuid: string;
    title?: string;
    url?: string;
};

export type FeedbackEvent = {
    type: 'feedback_event';
    data: {
        id: string;
        score: number;
        created_at: string;
        member_id: string;
        post_id: string;
        member: MemberEventMember;
        post: MemberEventPost;
    };
};

// Generic member event type that can be extended for other event types
export type MemberEvent = FeedbackEvent; // Can be extended: | SignupEvent | SubscriptionEvent | etc.

export type MemberEventsResponseType = {
    events: MemberEvent[];
    meta: Meta;
};

export const useMemberEvents = createQuery<MemberEventsResponseType>({
    dataType: 'MemberEventsResponseType',
    path: '/members/events'
});

// Convenience hook specifically for feedback events
export const useFeedbackMembers = createQuery<MemberEventsResponseType>({
    dataType: 'MemberEventsResponseType',
    path: '/members/events',
    defaultSearchParams: {
        filter: 'type:feedback_event'
    }
});
