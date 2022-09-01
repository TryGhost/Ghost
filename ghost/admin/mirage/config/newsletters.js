import {camelize} from '@ember/string';
import {dasherize} from '@ember/string';
import {isBlank} from '@ember/utils';
import {paginatedResponse} from '../utils';

export default function mockNewsletters(server) {
    server.get('/newsletters/', paginatedResponse('newsletters'));
    server.get('/newsletters/:id/');

    server.post('/newsletters/', function ({newsletters}, {queryParams}) {
        const attrs = this.normalizedRequestAttrs();

        // sender email can't be set without verification
        const senderEmail = attrs.senderEmail;
        attrs.senderEmail = null;

        if (isBlank(attrs.slug) && !isBlank(attrs.name)) {
            attrs.slug = dasherize(attrs.name);
        }

        const newsletter = newsletters.create(attrs);

        // workaround for mirage output of meta
        const collection = newsletters.where({id: newsletter.id});

        if (senderEmail) {
            collection.meta = {
                sent_email_verification: ['sender_email']
            };
        }

        if (queryParams.opt_in_existing === 'true') {
            newsletters.all().models.forEach((n) => {
                newsletter.members.mergeCollection(n.members);
            });
            newsletter.save();
        }

        return collection;
    });

    server.put('/newsletters/:id/', function ({newsletters}, {params}) {
        const attrs = this.normalizedRequestAttrs();
        const newsletter = newsletters.find(params.id);

        const previousSenderEmail = newsletter.senderEmail;
        const newSenderEmail = attrs.senderEmail;

        // sender email can't be changed without verification
        if (newSenderEmail && newSenderEmail !== previousSenderEmail) {
            // It doesn't correctly return to the previous email if previousSenderEmail is undefined
            attrs.senderEmail = previousSenderEmail === undefined ? null : previousSenderEmail;
        }

        newsletter.update(attrs);

        // workaround for mirage output of meta
        const collection = newsletters.where({id: newsletter.id});

        if (newSenderEmail && newSenderEmail !== previousSenderEmail) {
            collection.meta = {
                sent_email_verification: ['sender_email']
            };

            const tokenData = {
                id: newsletter.id,
                email: newSenderEmail,
                type: 'sender_email'
            };
            const token = btoa(JSON.stringify(tokenData));
            const baseUrl = window.location.href.replace(window.location.hash, '');
            const verifyUrl = `${baseUrl}settings/newsletters/?verifyEmail=${token}`;
            // eslint-disable-next-line
            console.warn('Verification email sent. Mocked verification URL:', verifyUrl);
        }

        return collection;
    });

    // verify email update
    server.put('/newsletters/verifications/', function ({newsletters}, request) {
        const requestBody = JSON.parse(request.requestBody);
        const tokenData = JSON.parse(atob(requestBody.token));

        const newsletter = newsletters.find(tokenData.id);

        newsletter[camelize(tokenData.type)] = tokenData.email;

        return newsletter.save();
    });
}
