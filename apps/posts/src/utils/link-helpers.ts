export type CleanedLink = {
    count: number;
    link: {
        link_id: string;
        to: string;
        title: string;
        originalTo: string;
        from: string;
        edited: boolean;
    }
}

export const cleanTrackedUrl = (url: string, display = false): string => {
    try {
        const removeParams = ['ref', 'attribution_id', 'attribution_type'];
        const urlObj = new URL(url);
        for (const param of removeParams) {
            urlObj.searchParams.delete(param);
        }

        if (!display) {
            return urlObj.toString();
        }
        // Return URL without protocol
        const urlWithoutProtocol = urlObj.host + (urlObj.pathname === '/' && !urlObj.search ? '' : urlObj.pathname) + (urlObj.search ? urlObj.search : '') + (urlObj.hash ? urlObj.hash : '');
        // remove www. from the start of the URL
        return urlWithoutProtocol.replace(/^www\./, '');
    } catch (error) {
        // return the original url if there is an error
        return url;
    }
};

export const getLinkById = (links: CleanedLink[], linkId: string) => {
    return links.find(link => link.link.link_id === linkId);
};
