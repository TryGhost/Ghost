import OptionsComponent from 'ember-power-select/components/power-select/options';
import templateLayout from '../templates/components/power-select-vertical-collection-options';
import {layout} from '@ember-decorators/component';

@layout(templateLayout)
export default class PowerSelectVerticalCollectionOptions extends OptionsComponent {}
