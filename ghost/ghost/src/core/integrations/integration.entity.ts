import {Entity} from '../../common/entity.base';

type api_keys = {
    id: string,
    type: string,
    secret: string,
    integration_id: string,
    created_at: string,
    updated_at: string,
    role_id: string,
    user_id: string,
    last_seen_at: string,
    last_seen_version: string
}

// type webhooks = {
//     id: string,
//     event: string,
//     target_url: string,
//     secret: string,
//     api_version: string,
//     integration_id: string,
//     created_at: string,
//     updated_at: string
// }

// "webhooks": [
//     {
//         "id": "660266c260f707744716d725",
//         "event": "site.changed",
//         "target_url": "https://example.com/target",
//         "name": "sup",
//         "secret": "https://example.com/secret",
//         "api_version": "v5.81",
//         "integration_id": "66025b2d6218f65e1caa55b1",
//         "last_triggered_at": null,
//         "last_triggered_status": null,
//         "last_triggered_error": null,
//         "created_at": "2024-03-26T06:10:10.000Z",
//         "updated_at": "2024-03-26T06:10:10.000Z"
//     }
// ]

type webhooks = {
    id: string,
    event: string,
    target_url: string,
    name: string,
    secret: string,
    api_version: string,
    integration_id: string,
    last_triggered_at: string | null,
    last_triggered_status: string | null,
    last_triggered_error: string | null,
    created_at: string,
    updated_at: string,
}

type IntegrationData = {
    type: 'internal' | 'builtin' | 'custom' | 'core',
    name: string,
    slug: string,
    icon_image: string | null,
    api_keys: api_keys[],
    description: string | null,
    webhooks?: webhooks[] | []
};

export class Integration extends Entity<IntegrationData> {
    get type() {
        return this.attr.type;
    }

    set type(type: 'internal' | 'builtin' | 'custom' | 'core') {
        this.set('type', type);
    }

    get name() : string {
        return this.attr.name;
    }

    set name(name: string) {
        this.set('name', name);
    }

    get slug() : string {
        return this.attr.slug;
    }

    set slug(slug: string) {
        this.set('slug', slug);
    }

    get icon_image(): string | null{
        if (!this.attr.icon_image) {
            return null;
        }

        return this.attr.icon_image;
    }

    set icon_image(iconImage: string) {
        this.set('icon_image', iconImage);
    }

    get description(): string | null{
        return this.attr.description;
    }

    set description(description: string) {
        this.set('description', description);
    }

    get api_keys(): api_keys[] {
        return this.attr.api_keys;
    }

    set api_keys(apiKeys: api_keys[]) {
        this.set('api_keys', apiKeys);
    }

    get webhooks(): webhooks[] {
        return this.attr.webhooks || [];
    }

    set webhooks(webhook: webhooks[]) {
        this.set('webhooks', webhook);
    }
}
