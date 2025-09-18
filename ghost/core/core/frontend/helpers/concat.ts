import {SafeString} from '../services/handlebars';
import {HelperOptions} from './types';

// Extend base HelperOptions for concat-specific hash properties
interface ConcatHelperOptions extends HelperOptions {
    hash: HelperOptions['hash'] & {
        separator?: string;
    };
}

/**
 * Concat helper - concatenates multiple values into a single string
 * Usage: {{concat "hello" "world"}} or {{concat "hello" "world" separator=" "}}
 */
function concat(...args: unknown[]): SafeString {
    const options = args.pop() as ConcatHelperOptions;
    const separator: string = options.hash.separator as string || '';

    return new SafeString(args.join(separator));
}

// Export using CommonJS for compatibility with Ghost's module system
export = concat;
