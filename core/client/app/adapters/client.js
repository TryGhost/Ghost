import ApplicationAdapter from 'ghost/adapters/application';
import SlugUrl from 'ghost/mixins/slug-url';

export default ApplicationAdapter.extend(SlugUrl, {
  // urlForUpdateRecord(id, modelName, snapshot) {
  //   let namespace = this.get('namespace');
  //   let { id } = snapshot.attributes();
  //   return `${namespace}/clients/${id}`;
  // }
});
