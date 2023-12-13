export const posts = [{
    key: 'primary_tag',
    replacement: 'tags.slug',
    expansion: 'posts_tags.sort_order:0+tags.visibility:public'
}, {
    key: 'primary_author',
    replacement: 'authors.slug',
    expansion: 'posts_authors.sort_order:0+authors.visibility:public'
}, {
    key: 'authors',
    replacement: 'authors.slug'
}, {
    key: 'author',
    replacement: 'authors.slug'
}, {
    key: 'tag',
    replacement: 'tags.slug'
}, {
    key: 'tags',
    replacement: 'tags.slug'
}];
