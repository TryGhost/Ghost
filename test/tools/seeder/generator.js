const faker = require('faker');
const ObjectId = require('bson-objectid');

function html() {
    const numParagraphs = Math.round(Math.random() * 10);
    const paragraphs = [];

    for (let i = 0; i < numParagraphs; i++) {
        paragraphs.push(faker.lorem.sentences());
    }

    return paragraphs.map((p) => {
        return `<p>${p}</p>`;
    }).join('\n');
}

function visibility() {
    const types = ['public', 'draft', 'member', 'paid'];
    const num = Math.floor(Math.random() * (types.length + 1));

    return types[num];
}

function post() {
    return {
        id: ObjectId.generate(),
        title: faker.lorem.words(),
        slug: faker.lorem.slug(),
        html: html(),
        published_at: faker.date.past(),
        feature_image: faker.image.imageUrl(),
        visibility: visibility()
    };
}

function email(index) {
    const fakeEmail = faker.internet.email();

    if (index === -1) {
        return fakeEmail;
    } else {
        const parts = fakeEmail.split('@');
        parts[0] = `${parts[0]}.${index}`;

        return parts.join('@');
    }
}

function member(index = -1) {
    return {
        id: ObjectId.generate(),
        email: email(index),
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
        subscribed: Math.round(Math.random()) // 0 or 1
    };
}

module.exports = {
    post,
    member
};
