import resolver from './helpers/resolver';
import {setResolver} from 'ember-mocha';

setResolver(resolver);

mocha.setup({
    timeout: 15000,
    slow: 500
});

