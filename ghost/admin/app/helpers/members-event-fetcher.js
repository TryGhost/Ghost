import moment from 'moment-timezone';
import {Resource} from 'ember-could-get-used-to-this';
import {TrackedArray} from 'tracked-built-ins';
import {action} from '@ember/object';
import {didCancel, task} from 'ember-concurrency';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class MembersEventsFetcher extends Resource {
    @service ajax;
    @service ghostPaths;
    @service store;
    @service feature;

    @tracked data = new TrackedArray([]);
    @tracked isLoading = false;
    @tracked isError = false;
    @tracked errorMessage = null;
    @tracked hasReachedEnd = false;

    /**
     * Keep track whether we have multiple newsletters (required for parsing events)
    */
    @tracked hasMultipleNewsletters = null;

    cursor = null;

    get value() {
        return {
            isLoading: this.isLoading,
            isError: this.isError,
            errorMessage: this.errorMessage,
            data: this.data,
            loadNextPage: this.loadNextPage,
            hasReachedEnd: this.hasReachedEnd,
            hasMultipleNewsletters: this.hasMultipleNewsletters
        };
    }

    async setup() {
        this.cursor = moment.utc().format('YYYY-MM-DD HH:mm:ss');
        let filter = `data.created_at:<'${this.cursor}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        // Can't get this working with Promise.all, somehow results in an infinite loop
        try {
            await this.loadEventsTask.perform({filter});
            await this.loadMultipleNewslettersTask.perform();
        } catch (e) {
            if (!didCancel(e)) {
                // re-throw the non-cancelation error
                throw e;
            }
        }
    }

    @action
    loadNextPage() {
        // NOTE: assumes data is always ordered by created_at desc
        const lastEvent = this.data[this.data.length - 1];

        if (!lastEvent?.data?.created_at) {
            this.hasReachedEnd = true;
            return;
        }

        const cursor = moment.utc(lastEvent.data.created_at).format('YYYY-MM-DD HH:mm:ss');

        if (cursor === this.cursor) {
            this.hasReachedEnd = true;
            return;
        }

        this.cursor = cursor;
        let filter = `data.created_at:<'${this.cursor}'`;

        if (this.args.named.filter) {
            filter += `+${this.args.named.filter}`;
        }

        this.loadEventsTask.perform({filter});
    }

    /**
     * We need to know whether we have multiple newsletters so we can hide/show the newsletter name
     */
    @task
    *loadMultipleNewslettersTask() {
        try {
            const res = yield this.store.query('newsletter', {filter: 'status:active', include: 'none', limit: 1});
            const newsletterCount = res.meta.pagination.total;
            this.hasMultipleNewsletters = newsletterCount > 1;
        } catch (e) {
            // Default to true (harms the least)
            this.hasMultipleNewsletters = true;
            console.error(e); // eslint-disable-line
        }
    }

    @task
    *loadEventsTask(queryParams) {
        try {
            this.isLoading = true;

            const url = this.ghostPaths.url.api('members/events');
            const data = Object.assign({}, queryParams, {limit: this.args.named.pageSize});
            const {events} = yield this.ajax.request(url, {data});

            if (events.length < data.limit) {
                this.hasReachedEnd = true;
            }

            this.data.push(...events);

            // todo: remove all condition block when backend will be ready
            if (this.feature.suppressionList && !queryParams.filter.includes('email_delivered_event')) {
                const memberId = this.args.named.memberId;
                if (!this.args.named.memberId) {
                    return;
                }
                const member = yield this.store.findRecord('member', memberId);
                if (member.email === 'spam@member.test') {
                    this.data.unshift(mockData('email_delivered_event'));
                    this.data.unshift(mockData('email_complaint_event'));
                }

                if (member.email === 'fail@member.test') {
                    this.data.unshift(mockData('email_failed_event'));
                }
            }
        } catch (e) {
            this.isError = true;

            const errorMessage = e.payload?.errors?.[0]?.message;
            if (errorMessage) {
                this.errorMessage = errorMessage;
            }

            // TODO: log to Sentry
            console.error(e); // eslint-disable-line
        } finally {
            this.isLoading = false;
        }
    }
}

function mockData(eventType) {
    return ({
        type: eventType,
        data: {
            id: '6375cc411ebedb499bef54c7',
            member_id: '63737a1719675aed3b7cc988',
            created_at: moment.utc(),
            member: {
                id: '63737a1719675aed3b7cc988',
                uuid: '5c753e47-9f49-43ad-86d4-c5c0168519a2',
                email: 'spam@member.test',
                status: 'free',
                name: 'Spam',
                expertise: null,
                note: null,
                geolocation: null,
                enable_comment_notifications: true,
                email_count: 6,
                email_opened_count: 2,
                email_open_rate: 33,
                last_seen_at: '2022-11-16T04:44:19.000Z',
                last_commented_at: null,
                created_at: '2022-11-15T11:37:59.000Z',
                updated_at: '2022-11-17T05:33:13.000Z',
                avatar_image: 'https://www.gravatar.com/avatar/0e0d23869265932bca724acda6c7e529?s=250&r=g&d=blank'
            },
            email: {
                id: '6375cc411ebedb499bef54c4',
                post_id: '6375cc3e1ebedb499bef54b5',
                uuid: '01f393bd-b487-4540-995f-d09ad47059d8',
                status: 'submitted',
                recipient_filter: 'all',
                error: null,
                error_data: '[]',
                email_count: 2,
                delivered_count: 2,
                opened_count: 0,
                failed_count: 0,
                subject: 'Spam test',
                from: '"local"<localhost@example.com>',
                reply_to: 'noreply@localhost',
                html: '<!doctype html>\n<html>\n\n<head>\n<meta name="viewport" content="width=device-width">\n<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->\n<title>Spam test</title>\n<style>\n.post-title-link {\n  color: #15212A;\n  display: block;\n  text-align: center;\n  margin-top: 50px;\n}\n.post-title-link-left {\n  text-align: left;\n}\n.view-online-link {\n  word-wrap: none;\n  white-space: nowrap;\n  color: #15212A;\n}\n.kg-nft-link {\n  display: block;\n  text-decoration: none !important;\n  color: #15212A !important;\n  font-family: inherit !important;\n  font-size: 14px;\n  line-height: 1.3em;\n  padding-top: 4px;\n  padding-right: 20px;\n  padding-left: 20px;\n  padding-bottom: 4px;\n}\n.kg-twitter-link {\n  display: block;\n  text-decoration: none !important;\n  color: #15212A !important;\n  font-family: inherit !important;\n  font-size: 15px;\n  padding: 8px;\n  line-height: 1.3em;\n}\n@media only screen and (max-width: 620px) {\n  table.body {\n    width: 100%;\n    min-width: 100%;\n  }\n\n  table.body p,\ntable.body ul,\ntable.body ol,\ntable.body td,\ntable.body span {\n    font-size: 16px !important;\n  }\n\n  table.body pre {\n    white-space: pre-wrap !important;\n    word-break: break-word !important;\n  }\n\n  table.body .wrapper,\ntable.body .article {\n    padding: 0 10px !important;\n  }\n\n  table.body .content {\n    padding: 0 !important;\n  }\n\n  table.body .container {\n    padding: 0 !important;\n    width: 100% !important;\n  }\n\n  table.body .main {\n    border-left-width: 0 !important;\n    border-radius: 0 !important;\n    border-right-width: 0 !important;\n  }\n\n  table.body .btn table {\n    width: 100% !important;\n  }\n\n  table.body .btn a {\n    width: 100% !important;\n  }\n\n  table.body .img-responsive {\n    height: auto !important;\n    max-width: 100% !important;\n    width: auto !important;\n  }\n\n  table.body .site-icon img {\n    width: 40px !important;\n    height: 40px !important;\n  }\n\n  table.body .site-url a {\n    font-size: 14px !important;\n    padding-bottom: 15px !important;\n  }\n\n  table.body .post-meta {\n    white-space: normal !important;\n    font-size: 12px !important;\n    line-height: 1.5em;\n  }\n\n  table.body .view-online-link,\ntable.body .footer,\ntable.body .footer a {\n    font-size: 12px !important;\n  }\n\n  table.body .post-title a {\n    font-size: 32px !important;\n    line-height: 1.15em !important;\n  }\n\n  table.body .kg-bookmark-card {\n    width: 90vw !important;\n  }\n\n  table.body .kg-bookmark-thumbnail {\n    display: none !important;\n  }\n\n  table.body .kg-bookmark-metadata span {\n    font-size: 13px !important;\n  }\n\n  table.body .kg-embed-card {\n    max-width: 90vw !important;\n  }\n\n  table.body h1 {\n    font-size: 32px !important;\n    line-height: 1.3em !important;\n  }\n\n  table.body h2 {\n    font-size: 26px !important;\n    line-height: 1.22em !important;\n  }\n\n  table.body h3 {\n    font-size: 21px !important;\n    line-height: 1.25em !important;\n  }\n\n  table.body h4 {\n    font-size: 19px !important;\n    line-height: 1.3em !important;\n  }\n\n  table.body h5 {\n    font-size: 16px !important;\n    line-height: 1.4em !important;\n  }\n\n  table.body h6 {\n    font-size: 16px !important;\n    line-height: 1.4em !important;\n  }\n\n  table.body blockquote {\n    font-size: 17px;\n    line-height: 1.6em;\n    margin-bottom: 0;\n    padding-left: 15px;\n  }\n\n  table.body blockquote.kg-blockquote-alt {\n    border-left: 0 none !important;\n    margin: 0 0 2.5em 0 !important;\n    padding: 0 50px 0 50px !important;\n    font-size: 1.2em;\n  }\n\n  table.body blockquote + * {\n    margin-top: 1.5em !important;\n  }\n\n  table.body hr {\n    margin: 2em 0 !important;\n  }\n\n  table.body figcaption,\ntable.body figcaption a {\n    font-size: 13px !important;\n  }\n}\n@media all {\n  .ExternalClass {\n    width: 100%;\n  }\n\n  .ExternalClass,\n.ExternalClass p,\n.ExternalClass span,\n.ExternalClass font,\n.ExternalClass td,\n.ExternalClass div {\n    line-height: 100%;\n  }\n\n  .apple-link a {\n    color: inherit !important;\n    font-family: inherit !important;\n    font-size: inherit !important;\n    font-weight: inherit !important;\n    line-height: inherit !important;\n    text-decoration: none !important;\n  }\n\n  #MessageViewBody a {\n    color: inherit;\n    text-decoration: none;\n    font-size: inherit;\n    font-family: inherit;\n    font-weight: inherit;\n    line-height: inherit;\n  }\n\n  .btn-primary table td:hover {\n    background-color: #34495e !important;\n  }\n\n  .btn-primary a:hover {\n    background-color: #34495e !important;\n    border-color: #34495e !important;\n  }\n}\n@media (prefers-color-scheme: dark) {\n  .like-icon {\n    mix-blend-mode: initial !important;\n  }\n\n  .dislike-icon {\n    mix-blend-mode: initial !important;\n  }\n}\n</style>\n</head>\n\n<body style="background-color: #fff; font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; -webkit-font-smoothing: antialiased; font-size: 18px; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; color: #15212A;">\n    <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">Spam test &#x2013; </span>\n    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #fff; width: 100%;" bgcolor="#fff">\n\n        <!-- Outlook doesn\'t respect max-width so we need an extra centered table -->\n        <!--[if mso]>\n        <tr>\n            <td>\n                <center>\n                    <table border="0" cellpadding="0" cellspacing="0" width="600">\n        <![endif]-->\n\n        <tr>\n            <td style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A;" valign="top">&#xA0;</td>\n            <td class="container" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; display: block; max-width: 600px; margin: 0 auto;" valign="top">\n                <div class="content" style="box-sizing: border-box; display: block; margin: 0 auto; max-width: 600px;">\n                    <!-- START CENTERED WHITE CONTAINER -->\n                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="main" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #ffffff; border-radius: 3px; width: 100%;">\n\n                        <!-- START MAIN CONTENT AREA -->\n                        <tr>\n                            <td class="wrapper" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; box-sizing: border-box; padding: 0 20px;" valign="top">\n                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">\n                                    \n\n\n                                    \n                                    <tr>\n                                        <td class="site-info-bordered" width="100%" align="center" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; padding-top: 50px; border-bottom: 1px solid #e5eff5;" valign="top">\n                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;" width="100%">\n                                                \n                                                \n                                                <tr>\n                                                    <td class="site-url site-url-bottom-padding" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; vertical-align: top; color: #15212A; font-size: 16px; letter-spacing: -0.1px; font-weight: 700; text-transform: uppercase; text-align: center; padding-bottom: 50px;" valign="top" align="center"><div style="width: 100% !important;"><a href="http://localhost:2368/r/006a195b?m=%%{uuid}%%" class="site-title" style="text-decoration: none; color: #15212A; overflow-wrap: anywhere;" target="_blank">local</a></div></td>\n                                                </tr>\n                                                \n                                                \n                                                \n\n                                            </table>\n                                        </td>\n                                    </tr>\n                                    \n\n\n                                    <tr>\n                                        <td class="post-title  " style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; vertical-align: top; color: #15212A; padding-bottom: 10px; font-size: 42px; line-height: 1.1em; font-weight: 700; text-align: center;" valign="top" align="center">\n                                            <a href="http://localhost:2368/r/46741167?m=%%{uuid}%%" class="post-title-link " style="text-decoration: none; color: #15212A; display: block; text-align: center; margin-top: 50px; overflow-wrap: anywhere;" target="_blank">Spam test</a>\n                                        </td>\n                                    </tr>\n                                    <tr>\n                                        <td style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A;" valign="top">\n                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">\n                                                <tr>\n                                                    <td class="post-meta " style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; vertical-align: top; padding-bottom: 50px; white-space: nowrap; color: #738a94; font-size: 13px; letter-spacing: 0.2px; text-transform: uppercase; text-align: center;" valign="top" align="center">\n                                                        By Local Local &#x2013;\n                                                        17 Nov 2022 &#x2013;\n                                                        <a href="http://localhost:2368/r/234451af?m=%%{uuid}%%" class="view-online-link" style="text-decoration: none; word-wrap: none; white-space: nowrap; color: #15212A; overflow-wrap: anywhere;" target="_blank">View online &#x2192;</a>\n                                                    </td>\n                                                </tr>\n                                            </table>\n                                        </td>\n                                    </tr>\n                                    \n                                    \n                                    <tr>\n                                        <td class="post-content-sans-serif" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; vertical-align: top; font-size: 17px; line-height: 1.5em; color: #15212A; padding-bottom: 20px; border-bottom: 1px solid #e5eff5; max-width: 600px;" valign="top">\n                                            <!-- POST CONTENT START -->\n                                            \n                                            <!-- POST CONTENT END -->\n                                        </td>\n                                    </tr>\n                                </table>\n                            </td>\n                        </tr>\n\n                        <!-- END MAIN CONTENT AREA -->\n\n                        \n        <tr>\n            <td dir="ltr" width="100%" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; background-color: #ffffff; text-align: center; padding: 40px 4px; border-bottom: 1px solid #e5eff5;" align="center" bgcolor="#ffffff" valign="top">\n                <h3 style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; line-height: 1.11em; font-weight: 700; text-rendering: optimizeLegibility; margin: 1.5em 0 0.5em 0; text-align: center; margin-bottom: 22px; font-size: 17px; letter-spacing: -0.2px; margin-top: 0;">Give feedback on this post</h3>\n                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: auto; width: auto;">\n                    <tr>\n                        \n         <td dir="ltr" valign="top" align="center" style="vertical-align: top; color: #70002D; font-family: inherit; font-size: 14px; text-align: center; padding: 0 8px;" nowrap>\n            <table class="feedback-buttons" align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #FF1A7510; overflow: hidden; border-radius: 22px; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;" bgcolor="#FF1A7510">\n                <tr>\n                    <td width="16" height="38" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A;" valign="top"></td>\n                    <td class="like-icon" background="https://static.ghost.org/v5.0.0/images/thumbs-up.png" bgcolor="#70002D" width="24" height="38" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; color: #15212A; mix-blend-mode: darken; background-image: url(https://static.ghost.org/v5.0.0/images/thumbs-up.png); vertical-align: middle; text-align: center; background-size: cover; background-position: 0 50%; background-repeat: no-repeat;" align="center">\n                        <!--[if gte mso 9]>\n                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:18pt;height:29.5pt;">\n                            <v:fill origin="0.5, 0.5" position="0.5, 0.5" type="tile" src=https://static.ghost.org/v5.0.0/images/thumbs-up.png color="#70002D" size="1,1" aspect="atleast" />\n                            <v:textbox inset="0,0,0,0">\n                        <![endif]-->\n                        <div>\n                            <a style="color: #FF1A75; text-decoration: none; overflow-wrap: anywhere; background-color: #FF1A7510; border: none; width: 24px; height: 38px; display: block;" href="http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/1/?uuid=%%{uuid}%%" target="_blank"></a>\n                        </div>\n                        <!--[if gte mso 9]>\n                        </v:textbox>\n                        </v:rect>\n                        <![endif]-->\n                    </td>\n                    <td style="text-align: right; font-size: 18px; vertical-align: middle; background-position: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; color: #70002D;" align="right" valign="middle">\n                        <div style="color: #70002D"><!--[if mso]>\n                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href=http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/1/?uuid=%%{uuid}%% style="height:29.5pt;v-text-anchor:middle;width:93pt;" stroke="f">\n                                <w:anchorlock/>\n                                <center>\n                            <![endif]-->\n                            <a href="http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/1/?uuid=%%{uuid}%%" target="_blank" style="overflow-wrap: anywhere; padding: 0 8px 0 8px; border-radius: 0 22px 22px 0; display: inline-block; font-family: inherit; font-size: 14px; font-weight: bold; line-height: 38px; text-align: left; text-decoration: none; width: 100px; -webkit-text-size-adjust: none; color: #70002D;">\n                              More like this</a>\n                            <!--[if mso]>\n                            </center>\n                            </v:rect>\n                            <![endif]--></div>\n                    </td>\n                </tr>\n            </table>\n        </td>\n    \n                        \n         <td dir="ltr" valign="top" align="center" style="vertical-align: top; color: #70002D; font-family: inherit; font-size: 14px; text-align: center; padding: 0 8px;" nowrap>\n            <table class="feedback-buttons" align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #FF1A7510; overflow: hidden; border-radius: 22px; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;" bgcolor="#FF1A7510">\n                <tr>\n                    <td width="16" height="38" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A;" valign="top"></td>\n                    <td class="dislike-icon" background="https://static.ghost.org/v5.0.0/images/thumbs-down.png" bgcolor="#70002D" width="24" height="38" valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; color: #15212A; mix-blend-mode: darken; background-image: url(https://static.ghost.org/v5.0.0/images/thumbs-down.png); vertical-align: middle; text-align: center; background-size: cover; background-position: 0 50%; background-repeat: no-repeat;" align="center">\n                        <!--[if gte mso 9]>\n                        <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:18pt;height:29.5pt;">\n                            <v:fill origin="0.5, 0.5" position="0.5, 0.5" type="tile" src=https://static.ghost.org/v5.0.0/images/thumbs-down.png color="#70002D" size="1,1" aspect="atleast" />\n                            <v:textbox inset="0,0,0,0">\n                        <![endif]-->\n                        <div>\n                            <a style="color: #FF1A75; text-decoration: none; overflow-wrap: anywhere; background-color: #FF1A7510; border: none; width: 24px; height: 38px; display: block;" href="http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/0/?uuid=%%{uuid}%%" target="_blank"></a>\n                        </div>\n                        <!--[if gte mso 9]>\n                        </v:textbox>\n                        </v:rect>\n                        <![endif]-->\n                    </td>\n                    <td style="text-align: right; font-size: 18px; vertical-align: middle; background-position: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; color: #70002D;" align="right" valign="middle">\n                        <div style="color: #70002D"><!--[if mso]>\n                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href=http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/0/?uuid=%%{uuid}%% style="height:29.5pt;v-text-anchor:middle;width:93pt;" stroke="f">\n                                <w:anchorlock/>\n                                <center>\n                            <![endif]-->\n                            <a href="http://localhost:2368/spam-test-3/#/feedback/6375cc3e1ebedb499bef54b5/0/?uuid=%%{uuid}%%" target="_blank" style="overflow-wrap: anywhere; padding: 0 8px 0 8px; border-radius: 0 22px 22px 0; display: inline-block; font-family: inherit; font-size: 14px; font-weight: bold; line-height: 38px; text-align: left; text-decoration: none; width: 100px; -webkit-text-size-adjust: none; color: #70002D;">\n                              Less like this</a>\n                            <!--[if mso]>\n                            </center>\n                            </v:rect>\n                            <![endif]--></div>\n                    </td>\n                </tr>\n            </table>\n        </td>\n    \n                    </tr>\n                </table>\n            </td>\n        </tr>\n    \n\n                        <tr>\n                            <td class="wrapper" align="center" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; box-sizing: border-box; padding: 0 20px;" valign="top">\n                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; padding-top: 40px; padding-bottom: 30px;">\n                                    \n                                    <tr>\n                                        <td class="footer" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; vertical-align: top; color: #738a94; margin-top: 20px; text-align: center; font-size: 13px; padding-bottom: 10px; padding-top: 10px; padding-left: 30px; padding-right: 30px; line-height: 1.5em;" valign="top" align="center">local &#xA9; 2022 &#x2013; <a href="%recipient.unsubscribe_url%" style="overflow-wrap: anywhere; color: #738a94; text-decoration: underline;" target="_blank">Unsubscribe</a></td>\n                                    </tr>\n\n                                    \n                                    <tr>\n                                        <td class="footer-powered" style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A; text-align: center; padding-top: 70px; padding-bottom: 40px;" valign="top" align="center"><a href="http://localhost:2368/r/2b962e19?m=%%{uuid}%%" style="color: #FF1A75; text-decoration: none; overflow-wrap: anywhere;" target="_blank"><img src="https://static.ghost.org/v4.0.0/images/powered.png" border="0" width="142" height="30" class="gh-powered" alt="Powered by Ghost" style="border: none; -ms-interpolation-mode: bicubic; max-width: 100%; width: 142px; height: 30px;"></a></td>\n                                    </tr>\n                                    \n                                </table>\n                            </td>\n                        </tr>\n\n                    </table>\n                    <!-- END CENTERED WHITE CONTAINER -->\n                </div>\n            </td>\n            <td style="font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, Roboto, Helvetica, Arial, sans-serif, &apos;Apple Color Emoji&apos;, &apos;Segoe UI Emoji&apos;, &apos;Segoe UI Symbol&apos;; font-size: 18px; vertical-align: top; color: #15212A;" valign="top">&#xA0;</td>\n        </tr>\n\n    <!--[if mso]>\n                    </table>\n                </center>\n            </td>\n        </tr>\n    <![endif]-->\n\n    </table>\n</body>\n\n</html>',
                plaintext: null,
                track_opens: true,
                track_clicks: true,
                submitted_at: '2022-11-17T05:53:05.000Z',
                newsletter_id: '123',
                created_at: '2022-11-17T05:53:05.000Z',
                updated_at: '2022-11-17T05:53:07.000Z',
                feedback_enabled: true
            }
        }
    });
}
