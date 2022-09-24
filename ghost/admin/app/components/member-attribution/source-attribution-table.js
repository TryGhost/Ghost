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
            sources: this.args.sources
        });
    }

    get others() {
        const availableSources = this.args.sources.filter(source => source.source);
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

    get sources() {
        return this.args.sources.filter(source => source.source).slice(0, 5);
        // const availableSources = this.args.sources.filter(source => source.source);
        // return availableSources.slice(0, 5);

        // const unavailableSources = this.args.sources.filter(sourceData => !sourceData.source).map((sourceData) => {
        //     return {
        //         ...sourceData,
        //         source: 'Unavailable'
        //     };
        // });
        // return [
        //     ...availableSources,
        //     ...unavailableSources
        // ];
    }
}
