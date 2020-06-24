/* eslint-disable camelcase */
export default [
    {
        id: 1,
        created_at: '2015-09-11T09:44:30.805Z',
        created_by: 1,
        key: 'title',
        group: 'site',
        updated_at: '2015-10-04T16:26:05.195Z',
        updated_by: 1,
        value: 'Test Blog'
    },
    {
        id: 2,
        created_at: '2015-09-11T09:44:30.806Z',
        created_by: 1,
        key: 'description',
        group: 'site',
        updated_at: '2015-10-04T16:26:05.198Z',
        updated_by: 1,
        value: 'Thoughts, stories and ideas.'
    },
    {
        id: 3,
        key: 'logo',
        value: '/content/images/2013/Nov/logo.png',
        group: 'site',
        created_at: '2013-11-25T14:48:11.000Z',
        created_by: 1,
        updated_at: '2015-10-27T17:39:58.273Z',
        updated_by: 1
    },
    {
        id: 4,
        key: 'cover_image',
        value: '/content/images/2014/Feb/cover.jpg',
        group: 'site',
        created_at: '2013-11-25T14:48:11.000Z',
        created_by: 1,
        updated_at: '2015-10-27T17:39:58.276Z',
        updated_by: 1
    },
    {
        id: 5,
        key: 'lang',
        value: 'en',
        group: 'site',
        created_at: '2013-11-25T14:48:11.000Z',
        created_by: 1,
        updated_at: '2015-10-27T17:39:58.278Z',
        updated_by: 1
    },
    {
        id: 10,
        created_at: '2015-09-11T09:44:30.809Z',
        created_by: 1,
        key: 'codeinjection_head',
        group: 'site',
        updated_at: '2015-09-23T13:32:49.858Z',
        updated_by: 1,
        value: ''
    },
    {
        id: 11,
        created_at: '2015-09-11T09:44:30.809Z',
        created_by: 1,
        key: 'codeinjection_foot',
        group: 'site',
        updated_at: '2015-09-23T13:32:49.858Z',
        updated_by: 1,
        value: ''
    },
    {
        id: 12,
        key: 'labs',
        value: '{}',
        group: 'labs',
        created_at: '2015-01-12T18:29:01.000Z',
        created_by: 1,
        updated_at: '2015-10-27T17:39:58.288Z',
        updated_by: 1
    },
    {
        id: 13,
        created_at: '2015-09-11T09:44:30.810Z',
        created_by: 1,
        key: 'navigation',
        group: 'site',
        updated_at: '2015-09-23T13:32:49.868Z',
        updated_by: 1,
        value: JSON.stringify([
            {label: 'Home', url: '/'},
            {label: 'About', url: '/about'}
        ])
    },
    {
        id: 14,
        created_at: '2015-09-11T09:44:30.810Z',
        created_by: 1,
        key: 'is_private',
        group: 'private',
        updated_at: '2015-09-23T13:32:49.868Z',
        updated_by: 1,
        value: false
    },
    {
        id: 15,
        created_at: '2015-09-11T09:44:30.810Z',
        created_by: 1,
        key: 'password',
        group: 'private',
        updated_at: '2015-09-23T13:32:49.868Z',
        updated_by: 1,
        value: ''
    },
    {
        id: 16,
        created_at: '2016-05-05T15:04:03.115Z',
        created_by: 1,
        key: 'slack',
        group: 'slack',
        updated_at: '2016-05-05T18:33:09.168Z',
        updated_by: 1,
        value: '[{"url":"", "username":"Ghost"}]'
    },
    {
        id: 17,
        created_at: '2016-05-05T15:40:12.133Z',
        created_by: 1,
        key: 'facebook',
        group: 'site',
        updated_at: '2016-05-08T15:20:25.953Z',
        updated_by: 1,
        value: 'test'
    },
    {
        id: 18,
        created_at: '2016-05-05T15:40:12.134Z',
        created_by: 1,
        key: 'twitter',
        group: 'site',
        updated_at: '2016-05-08T15:20:25.954Z',
        updated_by: 1,
        value: '@test'
    },
    {
        id: 19,
        created_at: '2015-09-11T09:44:30.810Z',
        created_by: 1,
        key: 'timezone',
        group: 'site',
        updated_at: '2015-09-23T13:32:49.868Z',
        updated_by: 1,
        value: 'Etc/UTC'
    },
    {
        id: 21,
        created_at: '2017-01-09T08:40:59.000Z',
        created_by: 1,
        key: 'amp',
        group: 'amp',
        updated_at: '2017-01-09T08:49:42.991Z',
        updated_by: 1,
        value: 'true'
    },
    {
        id: 22,
        key: 'icon',
        value: '/content/images/2014/Feb/favicon.ico',
        group: 'site',
        created_at: '2013-11-25T14:48:11.000Z',
        created_by: 1,
        updated_at: '2015-10-27T17:39:58.276Z',
        updated_by: 1
    },
    {
        id: 23,
        group: 'members',
        key: 'members_subscription_settings',
        value: '{"allowSelfSignup":true,"fromAddress":"noreply","paymentProcessors":[{"adapter":"stripe","config":{"secret_token":"","public_token":"","product":{"name":"Ghost Subscription"},"plans":[{"name":"Monthly","currency":"usd","interval":"month","amount":""},{"name":"Yearly","currency":"usd","interval":"year","amount":""}]}}]}',
        created_at: '2019-10-09T09:49:00.000Z',
        created_by: 1,
        updated_at: '2019-10-09T09:49:00.000Z',
        updated_by: 1
    },
    {
        id: 24,
        group: 'email',
        key: 'bulk_email_settings',
        value: '{"provider":"mailgun","apiKey":"","domain":"","baseUrl":""}',
        created_at: '2019-10-09T09:49:00.000Z',
        created_by: 1,
        updated_at: '2019-10-09T09:49:00.000Z',
        updated_by: 1
    },
    {
        id: 25,
        key: 'secondary_navigation',
        group: 'site',
        created_at: '2019-11-20T09:44:30.810Z',
        created_by: 1,
        updated_at: '2019-11-20T13:32:49.868Z',
        updated_by: 1,
        value: JSON.stringify([])
    }
];
