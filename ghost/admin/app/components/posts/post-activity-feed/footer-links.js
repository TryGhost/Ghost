import Component from '@glimmer/component';

export default class FooterLinks extends Component {
    get feedbackLinks() {
        const post = this.args.post;
        const positiveLink = {filterParam: '(feedback.post_id:' + post.id + '+feedback.score:1)', label: 'More like this'};
        const negativeLink = {filterParam: '(feedback.post_id:' + post.id + '+feedback.score:0)', label: 'Less like this'};

        const data = [
            {link: positiveLink, hidden: !post.count.positive_feedback},
            {link: negativeLink, hidden: !post.count.negative_feedback}
        ];

        const links = this.collectLinks(data);
        return this.addSeparator(links, 'and');
    }

    collectLinks(list) {
        const data = [];
        list.forEach((item) => {
            if (item.hidden) {
                return;
            }

            data.push(item.link);
        });

        return data;
    }

    addSeparator(links, separator) {
        const data = [];
        links.forEach((item, index) => {
            const link = {...item};
            const isLastItem = links.length - 1 === index;

            if (isLastItem) {
                data.push(link);
                return;
            }

            link.separator = separator;
            data.push(link);
        });

        return data;
    }
}
