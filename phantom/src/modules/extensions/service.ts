import {randomUUID} from 'node:crypto';
import type {
    ExtensionInstallRequest,
    ExtensionInstallResponse,
    ExtensionRegistryResponse
} from './contracts.js';
import type {ExtensionsRepository} from './repo.js';
import type {BillingRepository} from '../billing/repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type ExtensionsService = {
    listRegistry: () => Promise<ExtensionRegistryResponse>;
    installExtension: (input: ExtensionInstallRequest) => Promise<ExtensionInstallResponse>;
    uninstallExtension: (id: string) => Promise<void>;
};

export const createExtensionsService = (
    repository: ExtensionsRepository,
    billingRepository: BillingRepository
): ExtensionsService => {
    const ensureDefaultListings = async () => {
        const listings = await repository.listListings();
        if (listings.length > 0) {
            return listings;
        }
        const now = Date.now();
        const listing = await repository.createListing({
            id: 'default',
            name: 'Default Extension',
            paid: 0,
            version: '1.0.0',
            capabilities: JSON.stringify(['webhooks.read', 'posts.read']),
            createdAt: now
        });
        return [listing];
    };

    const listRegistry = async () => {
        const listings = await ensureDefaultListings();
        return {
            listings: listings.map((listing) => ({
                id: listing.id,
                name: listing.name,
                paid: listing.paid === 1,
                version: listing.version,
                capabilities: JSON.parse(listing.capabilities) as string[]
            }))
        };
    };

    const installExtension = async (input: ExtensionInstallRequest) => {
        const listing = await repository.getListingById(input.listingId);
        if (!listing) {
            throw new HttpError(404, 'listing_not_found', 'Listing not found');
        }

        if (listing.paid === 1) {
            const profile = await billingRepository.getProfile();
            const entitlements = await billingRepository.listEntitlements();
            const eligible = profile?.status === 'linked' && entitlements.some((entitlement) => entitlement.listingId === listing.id && entitlement.status === 'active');
            if (!eligible) {
                throw new HttpError(403, 'entitlement_missing', 'Marketplace entitlement required');
            }
        }

        const install = await repository.createInstall({
            id: randomUUID(),
            listingId: listing.id,
            status: 'installed',
            config: JSON.stringify(input.config ?? {}),
            createdAt: Date.now()
        });
        const status: 'installed' | 'disabled' = install.status === 'disabled' ? 'disabled' : 'installed';
        return {
            install: {
                id: install.id,
                listingId: install.listingId,
                status,
                config: JSON.parse(install.config) as Record<string, unknown>
            }
        };
    };

    const uninstallExtension = async (id: string) => {
        const existing = await repository.getInstallById(id);
        if (!existing) {
            throw new HttpError(404, 'install_not_found', 'Install not found');
        }
        await repository.deleteInstall(id);
    };

    return {
        listRegistry,
        installExtension,
        uninstallExtension
    };
};
