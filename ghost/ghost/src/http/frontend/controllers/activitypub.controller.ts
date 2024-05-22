import {Controller, Get, Header, Param, Post, RawBody, Headers as NestHeaders, Req, Body} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import ObjectID from 'bson-objectid';
import {JSONLDService} from '../../../core/activitypub/jsonld.service';
import {HTTPSignature} from '../../../core/activitypub/http-signature.service';
import {InboxService} from '../../../core/activitypub/inbox.service';
import {Activity} from '../../../core/activitypub/activity.entity';

@Controller('activitypub')
export class ActivityPubController {
    constructor(
        private readonly service: JSONLDService,
        private readonly inboxService: InboxService
    ) {}

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('actor/:id')
    async getActor(@Param('id') id: unknown) {
        if (typeof id !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getActor(ObjectID.createFromHexString(id));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('inbox/:owner')
    async getInbox(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getInbox(ObjectID.createFromHexString(owner));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Post('inbox/:owner')
    async handleActivity(
        @Param('owner') owner: unknown,
        @Body() body: unknown,
        @RawBody() rawbody: Buffer,
        @NestHeaders() headers: Record<string, string>,
        @Req() req: Request
    ) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        if (typeof body !== 'object' || body === null) {
            throw new Error('Bad Request');
        }
        if (!('id' in body) || !('type' in body) || !('actor' in body) || !('object' in body)) {
            throw new Error('Bad Request');
        }
        const verified = await HTTPSignature.validate(req.method, req.url, new Headers(headers), rawbody);
        if (!verified) {
            throw new Error('Not Authorized');
        }
        this.inboxService.post(ObjectID.createFromHexString(owner), Activity.fromJSONLD(body));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('outbox/:owner')
    async getOutbox(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getOutbox(ObjectID.createFromHexString(owner));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('following/:owner')
    async getFollowing(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getFollowing(ObjectID.createFromHexString(owner));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('followers/:owner')
    async getFollowers(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getFollowers(ObjectID.createFromHexString(owner));
    }

    @Header('Cache-Control', 'no-store')
    @Header('Content-Type', 'application/activity+json')
    @Roles(['Anon'])
    @Get('article/:id')
    async getArticle(@Param('id') id: unknown) {
        if (typeof id !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getArticle(ObjectID.createFromHexString(id));
    }
}
