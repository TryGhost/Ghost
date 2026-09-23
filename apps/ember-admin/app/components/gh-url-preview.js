import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';
import {computed} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';

/*
Example usage:
<GhUrlPreview @prefix="tag" @slug={{theSlugValue}} @tagName="p" @classNames="description" />
*/
@classic
@classNames('ghost-url-preview')
export default class GhUrlPreview extends Component {
    @inject config;

    prefix = null;
    slug = null;

    @computed('slug')
    get url() {
        // Get the blog URL and strip the scheme
        const blogUrl = this.config.blogUrl;
        // Remove `http[s]://`
        const noSchemeBlogUrl = blogUrl.substr(blogUrl.indexOf('://') + 3);

        // Get the prefix and slug values
        const prefix = this.prefix ? `${this.prefix}/` : '';
        const slug = this.slug ? `${this.slug}/` : '';

        // Join parts of the URL together with slashes
        const theUrl = `${noSchemeBlogUrl}/${prefix}${slug}`;

        return theUrl;
    }
}
