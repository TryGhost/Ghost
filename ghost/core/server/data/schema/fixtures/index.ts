import { FixtureManager, type Fixtures } from './fixture-manager';
import config from '../../../../shared/config';

const fixturePath = config.get('paths').fixtures;
const fixtures: Fixtures = require(fixturePath);

export { FixtureManager };
export const fixtureManager = new FixtureManager(fixtures, {
  __OWNER_USER_ID__: (models) => models.User.generateId(),
});
