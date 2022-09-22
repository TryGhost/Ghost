import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

/**
 * @typedef {import('../../services/dashboard-stats').SourceAttributionCount} SourceAttributionCount
*/

export default class AnalyticsController extends Controller {
    @service ajax;
    @service ghostPaths;
    @service settings;
    @service membersUtils;

    @tracked sources = null;
    @tracked links = null;

    get post() {
        return this.model;
    }

    @action
    loadData() {
        this.fetchReferrersStats();
        this.fetchLinks();
    }

    async fetchReferrersStats() {
        if (this._fetchReferrersStats.isRunning) {
            return this._fetchReferrersStats.last;
        }
        return this._fetchReferrersStats.perform();
    }

    cleanURL(url, display = false) {
        // Remove our own querystring parameters and protocol
        const removeParams = ['rel', 'attribution_id', 'attribution_type'];
        const urlObj = new URL(url);
        for (const param of removeParams) {
            urlObj.searchParams.delete(param);
        }
        if (!display) {
            return urlObj.toString();
        }
        // Return URL without protocol
        return urlObj.host + (urlObj.pathname === '/' ? '' : urlObj.pathname) + (urlObj.search ? '?' + urlObj.search : '');
    }

    async fetchLinks() {
        if (this._fetchLinks.isRunning) {
            return this._fetchLinks.last;
        }
        return this._fetchLinks.perform();
    }

    @task
    *_fetchReferrersStats() {
        let statsUrl = this.ghostPaths.url.api(`stats/referrers/posts/${this.post.id}`);
        let result = yield this.ajax.request(statsUrl);
        this.sources = result.stats.map((stat) => {
            return {
                source: stat.source ?? 'Direct',
                signups: stat.signups,
                paidConversions: stat.paid_conversions
            };
        });
    }

    @task
    *_fetchLinks() {
        const filter = `post_id:${this.post.id}`;
        let statsUrl = this.ghostPaths.url.api(`links/`) + `?filter=${encodeURIComponent(filter)}`;
        let result = yield this.ajax.request(statsUrl);
        const links = result.links.map((link) => {
            return {
                ...link,
                link: {
                    ...link.link,
                    to: this.cleanURL(link.link.to, false),
                    title: this.cleanURL(link.link.to, true)
                }
            };
        });

        // Remove duplicates by title ad merge
        const linksByTitle = links.reduce((acc, link) => {
            if (!acc[link.link.title]) {
                acc[link.link.title] = link;
            } else {
                acc[link.link.title].clicks += link.clicks;
            }
            return acc;
        }, {});

        this.links = Object.values(linksByTitle);
    }
}
