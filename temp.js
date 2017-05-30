'use strict';

var users = [{
    "id": 1,
    "uuid": "1e2a7354-f580-4deb-9801-ca286628125a",
    "name": "cobbspur - blog owner",
    "slug": "cobbspur",
    "password": "$2a$10$1qSV.3owea01INfkP3G7pOrztNy26dJozuPsTz4Gpn393aJfxeq/G",
    "email": "cobbspur@hotmail.com",
    "image": "/content/images/2017/05/authorlogo.jpeg",
    "cover": "/content/images/2017/05/authorcover.jpeg",
    "bio": null,
    "website": null,
    "location": null,
    "facebook": null,
    "twitter": null,
    "accessibility": null,
    "status": "active",
    "language": "en_US",
    "visibility": "public",
    "meta_title": null,
    "meta_description": null,
    "tour": null,
    "last_login": "2017-05-30T10:39:32.000Z",
    "created_at": "2016-10-28T13:43:36.000Z",
    "created_by": 1,
    "updated_at": "2017-05-30T12:02:35.000Z",
    "updated_by": 1
}];
//
var _ = require('lodash');

//
// var thing = _.map(users[0], function(value, key) {
//     key = legacyKeys[key] || key;
//
//     return key[value];
// });
//
// console.log('thing', thing)
let items = [ { oldKey: 'oldValue' /*...*/ } ]

let legacyKeys = {
    image: 'profile_image',
    cover: 'cover_image'
};

let legacyKeyMapper = item => _(item) // lodash chain start
    .mapKeys( (v, k)=> legacyKeys[k] || k )
    .value() // lodash chain end

let remappedItems = users.map(legacyKeyMapper)

console.log(remappedItems)
