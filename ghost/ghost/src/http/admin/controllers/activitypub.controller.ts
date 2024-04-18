import {Controller, Get, Header, Param} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import ObjectID from 'bson-objectid';
import {JSONLDService} from '../../../core/activitypub/jsonld.service';

@Controller('activitypub')
export class ActivityPubController {
    constructor(
        private readonly service: JSONLDService
    ) {}

    @Header('Cache-Control', 'no-store')
    @Roles(['Anon'])
    @Get('actor/:id')
    async getActor(@Param('id') id: unknown) {
        if (typeof id !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getActor(ObjectID.createFromHexString(id));
    }

    @Header('Cache-Control', 'no-store')
    @Roles(['Anon'])
    @Get('key/:owner')
    async getKey(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getPublicKey(ObjectID.createFromHexString(owner));
    }

    @Header('Cache-Control', 'no-store')
    @Roles(['Anon'])
    @Get('outbox/:owner')
    async getOutbox(@Param('owner') owner: unknown) {
        if (typeof owner !== 'string') {
            throw new Error('Bad Request');
        }
        return this.service.getOutbox(ObjectID.createFromHexString(owner));
    }
}
