import {Reflector} from '@nestjs/core';

type UserRole = 'Contributor' | 'Author' | 'Editor' | 'Admin' | 'Owner';
type APIKeyRole = 'Admin Integration' | 'Ghost Explore Integration' | 'Self-Serve Migration Integration' | 'DB Backup Integration' | 'Scheduler Integration';

export type Role = UserRole | APIKeyRole;

export const Roles = Reflector.createDecorator<Role[]>();
