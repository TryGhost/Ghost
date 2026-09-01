import { toAccountResponse } from '../../../../../services/members/account';

interface Frame {
  response?: unknown;
}

const serialize = (account: unknown, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toAccountResponse(account as never);
};

// The API framework loads this file with `require()`, so it exports CommonJS-style;
// `export default` would not be picked up.
module.exports = {
  read: serialize,
  update: serialize,
};
