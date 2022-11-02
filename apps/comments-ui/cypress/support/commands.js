import {buildComment, buildMember} from '../../src/utils/test-utils';
let loggedInMember = null;

Cypress.Commands.add('login', (memberData) => {
    loggedInMember = buildMember(memberData);
    return cy.intercept(
        {
            method: 'GET',
            url: '/members/api/member/'
        },
        loggedInMember
    );
});

Cypress.Commands.add('mockAddComments', () => {
    cy.intercept(
        {
            method: 'GET',
            url: '/members/api/comments/counts/'
        },
        [] // and force the response to be: []
    ).as('getCounts'); // and assign an alias

    return cy.intercept(
        {
            method: 'POST',
            url: '/members/api/comments/'
        },
        (req) => {
            const commentData = req.body;
            req.reply({
                body: {
                    comments: [
                        buildComment({
                            ...commentData?.comments[0],
                            member: loggedInMember
                        })
                    ]
                }
            });
        }
    ).as('getCounts');
});
Cypress.Commands.add('mockComments', (count, override = {}) => {
    const limit = 5;
    const pages = Math.max(Math.ceil(count / limit), 1);

    cy.intercept(
        {
            method: 'GET',
            url: '/members/api/comments/counts/'
        },
        []
    ).as('getCounts');

    return cy.intercept('GET', '/members/api/comments/*',
        (req) => {
            const page = parseInt(req.query.page ?? '1');

            if (!page || page > pages) {
                throw new Error('Invalid page');
            }

            if (page == 1) {
                req.alias = 'getComments';
            } else {
                req.alias = 'getCommentsPage' + page;
            }

            req.reply({
                body: {
                    comments: new Array(Math.min(count - (page - 1) * limit, limit)).fill(null).map(() => buildComment(override)),
                    meta: {
                        pagination: {
                            limit: limit,
                            total: count,
                            next: page + 1 <= pages ? page + 1 : null,
                            prev: page > 1 ? page - 1 : null,
                            page: page
                        }
                    }
                }
            });
        }
    );
});

const getIframeDocument = (title) => {
    return cy
        .get('iframe[title="' + title + '"]')
        .its('0.contentDocument');
};

const getIframeBody = (title) => {
    return getIframeDocument(title)
        .its('body')
        .then(cy.wrap);
};

Cypress.Commands.add('iframe', () => {
    return getIframeBody('comments-frame');
});

Cypress.Commands.add('popup', (name) => {
    return getIframeBody(name);
});
