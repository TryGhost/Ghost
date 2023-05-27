import Component from '@glimmer/component';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class Analytics extends Component {
    @service settings;
    @service feature;
    @service utils;

    @action
    toggleEmailTrackOpens(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackOpens = !this.settings.emailTrackOpens;
    }

    @task
    *exportPostsTask() {
        let exportUrl = ghostPaths().url.api('posts/export');
        let downloadParams = new URLSearchParams();
        downloadParams.set('limit', 1000);

        yield this.utils.fetchAndDownloadFile(`${exportUrl}?${downloadParams.toString()}`);

        return true;
    }

    @action
    toggleEmailTrackClicks(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackClicks = !this.settings.emailTrackClicks;
    }

    @action
    toggleMembersTrackSources(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.membersTrackSources = !this.settings.membersTrackSources;
    }

    @action
    toggleOutboundLinkTagging(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.outboundLinkTagging = !this.settings.outboundLinkTagging;
    }
}
