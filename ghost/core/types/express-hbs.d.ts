declare module 'express-hbs' {
    import { Request, Response, NextFunction } from 'express';

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
        compile: (source: string, options?: any) => Function;
        registerHelper(name: string, fn: Function): void;
    }

    export interface HbsInstance {
        handlebars: HandlebarsInstance;
        SafeString: new (str: string) => SafeString;
        escapeExpression: (str: string) => string;
        registerHelper(name: string, fn: Function): void;
        registerAsyncHelper(name: string, fn: Function): void;
        express4(options: any): (req: Request, res: Response, next: NextFunction) => void;
        create(): HbsInstance;
        configure: (partialsPath: string, themePath: string) => any;
    }

    const hbs: HbsInstance;
    export = hbs;
}
