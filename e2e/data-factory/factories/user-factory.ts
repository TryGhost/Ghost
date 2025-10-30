import {Factory} from '../factory';

export interface User {
    name: string;
    email: string;
    password: string;
    blogTitle: string;
}

export class UserFactory extends Factory<Partial<User>, User> {
    entityType = 'users';

    public build(overrides: Partial<User> = {}): User {
        return {
            ...this.defaults,
            ...overrides
        };
    }

    private defaults: User = {
        name: 'Test Admin',
        email: 'test@example.com',
        password: 'test123',
        blogTitle: 'Test Blog'
    };
}
