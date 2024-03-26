/**
 * Controller
 *
 * These classes are responsible for wiring HTTP Requests to the Service layer.
 * They do not contain business logic.
 */

import {
    Controller,
    Get
} from '@nestjs/common';
import {Roles} from '../../../../common/decorators/permissions.decorator';
import {IntegrationService} from '../../../../core/integrations/integration.service';
import {Integration} from '../../../../core/integrations/integration.entity';

@Controller('integration')
export class IntegrationController {
    constructor(private readonly service: IntegrationService) {}

    @Roles([
        'Admin',
        'Owner',
        'Admin Integration'
    ])

    @Get()
    async read(): Promise<Integration[]> {
        return await this.service.getAll();
    }
}
