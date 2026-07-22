import Component from '@glimmer/component';
import flattenGroupedOptions from 'ghost-admin/utils/flatten-grouped-options';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default class GhSegmentTokenInput extends Component {
    @service labelsManager;

    constructor() {
        super(...arguments);
        if (!this.args.hideLabels && !this.labelsManager.hasLoaded) {
            this.labelsManager.loadMoreTask.perform();
        }
    }

    get mergedOptions() {
        const options = [...(this.args.nonLabelOptions || [])];
        const labels = this.labelsManager.labels;

        if (labels.length > 0 && !this.args.hideLabels) {
            options.push({
                groupName: 'Labels',
                options: labels.map(label => ({
                    name: label.name,
                    segment: `label:${label.slug}`,
                    count: label.count?.members,
                    class: 'segment-label'
                }))
            });
        }

        return options;
    }

    get selectedOptions() {
        const segments = this.args.selectedSegments || [];
        const segmentSet = new Set(segments);
        return flattenGroupedOptions(this.mergedOptions)
            .filter(option => segmentSet.has(option.segment));
    }

    get useServerSideSearch() {
        if (this.args.hideLabels) {
            return false;
        }
        return !this.labelsManager.hasLoadedAll;
    }

    get renderInPlace() {
        return this.args.renderInPlace === undefined ? false : this.args.renderInPlace;
    }

    @task({restartable: true})
    *searchTask(term) {
        const results = [];
        const selectedSegments = new Set(this.args.selectedSegments || []);
        const lowerTerm = term.toLowerCase();

        // Client-side filter non-label options
        for (const item of (this.args.nonLabelOptions || [])) {
            if (item.options) {
                for (const opt of item.options) {
                    if (opt.name.toLowerCase().includes(lowerTerm) && !selectedSegments.has(opt.segment)) {
                        results.push(opt);
                    }
                }
            } else if (item.name.toLowerCase().includes(lowerTerm) && !selectedSegments.has(item.segment)) {
                results.push(item);
            }
        }

        // Server-side search labels
        if (!this.args.hideLabels) {
            const labels = yield this.labelsManager.searchLabelsTask.perform(term);
            labels.forEach((label) => {
                const segment = `label:${label.slug}`;
                if (!selectedSegments.has(segment)) {
                    results.push({
                        name: label.name,
                        segment,
                        count: label.count?.members,
                        class: 'segment-label'
                    });
                }
            });
        }

        return results;
    }

    @task({drop: true})
    *loadMoreLabelsTask() {
        if (this.args.hideLabels) {
            return;
        }
        yield this.labelsManager.loadMoreTask.perform();
    }
}
