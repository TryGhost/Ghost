import {handlers} from './handlers';
import {server} from './node';
import {worker} from './browser';

// Export everything needed for MSW testing
export {
    handlers,
    server,
    worker
}; 