import '@testing-library/jest-dom';
import { setupShadeMocks } from '@tryghost/admin-x-framework/test/setup';

import { installConsoleErrorGate } from '@test-utils/console-error-gate';

setupShadeMocks();
installConsoleErrorGate();
