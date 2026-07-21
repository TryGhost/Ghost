import {useSearchParams} from '@tryghost/admin-x-framework';

export const useVersionLink = (): ((path: string) => string) => {
    const [params] = useSearchParams();
    const v = params.get('v');
    return (path: string) => {
        if (!v) {
            return path;
        }
        const separator = path.includes('?') ? '&' : '?';
        return `${path}${separator}v=${v}`;
    };
};
