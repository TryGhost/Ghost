import Component from '@glimmer/component';

export default class PostsList extends Component {
    get list() {
        return this.args.list;
    }

    deletePosts(menu) {
        alert('Deleting posts not yet supported.');
        menu.close();
    }
}
