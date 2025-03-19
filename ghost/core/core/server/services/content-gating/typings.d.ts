export type AccessFlag = boolean;

export interface GatedPost {
    access?: boolean;
    excerpt?: string;
    html?: string;
    plaintext?: string;
    tiers?: GatedTier[];
    visibility: string;
}

interface GatedTier {
    slug: string;
}

export interface GatedMember {
    status?: 'free' | 'paid' | 'comped'
}

interface LabsService {
    isSet: (key: string) => boolean;
}

export interface GatedBlockParams {
    nonMember?: boolean;
    memberSegment?: '' | 'status:free,status:-free' | 'status:free' | 'status:-free';
}

export type GatePostAttrsOptions = {
    addAccessAttr?: boolean;
    labs?: LabsService;
}
