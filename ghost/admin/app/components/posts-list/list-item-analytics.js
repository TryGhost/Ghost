import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatPostTime} from 'ghost-admin/helpers/gh-format-post-time';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class PostsListItemClicks extends Component {
    @service feature;
    @service membersUtils;
    @service session;
    @service settings;
    @service postAnalytics;

    @tracked isHovered = false;
    @tracked tooltipPosition = 'above'; // 'above' or 'below'

    @inject config;

    get post() {
        return this.args.post;
    }

    get errorClass() {
        if (this.post.didEmailFail) {
            return 'error';
        }
        return '';
    }

    get scheduledText() {
        let text = [];

        let formattedTime = formatPostTime(
            this.post.publishedAtUTC,
            {timezone: this.settings.timezone, scheduled: true}
        );
        text.push(formattedTime);

        return text.join(' ');
    }

    get visitorCount() {
        return this.postAnalytics.getVisitorCount(this.post.uuid);
    }

    get hasVisitorData() {
        return this.visitorCount !== null;
    }

    get memberCounts() {
        return this.postAnalytics.getMemberCounts(this.post.uuid);
    }

    get hasMemberData() {
        return this.memberCounts !== null;
    }

    get totalMemberConversions() {
        if (!this.memberCounts) {
            return 0;
        }
        return this.memberCounts.free + this.memberCounts.paid;
    }

    @action
    mouseOver(event) {
        this.isHovered = true;
        this.calculateTooltipPosition(event.currentTarget);
    }

    calculateTooltipPosition(element) {
        const rect = element.getBoundingClientRect();
        const tooltipHeight = 100; // Approximate tooltip height
        const viewportPadding = 10; // Minimum distance from viewport edge

        // Check if there's enough space above the element
        const spaceAbove = rect.top;
        const hasEnoughSpaceAbove = spaceAbove >= (tooltipHeight + viewportPadding);

        this.tooltipPosition = hasEnoughSpaceAbove ? 'above' : 'below';
    }

    @action
    mouseLeave() {
        this.isHovered = false;
    }
}
