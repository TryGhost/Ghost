import {HttpClient as APIRequest} from '../../../data-factory/persistence/adapters/http-client';
import {UserService} from './UserService';

export function createUserService(request: APIRequest): UserService {
    return new UserService(request);
}

export {UserService, UserAccessibility} from './UserService';
