declare function createInvitesService(deps: {
    settingsCache: object;
    settingsHelpers: object;
    urlUtils: object;
    mailService: object;
}): object;

export = createInvitesService;
