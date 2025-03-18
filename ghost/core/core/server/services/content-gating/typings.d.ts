export type AccessFlag = boolean;

export interface GatedPost {
    visibility: string;
    tiers?: GatedTier[];
    html?: string;
    plaintext?: string;
    excerpt?: string;
}

interface GatedTier {
    slug: string;
}

export interface GatedMember {
    status?: string
}

interface LabsService {
    isSet: (key: string) => boolean;
}

export interface GatedBlockParams {
    nonMember?: boolean;
    memberSegment?: '' | 'status:free,status:-free' | 'status:free' | 'status:-free';
}
