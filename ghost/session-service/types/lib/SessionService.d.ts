declare function _exports({ getSession, findUserById, getOriginOfRequest }: {
    getSession: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>, res: import("express").Response<any>) => Promise<Session>;
    findUserById: (data: {
        id: string;
    }) => Promise<User>;
    getOriginOfRequest: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>) => string;
}): SessionService;
export = _exports;
export type User = {
    id: string;
};
export type Session = {
    destroy: (cb: (err: Error) => any) => void;
    user_id: string;
    origin: string;
    user_agent: string;
    ip: string;
};
export type Req = import("express").Request<import("express-serve-static-core").ParamsDictionary>;
export type Res = import("express").Response<any>;
export type SessionService = {
    getUserForSession: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>, res: import("express").Response<any>) => Promise<User>;
    destroyCurrentSession: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>, res: import("express").Response<any>) => Promise<void>;
    createSessionForUser: (req: import("express").Request<import("express-serve-static-core").ParamsDictionary>, res: import("express").Response<any>, user: User) => Promise<void>;
};
