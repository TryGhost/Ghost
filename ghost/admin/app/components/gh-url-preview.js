import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

/*
Example usage:
{{gh-url-preview prefix="tag" slug=theSlugValue tagName="p" classNames="description"}}
*/
@classic
@classNames('ghost-url-preview')
export default class GhUrlPreview extends Component {
    @service config;

    prefix = null;
    slug = null;

    @computed('slug')
    get url() {
        // Get the blog URL and strip the scheme
        let blogUrl = this.get('config.blogUrl');
        // Remove `http[s]://`
        let noSchemeBlogUrl = blogUrl.substr(blogUrl.indexOf('://') + 3);

        // Get the prefix and slug values
        let prefix = this.prefix ? `${this.prefix}/` : '';
        let slug = this.slug ? `${this.slug}/` : '';

        // Join parts of the URL together with slashes
        let theUrl = `${noSchemeBlogUrl}/${prefix}${slug}`;

        return theUrl;
    }
}
