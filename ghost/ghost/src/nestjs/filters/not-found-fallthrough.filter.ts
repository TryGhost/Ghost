import {Catch, NotFoundException, ExceptionFilter, ArgumentsHost} from '@nestjs/common';

@Catch(NotFoundException)
export class NotFoundFallthroughExceptionFilter implements ExceptionFilter {
    catch(exception: NotFoundException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const next = ctx.getNext();
        next();
    }
}
