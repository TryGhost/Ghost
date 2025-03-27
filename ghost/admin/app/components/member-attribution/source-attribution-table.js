import AllSourcesModal from './modals/all-sources';
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SourceAttributionTable extends Component {
    @service membersUtils;
    @service modals;

    @action
    openAllSources() {
        // add unavailableSource to sortedSources array only if it has value
        const allSources = this.unavailableSource ? [...this.sortedSources, this.unavailableSource] : this.sortedSources;

        this.modals.open(AllSourcesModal, {
            sources: allSources,
            unavailableSource: this.unavailableSource,
            sortColumn: this.args.sortColumn
        });
    }

    get unavailableSource() {
        const emptySource = this.args.sources.find(sourceData => !sourceData.source);
        if (!emptySource) {
            return null;
        }
        return {
            ...emptySource,
            source: 'Unavailable'
        };
    }

    // Others data includes all sources except the first 5
    get others() {
        if (this.sortedSources.length < 5) {
            return null;
        }

        if (this.sortedSources.length === 5 && !this.unavailableSource?.length) {
            return null;
        }

        return this.sortedSources.slice(5).reduce((acc, source) => {
            return {
                signups: acc.signups + source.signups,
                paidConversions: acc.paidConversions + source.paidConversions
            };
        }, {
            signups: 0,
            paidConversions: 0
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
        if (this.sortedSources.length >= 5) {
            return this.sortedSources.slice(0, 5);
        }

        return this.unavailableSource ? [...this.sortedSources, this.unavailableSource] : this.sortedSources;
    }
}
