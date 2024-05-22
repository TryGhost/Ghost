import {SelectOptionGroup} from '@tryghost/admin-x-design-system';

const webhookEventOptions: SelectOptionGroup[] = [
    {
        label: 'Global',
        options: [{value: 'site.changed', label: 'Site changed (rebuild)'}]
    },
    {
        label: 'Posts',
        options: [
            {value: 'post.added', label: 'Post created'},
            {value: 'post.deleted', label: 'Post deleted'},
            {value: 'post.edited', label: 'Post updated'},
            {value: 'post.published', label: 'Post published'},
            {value: 'post.published.edited', label: 'Published post updated'},
            {value: 'post.unpublished', label: 'Post unpublished'},
            {value: 'post.scheduled', label: 'Post scheduled'},
            {value: 'post.unscheduled', label: 'Post unscheduled'},
            {value: 'post.tag.attached', label: 'Tag added to post'},
            {value: 'post.tag.detached', label: 'Tag removed from post'}
        ]
    },
    {
        label: 'Pages',
        options: [
            {value: 'page.added', label: 'Page created'},
            {value: 'page.deleted', label: 'Page deleted'},
            {value: 'page.edited', label: 'Page updated'},
            {value: 'page.published', label: 'Page published'},
            {value: 'page.published.edited', label: 'Published page updated'},
            {value: 'page.unpublished', label: 'Page unpublished'},
            {value: 'page.tag.attached', label: 'Tag added to page'},
            {value: 'page.tag.detached', label: 'Tag removed from page'}
        ]
    },
    {
        label: 'Tags',
        options: [
            {value: 'tag.added', label: 'Tag created'},
            {value: 'tag.edited', label: 'Tag updated'},
            {value: 'tag.deleted', label: 'Tag deleted'}
        ]
    },
    {
        label: 'Members',
        options: [
            {value: 'member.added', label: 'Member added'},
            {value: 'member.edited', label: 'Member updated'},
            {value: 'member.deleted', label: 'Member deleted'}
        ]
    }
];

export default webhookEventOptions;

export const getWebhookEventLabel = (value: string) => {
    const option = webhookEventOptions.flatMap(({options}) => options).find(opt => opt.value === value);
    return option?.label;
};
