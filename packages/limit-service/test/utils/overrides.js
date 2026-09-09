// This file is imported before any test is run

import shouldModule from 'should';

// `should` installs itself as a non-writable global on import, so it can only be
// re-pointed through its own noConflict()/extend() pair
shouldModule.noConflict().extend();
