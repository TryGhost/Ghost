// express-session ships no types
const { Store } = require('express-session');

type Callback = (err: unknown, data?: unknown) => void;

export interface SessionModel {
  destroy(filter: { session_id: string }): Promise<unknown>;
  findOne(filter: { session_id: string }): Promise<{ get(key: 'session_data'): unknown } | null>;
  upsert(data: { session_data: unknown }, filter: { session_id: string }): Promise<unknown>;
  destroyAll(): Promise<unknown>;
}

export default class SessionStore extends Store {
  SessionModel: SessionModel;

  constructor(SessionModel: SessionModel) {
    super();
    this.SessionModel = SessionModel;
  }

  destroy(sid: string, callback: Callback) {
    this.SessionModel.destroy({ session_id: sid })
      .then(() => {
        callback(null);
      })
      .catch(callback);
  }

  get(sid: string, callback: Callback) {
    this.SessionModel.findOne({ session_id: sid })
      .then((model) => {
        if (!model) {
          return callback(null, null);
        }
        callback(null, model.get('session_data'));
      })
      .catch(callback);
  }

  set(sid: string, sessionData: unknown, callback: Callback) {
    this.SessionModel.upsert({ session_data: sessionData }, { session_id: sid })
      .then(() => {
        callback(null);
      })
      .catch(callback);
  }

  clear(callback: Callback) {
    this.SessionModel.destroyAll()
      .then(() => {
        callback(null);
      })
      .catch(callback);
  }
}
