import 'reflect-metadata';
import {AppModule} from './nestjs/modules/app.module';
import {NestApplication, NestFactory} from '@nestjs/core';
import {registerEvents} from './common/decorators/handle-event.decorator';
import {ClassProvider, ValueProvider} from '@nestjs/common';

let _app: NestApplication;

export async function create() {
    const app = await NestFactory.create<NestApplication>(AppModule);
    const DomainEvents = await app.resolve('DomainEvents');
    registerEvents(app as NestApplication, DomainEvents);
    return app;
}

export async function getApp() {
    if (_app) {
        return _app;
    }
    _app = await create();
    await _app.init();
    return _app;
}

export async function resolve(token: string) {
    const app = await getApp();
    return await app.resolve(token);
}

export function addProvider(obj: ClassProvider | ValueProvider) {
    AppModule.providers?.push(obj);
    AppModule.exports?.push(obj.provide);
}

export {
    AppModule
};
