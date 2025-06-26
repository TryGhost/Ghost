import {type LinkResponseType} from '@tryghost/admin-x-framework/api/links';

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

export const processAndGroupTopLinks = (clicksResponse: LinkResponseType | undefined): CleanedLink[] => {
    // Convert clicksResponse to links format
    const links = clicksResponse?.links.map(link => ({
        link: link.link,
        count: link.count?.clicks || 0
    })) || [];

    const cleanedLinks = links.map((link) => {
        return {
            ...link,
            link: {
                ...link.link,
                originalTo: link.link.to,
                to: cleanTrackedUrl(link.link.to, false),
                title: cleanTrackedUrl(link.link.to, true)
            }
        };
    });

    const linksByTitle = cleanedLinks.reduce((acc: Record<string, CleanedLink>, link: CleanedLink) => {
        if (!acc[link.link.title]) {
            acc[link.link.title] = link;
        } else {
            if (!acc[link.link.title].count) {
                acc[link.link.title].count = 0;
            }
            acc[link.link.title].count += (link.count ?? 0);
        }
        return acc;
    }, {});

    return Object.values(linksByTitle).sort((a, b) => {
        const aClicks = a.count || 0;
        const bClicks = b.count || 0;
        return bClicks - aClicks;
    });
};
