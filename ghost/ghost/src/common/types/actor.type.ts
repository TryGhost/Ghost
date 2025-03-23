import ObjectID from 'bson-objectid';
import {Role} from '../decorators/permissions.decorator';

export type Actor = {
    id: ObjectID
    role: Role
    type: 'user' | 'api_key'
};
