import {cardConfig} from './cardConfig';
import {isTestEnv} from '../../test/utils/isTestEnv';

export const tenorConfig = isTestEnv ? {googleApiKey: 'xxx'} : cardConfig.tenor;
