/* eslint-disable ghost/filenames/match-exported-class */
import type {Request, Response, NextFunction} from 'express';

export interface DynamicRedirectManagerOptions {
    permanentMaxAge: number;
    getSubdirectoryURL: (pathname: string) => string;
}

export interface AddRedirectOptions {
    permanent?: boolean;
}

declare class DynamicRedirectManager {
    constructor(options: DynamicRedirectManagerOptions);
    addRedirect(from: string, to: string, options?: AddRedirectOptions): string | null;
    removeRedirect(redirectId: string): void;
    removeAllRedirects(): void;
    handleRequest(req: Request, res: Response, next: NextFunction): void;
}

export default DynamicRedirectManager;
