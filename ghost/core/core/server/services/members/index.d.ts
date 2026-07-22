import MemberRepository from './members-api/repositories/member-repository';

interface MemberBREADService {
    disableCommenting(
        memberId: string,
        reason: string,
        expiresAt: Date | null,
        hideComments: boolean,
        context: unknown
    ): Promise<unknown>;

    enableCommenting(
        memberId: string,
        context: unknown
    ): Promise<unknown>;

    read(options: { id?: string; email?: string; uuid?: string; transient_id?: string }): Promise<unknown>;
}

interface MembersApi {
    memberBREADService: MemberBREADService;
    members: MemberRepository;
}

interface MembersService {
    init(): Promise<void>;
    api: MembersApi;
    createPaidMemberShim(tierSlug?: string): Promise<{status: 'paid'; products: Array<{slug: string}>}>;
}

declare const membersService: MembersService;
export = membersService;
