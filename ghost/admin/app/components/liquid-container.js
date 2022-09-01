import LiquidContainer from 'liquid-fire/components/liquid-container';
import config from 'ghost-admin/config/environment';

export default LiquidContainer.extend({
    init() {
        this._super(...arguments);

        if (config.environment === 'test') {
            this.growDuration = 5;
        }
    }
});
