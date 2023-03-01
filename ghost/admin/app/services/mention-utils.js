import Service, {inject as service} from '@ember/service';

export default class MentionUtilsService extends Service {
    @service store;

    async loadGroupedMentions(mentions) {
        // Fetch mentions with the same source
        const sources = mentions.mapBy('source').uniq();
        const sourceMentions = await this.store.query('mention', {filter: `source:[${sources.map(s => `'${s}'`).join(',')}]`});
        mentions.forEach((mention) => {
            mention.set('mentions', sourceMentions.filterBy('source', mention.source));
        });
        return mentions;
    }
}
