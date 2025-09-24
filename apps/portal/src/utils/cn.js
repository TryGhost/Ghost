/**
 * Join class names, filtering out falsy values.
 * @param {...(string|false|null|undefined)} classes - Class name fragments
 * @returns {string} Space-joined className string
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}