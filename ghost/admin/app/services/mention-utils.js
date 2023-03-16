import Service, {inject as service} from '@ember/service';

export default class MentionUtilsService extends Service {
    @service store;

    async loadGroupedMentions(mentions) {
        // Fetch mentions with the same source
        const sources = mentions.mapBy('source').uniq();
        let filter;
        if (sources.length > 0) {
            filter = `source:[${sources.map(s => `'${s}'`).join(',')}]`;
        }

        const sourceMentions = await this.store.query('mention', {filter});
        mentions.forEach((mention) => {
            mention.set('mentions', sourceMentions.filterBy('source', mention.source));
        });
        return mentions;
    }
}
