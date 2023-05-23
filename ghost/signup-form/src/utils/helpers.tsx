import {SignupFormOptions} from '../AppContext';

export function isMinimal(options: SignupFormOptions): boolean {
    return !options.title;
}
