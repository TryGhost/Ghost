// @NOTE: file names having only type declarations should also
//        be uppercased
/* eslint-disable ghost/filenames/match-regex */

export type Collection = {
    id: string;
    // @NOTE: this field feels out of place here and needs clarification
    //        it's here for now to implement the InMemoryRepository pattern
    deleted: boolean;
    title: string;
    description: string,
    type: 'manual' | 'automatic';
    filter: string | null;
    feature_image: string | null;
}
