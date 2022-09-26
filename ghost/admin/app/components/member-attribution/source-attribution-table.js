import AllSourcesModal from './modals/all-sources';
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SourceAttributionTable extends Component {
    @service membersUtils;
    @service modals;

    @action
    openAllSources() {
        this.modals.open(AllSourcesModal, {
            sources: [
                ...this.sortedSources,
                ...this.unavailableSource
            ]
        });
    }

    get unavailableSource() {
        return this.args.sources.filter(sourceData => !sourceData.source).map((sourceData) => {
            return {
                ...sourceData,
                source: 'Unavailable'
            };
        });
    }

    get others() {
        const availableSources = this.sortedSources;
        const unavailableSource = this.args.sources.find(sourceData => !sourceData.source);
        if (!availableSources.length && !unavailableSource) {
            return null;
        }

        return availableSources.slice(5).reduce((acc, source) => {
            return {
                signups: acc.signups + source.signups,
                paidConversions: acc.paidConversions + source.paidConversions
            };
        }, {
            signups: unavailableSource?.signups ?? 0,
            paidConversions: unavailableSource?.paidConversions ?? 0
        });
    }

    get sortedSources() {
        return this.args.sources?.filter(source => source.source).sort((a, b) => {
            if (this.args.sortColumn === 'signups') {
                return b.signups - a.signups;
            } else {
                return b.paidConversions - a.paidConversions;
            }
        }) || [];
    }

    get sources() {
        return this.sortedSources.slice(0, 5);
    }
}
