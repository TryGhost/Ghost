import {connectAndSend} from '../../../../core/server/lib/bootstrap-socket';

describe('Connect and send', function () {
    it('Resolves a promise for a bad call', async function () {
        await connectAndSend();
    });
});
