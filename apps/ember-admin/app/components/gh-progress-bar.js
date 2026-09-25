import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {htmlSafe} from '@ember/template';
import {tagName} from '@ember-decorators/component';

@classic
@tagName('')
export default class GhProgressBar extends Component {
    // Public attributes
    percentage = 0;

    isError = false;

    // Internal attributes
    progressStyle = '';

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        const percentage = this.percentage;
        const width = (percentage > 0) ? `${percentage}%` : '0';

        this.set('progressStyle', htmlSafe(`width: ${width}`));
    }
}
