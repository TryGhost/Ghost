/* eslint-disable ghost/ember/no-test-import-export */
import {applyEmberDataSerializers, discoverEmberDataModels} from 'ember-cli-mirage';
import {createServer} from 'miragejs';
import {isTesting, macroCondition} from '@embroider/macros';

import devRoutes from './routes-dev';
import testRoutes from './routes-test';

export default function (config) {
    let finalConfig = {
        ...config,
        models: {...discoverEmberDataModels(), ...config.models},
        serializers: applyEmberDataSerializers(config.serializers),
        routes
    };

    return createServer(finalConfig);
}

function routes() {
    if (macroCondition(isTesting())) {
        testRoutes.call(this);
    } else {
        devRoutes.call(this);
    }
}
