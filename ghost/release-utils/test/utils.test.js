// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const lib = require('../lib');

describe('Utils', function () {
    describe('filterEmojiCommits', function () {
        it('no emoji commits found', function () {
            const result = lib.utils.filterEmojiCommits([
                '1234567890 * [f6f35ebcd](https://github.com/TryGhost/Ghost/commit/f6f35ebcd) Version bump to 2.17.1 - Name',
                '1234567890 * [f6f35ebcd](https://github.com/TryGhost/Ghost/commit/f6f35ebcd) Version bump to 2.17.1 - Name'
            ]);

            result.length.should.eql(0);
        });

        it('emoji commits found', function () {
            const result = lib.utils.filterEmojiCommits([
                '1234567890 * [f6f35ebcd](https://github.com/TryGhost/Ghost/commit/f6f35ebcd) Version bump to 2.17.1 - Name',
                '1234567890 * [f6f35ebcd](https://github.com/TryGhost/Ghost/commit/f6f35ebcd) 👻 Version bump to 2.17.1 - Name'
            ]);

            result.length.should.eql(1);
        });
    });
});
