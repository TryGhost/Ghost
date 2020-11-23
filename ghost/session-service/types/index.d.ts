declare function _exports({ getSession, findUserById, getOriginOfRequest }: {
    getSession: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>, res: import("express").Response<any>) => Promise<import("./lib/SessionService").Session>;
    findUserById: (data: {
        id: string;
    }) => Promise<import("./lib/SessionService").User>;
    getOriginOfRequest: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>) => string;
}): import("./lib/SessionService").SessionService;
export = _exports;
