module.exports = [{
    title: 'Index',
    slug: 'index',
    description: 'Collection with all posts',
    type: 'automatic',
    deletable: false,
    filter: 'status:published'
}, {
    title: 'Featured Posts',
    slug: 'featured',
    description: 'Collection of featured posts',
    type: 'automatic',
    deletable: false,
    filter: 'featured:true'
}];
