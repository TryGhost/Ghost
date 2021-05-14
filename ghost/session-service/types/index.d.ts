declare function _exports({ getSession, findUserById, getOriginOfRequest }: {
    getSession: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string, any>>, res: import("express").Response<any, Record<string, any>>) => Promise<import("./lib/SessionService").Session>;
    findUserById: (data: {
        id: string;
    }) => Promise<import("./lib/SessionService").User>;
    getOriginOfRequest: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, qs.ParsedQs, Record<string, any>>) => string;
}): import("./lib/SessionService").SessionService;
export = _exports;
