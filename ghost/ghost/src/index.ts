import 'reflect-metadata';
import {AppModule} from './nestjs/AppModule';
import {NestFactory} from '@nestjs/core';

export async function create() {
    const app = await NestFactory.create(AppModule);
    return app;
}
