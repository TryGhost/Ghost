import Component from '@glimmer/component';

export default class PostsList extends Component {
    get list() {
        return this.args.list;
    }
}
