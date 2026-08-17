export const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
export const PAID_MEMBERS_SEGMENT = 'status:-free'; // paid + comped + gift
export const FREE_MEMBERS_SEGMENT = 'status:free';
export const NO_MEMBERS_SEGMENT = '';

export const DEFAULT_VISIBILITY = {
    web: {
        nonMember: true,
        memberSegment: ALL_MEMBERS_SEGMENT
    },
    email: {
        memberSegment: ALL_MEMBERS_SEGMENT
    }
};

export const buildDefaultVisibility = () => JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
