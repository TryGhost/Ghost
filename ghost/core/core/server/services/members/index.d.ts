interface MemberBREADService {
    disableCommenting(
        memberId: string,
        reason: string,
        expiresAt: Date | null,
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
}

interface MembersService {
    init(): Promise<void>;
    api: MembersApi;
}

declare const membersService: MembersService;
export = membersService;
