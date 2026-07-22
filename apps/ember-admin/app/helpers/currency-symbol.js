import Helper from '@ember/component/helper';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject as service} from '@ember/service';

export default class CurrencySymbolHelper extends Helper {
    @service feature;

    compute([currency]) {
        if (currency) {
            return getSymbol(currency);
        }
        return '';
    }
}
