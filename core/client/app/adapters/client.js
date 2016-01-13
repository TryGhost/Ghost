import ApplicationAdapter from 'ghost/adapters/application';
import SlugUrl from 'ghost/mixins/slug-url';

export default ApplicationAdapter.extend(SlugUrl, {
  urlForUpdateRecord(id, modelName, snapshot) {
    let namespace = this.get('namespace');
    let { slug } = snapshot.attributes();
    return `${namespace}/clients/slug/${slug}`;
  }
});
