const jsModules = import.meta.glob('@ghost-cards/js/*.js', {query: 'raw', eager: true}) as Record<string, {default: string}>;
const cssModules = import.meta.glob('@ghost-cards/css/*.css', {query: 'raw', eager: true}) as Record<string, {default: string}>;

export const cardsJS = Object.values(jsModules)
    .map(module => module.default)
    .join('\n\n');

export const cardsCSS = Object.values(cssModules)
    .map(module => module.default)
    .join('\n\n');
