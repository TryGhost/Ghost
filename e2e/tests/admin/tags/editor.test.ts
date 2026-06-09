import {defineTagDetailsTests} from './tag-details-suite';
import {test} from '@/helpers/playwright';

// Runs the shared tag detail suite against the Ember implementation
// (labs flag `tagDetailsX` off, which is the default).
test.describe('Ghost Admin - Tags Editor', () => {
    defineTagDetailsTests();
});
