import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class Email extends Component {
    @service dashboardStats;

    /**
     * Call this method when you need to fetch new data from the server. 
     */
    @action
    loadCharts() {
        // The dashboard stats service will take care or reusing and limiting API-requests between charts
        this.dashboardStats.loadNewsletterSubscribers();
        this.dashboardStats.loadEmailsSent();
    }
    
    get dataSubscribers() {
        // @todo: show paid, free, total together
        return this.dashboardStats.newsletterSubscribers ?? {
            total: 0,
            free: 0,
            paid: 0
        };
    }

    get dataEmailsSent() {
        return this.dashboardStats.emailsSent30d ?? 0;
    }
}
