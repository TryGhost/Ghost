const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';
const PAID_MEMBERS_SEGMENT = 'status:-free'; // paid + comped
const FREE_MEMBERS_SEGMENT = 'status:free';
const NO_MEMBERS_SEGMENT = '';

const DEFAULT_VISIBILITY = {
    web: {
        nonMember: true,
        memberSegment: ALL_MEMBERS_SEGMENT
    },
    email: {
        memberSegment: ALL_MEMBERS_SEGMENT
    }
};

module.exports = {
    buildDefaultVisibility: function () {
        return JSON.parse(JSON.stringify(DEFAULT_VISIBILITY));
    },
    ALL_MEMBERS_SEGMENT,
    PAID_MEMBERS_SEGMENT,
    FREE_MEMBERS_SEGMENT,
    NO_MEMBERS_SEGMENT
};