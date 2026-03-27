type Serializer = (apiConfig: unknown, frame: unknown) => void;

declare const membersSerializer: {
    browse: Serializer;
    read: Serializer;
    edit: Serializer;
    add: Serializer;
    destroy: Serializer;
    editSubscription: Serializer;
    createSubscription: Serializer;
    bulkDestroy: Serializer;
    bulkEdit: Serializer;
    exportCSV: Serializer;
    importCSV: Serializer;
    memberStats: Serializer;
    mrrStats: Serializer;
    activityFeed: Serializer;
};

export = membersSerializer;
