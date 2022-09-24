import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class FullAttributionTable extends Component {
    @service membersUtils;

    get sources() {
        const availableSources = this.args.data.sources.filter(source => source.source);
        const unavailableSources = this.args.data.sources.filter(sourceData => !sourceData.source).map((sourceData) => {
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
