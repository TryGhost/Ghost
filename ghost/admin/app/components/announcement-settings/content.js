import Component from '@glimmer/component';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementSettingsContentComponent extends Component {
    @service feature;
    @service settings;

    get content() {
        const content = this.settings.announcementContent;
        if (!content) {
            return null;
        }
        // wrap in a paragraph, so it gets parsed correctly
        return this.hasParagraphWrapper(content) ? content : `<p>${content}</p>`;
    }

    hasParagraphWrapper(html) {
        const domParser = new DOMParser();
        const doc = domParser.parseFromString(html, 'text/html');

        return doc.body?.firstElementChild?.tagName === 'P';
    }

    @action
    setContent(html) {
        const cleanedHtml = cleanBasicHtml(html || '', {firstChildInnerContent: true});
        this.settings.announcementContent = cleanedHtml;
    }
}
