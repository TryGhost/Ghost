declare function _exports({ getSession, findUserById, getOriginOfRequest }: {
    getSession: (req: Req, res: Res) => Promise<Session>;
    findUserById: (data: {
        id: string;
    }) => Promise<User>;
    getOriginOfRequest: (req: Req) => string;
}): SessionService;
export = _exports;
export type User = {
    id: string;
};
export type Session = {
    destroy: (cb: (err: Error | null) => any) => void;
    user_id: string;
    origin: string;
    user_agent: string;
    ip: string;
};
export type Req = import("express").Request<import("express-serve-static-core").ParamsDictionary>;
export type Res = import("express").Response<any>;
export type SessionService = {
    getUserForSession: (req: Req, res: Res) => Promise<User | null>;
    destroyCurrentSession: (req: Req, res: Res) => Promise<void>;
    createSessionForUser: (req: Req, res: Res, user: User) => Promise<void>;
};
