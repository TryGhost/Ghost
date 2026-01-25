import {randomUUID} from 'node:crypto';
import type {
    LinkBulkUpdateRequest,
    LinkBulkUpdateResponse,
    LinkClickRequest,
    LinkClickResponse,
    LinkCreateRequest,
    LinkCreateResponse
} from './contracts.js';
import type {LinkRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type LinkService = {
    createLink: (input: LinkCreateRequest) => Promise<LinkCreateResponse>;
    bulkUpdateLinks: (input: LinkBulkUpdateRequest) => Promise<LinkBulkUpdateResponse>;
    recordClick: (input: LinkClickRequest) => Promise<LinkClickResponse>;
};

export const createLinkService = (repository: LinkRepository): LinkService => {
    const createLink = async (input: LinkCreateRequest) => {
        const link = await repository.createLink({
            id: randomUUID(),
            url: input.url,
            postId: input.postId ?? null,
            createdAt: Date.now()
        });

        return {
            link: {
                id: link.id,
                url: link.url,
                postId: link.postId ?? undefined,
                createdAt: link.createdAt
            }
        };
    };

    const bulkUpdateLinks = async (input: LinkBulkUpdateRequest) => {
        let updated = 0;

        for (const update of input.updates) {
            const link = await repository.getLinkById(update.id);
            if (!link) {
                continue;
            }

            await repository.createRedirect({
                id: randomUUID(),
                linkId: link.id,
                redirectTo: update.redirectTo,
                createdAt: Date.now()
            });
            updated += 1;
        }

        return {updated};
    };

    const recordClick = async (input: LinkClickRequest) => {
        const existing = await repository.getClickByRequest(input.requestId);
        if (existing) {
            return {recorded: false};
        }

        const link = await repository.getLinkById(input.linkId);
        if (!link) {
            throw new HttpError(404, 'link_not_found', 'Link not found');
        }

        await repository.createClick({
            id: randomUUID(),
            linkId: link.id,
            requestId: input.requestId,
            createdAt: Date.now()
        });

        return {recorded: true};
    };

    return {
        createLink,
        bulkUpdateLinks,
        recordClick
    };
};
