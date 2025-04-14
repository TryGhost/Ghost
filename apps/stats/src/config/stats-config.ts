export const TB_VERSION = 8;

export const getStatEndpointUrl = (baseUrl?: string, endpoint?: string) => {
    if (!baseUrl) {
        return '';
    }
    return `${baseUrl}/v0/pipes/${endpoint}__v${TB_VERSION}.json`;
};