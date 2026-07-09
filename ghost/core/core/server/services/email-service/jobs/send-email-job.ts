/** Carries only the emailId; the handler refetches the email to lock and check its status. */
export default class SendEmailJob {
    static type = 'send-email';

    readonly data: {emailId: string};

    constructor(data: {emailId: string}) {
        this.data = data;
    }
}
