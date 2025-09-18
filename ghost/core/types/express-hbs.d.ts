declare module 'express-hbs' {
    import {Request, Response, NextFunction} from 'express';

    export interface SafeString {
        string: string;
        toString(): string;
    }

    export interface HandlebarsInstance {
        SafeString: new (str: string) => SafeString;
        Utils: {
            escapeExpression: (str: string) => string;
        };
        logger: {
            level: number;
        };
        compile: (source: string, options?: Record<string, unknown>) => (...args: unknown[]) => string;
        registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
    }

    export interface HbsInstance {
        handlebars: HandlebarsInstance;
        SafeString: new (str: string) => SafeString;
        escapeExpression: (str: string) => string;
        registerHelper(name: string, fn: (...args: unknown[]) => unknown): void;
        registerAsyncHelper(name: string, fn: (...args: unknown[]) => unknown): void;
        express4(options: Record<string, unknown>): (req: Request, res: Response, next: NextFunction) => void;
        create(): HbsInstance;
        configure: (partialsPath: string, themePath: string) => (req: Request, res: Response, next: NextFunction) => void;
    }

    const hbs: HbsInstance;
    export = hbs;
}
