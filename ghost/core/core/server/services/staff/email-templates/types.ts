import type {ReadonlyDeep} from 'type-fest';

export type StaffTextBaseData = ReadonlyDeep<{
    toEmail: string;
    siteDomain: string;
    staffUrl: string;
}>;

export type StaffMemberTextData = StaffTextBaseData & ReadonlyDeep<{
    memberData: {
        name: string;
    };
}>;
