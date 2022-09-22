import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class SourceAttributionTable extends Component {
    @service membersUtils;

    get sources() {
        const availableSources = this.args.sources.filter(source => source.source);
        const unavailableSources = this.args.sources.filter(sourceData => !sourceData.source).map((sourceData) => {
            return {
                ...sourceData,
                source: 'Unavailable'
            };
        });
        return [
            ...availableSources,
            ...unavailableSources
        ];
    }
}
