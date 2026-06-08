import PostsController from './posts';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

const TYPES = [{
    name: 'All pages',
    value: null
}, {
    name: 'Draft pages',
    value: 'draft'
}, {
    name: 'Published pages',
    value: 'published'
}, {
    name: 'Scheduled pages',
    value: 'scheduled'
}, {
    name: 'Featured pages',
    value: 'featured'
}];

const ORDERS = [{
    name: 'Newest first',
    value: null
}, {
    name: 'Oldest first',
    value: 'published_at asc'
}, {
    name: 'Recently updated',
    value: 'updated_at desc'
}];

export default class PagesController extends PostsController {
    @service router;

    availableTypes = TYPES;
    availableOrders = ORDERS;

    @action
    openEditor(page) {
        this.router.transitionTo('lexical-editor.edit', 'page', page.get('id'));
    }
}