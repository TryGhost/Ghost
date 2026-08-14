import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class TagsManagerService extends Service {
    @tracked tagsScreenInfinityModel = null;

    sortTags(tags = []) {
        return tags
            .filter(tag => tag.get('id') !== null) // exclude unsaved tags
            .sort((tagA, tagB) => tagA.name.localeCompare(tagB.name, undefined, {ignorePunctuation: true}));
    }
}
