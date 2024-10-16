/**
 * Controller
 *
 * These classes are responsible for wiring HTTP Requests to the Service layer.
 * They do not contain business logic.
 */

import {
    Controller,
    Get,
    Param,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import {ExampleService} from '../../../core/example/example.service';
import {LocationHeaderInterceptor} from '../../../nestjs/interceptors/location-header.interceptor';
import {AdminAPIAuthentication} from '../../../nestjs/guards/admin-api-authentication.guard';
import {PermissionsGuard} from '../../../nestjs/guards/permissions.guard';

@UseInterceptors(LocationHeaderInterceptor)
@UseGuards(AdminAPIAuthentication, PermissionsGuard)
@Controller('greetings')
export class ExampleController {
    constructor(private readonly service: ExampleService) {}

    @Roles([
        'Admin',
        'Author',
        'Contributor',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Get(':recipient')
    async read(
        @Param('recipient') recipient: string
    ): Promise<string> {
        const greeting = await this.service.greet(recipient);
        return greeting;
    }
}
