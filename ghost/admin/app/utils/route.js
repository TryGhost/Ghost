import Route from '@ember/routing/route';

Route.reopen({
    actions: {
        willTransition(transition) {
            if (this.get('upgradeStatus.isRequired')) {
                transition.abort();
                this.get('upgradeStatus').requireUpgrade();
                return false;
            } else {
                return true;
            }
        }
    }
});
