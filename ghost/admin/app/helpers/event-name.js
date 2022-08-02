import {helper} from '@ember/component/helper';

export const AVAILABLE_EVENTS = [
    // GROUPNAME: Global
    {event: 'site.changed', name: 'Site changed (rebuild)', group: 'Global'},

    // GROUPNAME: Posts
    {event: 'post.added', name: 'Post created', group: 'Posts'},
    {event: 'post.deleted', name: 'Post deleted', group: 'Posts'},
    {event: 'post.edited', name: 'Post updated', group: 'Posts'},
    {event: 'post.published', name: 'Post published', group: 'Posts'},
    {event: 'post.published.edited', name: 'Published post updated', group: 'Posts'},
    {event: 'post.unpublished', name: 'Post unpublished', group: 'Posts'},
    {event: 'post.scheduled', name: 'Post scheduled', group: 'Posts'},
    {event: 'post.unscheduled', name: 'Post unscheduled', group: 'Posts'},
    {event: 'post.tag.attached', name: 'Tag added to post', group: 'Posts'},
    {event: 'post.tag.detached', name: 'Tag removed from post', group: 'Posts'},

    // GROUPNAME: Pages
    {event: 'page.added', name: 'Page created', group: 'Pages'},
    {event: 'page.deleted', name: 'Page deleted', group: 'Pages'},
    {event: 'page.edited', name: 'Page updated', group: 'Pages'},
    {event: 'page.published', name: 'Page published', group: 'Pages'},
    {event: 'page.published.edited', name: 'Published page updated', group: 'Pages'},
    {event: 'page.unpublished', name: 'Page unpublished', group: 'Pages'},
    {event: 'page.tag.attached', name: 'Tag added to page', group: 'Pages'},
    {event: 'page.tag.detached', name: 'Tag removed from page', group: 'Pages'},

    // GROUPNAME: Tags
    {event: 'tag.added', name: 'Tag created', group: 'Tags'},
    {event: 'tag.edited', name: 'Tag updated', group: 'Tags'},
    {event: 'tag.deleted', name: 'Tag deleted', group: 'Tags'},

    // GROUPNAME: Members
    {event: 'member.added', name: 'Member added', group: 'Members'},
    {event: 'member.edited', name: 'Member updated', group: 'Members'},
    {event: 'member.deleted', name: 'Member deleted', group: 'Members'}
];

export function eventName([event]/*, hash*/) {
    let match = AVAILABLE_EVENTS.findBy('event', event);

    return match ? match.name : event;
}

export default helper(eventName);
