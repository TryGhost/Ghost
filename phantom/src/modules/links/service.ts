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
import type {AnalyticsRepository} from '../analytics/repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type LinkService = {
    createLink: (input: LinkCreateRequest) => Promise<LinkCreateResponse>;
    bulkUpdateLinks: (input: LinkBulkUpdateRequest) => Promise<LinkBulkUpdateResponse>;
    recordClick: (input: LinkClickRequest) => Promise<LinkClickResponse>;
};

export const createLinkService = (
    repository: LinkRepository,
    analyticsRepository?: AnalyticsRepository
): LinkService => {
    const createLink = async (input: LinkCreateRequest) => {
        const link = await repository.createLink({
            id: randomUUID(),
            url: input.url,
            postId: input.postId ?? null,
            newsletterId: input.newsletterId ?? null,
            source: input.source ?? null,
            medium: input.medium ?? null,
            campaign: input.campaign ?? null,
            referrer: input.referrer ?? null,
            createdAt: Date.now()
        });

        return {
            link: {
                id: link.id,
                url: link.url,
                postId: link.postId ?? undefined,
                newsletterId: link.newsletterId ?? undefined,
                source: link.source ?? undefined,
                medium: link.medium ?? undefined,
                campaign: link.campaign ?? undefined,
                referrer: link.referrer ?? undefined,
                createdAt: link.createdAt
            }
        };
    };

    const bulkUpdateLinks = async (input: LinkBulkUpdateRequest) => {
        let updated = 0;
        const results: LinkBulkUpdateResponse['results'] = [];

        for (const update of input.updates) {
            const link = await repository.getLinkById(update.id);
            if (!link) {
                results.push({id: update.id, status: 'not_found'});
                continue;
            }

            await repository.createRedirect({
                id: randomUUID(),
                linkId: link.id,
                redirectTo: update.redirectTo,
                status: update.status ?? 'temporary',
                createdAt: Date.now()
            });
            updated += 1;
            results.push({id: update.id, status: 'updated'});
        }

        return {updated, results};
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
            redirectId: input.redirectId ?? null,
            requestId: input.requestId,
            kind: input.kind ?? (input.redirectId ? 'redirect' : 'link'),
            memberId: input.memberId ?? null,
            createdAt: Date.now()
        });

        if (analyticsRepository && input.memberId) {
            await analyticsRepository.createEvent({
                id: randomUUID(),
                memberId: input.memberId,
                type: 'link.clicked',
                createdAt: Date.now()
            });
        }

        return {recorded: true};
    };

    return {
        createLink,
        bulkUpdateLinks,
        recordClick
    };
};
