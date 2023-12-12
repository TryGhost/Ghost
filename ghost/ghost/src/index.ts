import 'reflect-metadata';
import {AppModule} from './nestjs/app.module';
import {NestApplication, NestFactory} from '@nestjs/core';
import {registerEvents} from './common/decorators/handle-event.decorator';
import {ClassProvider, ValueProvider} from '@nestjs/common';

export async function create() {
    const app = await NestFactory.create(AppModule);
    const DomainEvents = await app.resolve('DomainEvents');
    registerEvents(app as NestApplication, DomainEvents);
    return app;
}

export function addProvider(obj: ClassProvider | ValueProvider) {
    AppModule.providers?.push(obj);
    AppModule.exports?.push(obj.provide);
}

export {
    AppModule
};
