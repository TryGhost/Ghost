import {createKoenigVitestConfig} from '../vitest.shared';

export default createKoenigVitestConfig({
    setupFiles: ['./test/utils/overrides.ts', './test/utils/assertions.ts']
});
