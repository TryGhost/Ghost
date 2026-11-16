import { defineRoutes } from '../../../core/kernel/domains/definitions';

export default defineRoutes([
  // Admin API
  {
    surface: 'admin',
    method: 'get',
    path: '/recommendations',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#browse',
  },
  {
    surface: 'admin',
    method: 'get',
    path: '/recommendations/:id',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#read',
  },
  {
    surface: 'admin',
    method: 'post',
    path: '/recommendations',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#add',
  },
  {
    surface: 'admin',
    method: 'post',
    path: '/recommendations/check',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#check',
  },
  {
    surface: 'admin',
    method: 'put',
    path: '/recommendations/:id',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#edit',
  },
  {
    surface: 'admin',
    method: 'delete',
    path: '/recommendations/:id',
    middleware: ['authAdminApi'],
    handler: 'recommendations.endpoint#destroy',
  },
  {
    surface: 'admin',
    method: 'get',
    path: '/incoming_recommendations',
    middleware: ['authAdminApi'],
    handler: 'incoming-recommendations.endpoint#browse',
  },
  // Content API
  {
    surface: 'content',
    method: 'get',
    path: '/recommendations',
    middleware: ['authenticatePublic'],
    handler: 'recommendations-public.endpoint#browse',
  },
  // Members API
  {
    surface: 'members',
    method: 'post',
    path: '/api/recommendations/:id/clicked',
    middleware: ['loadMemberSession'],
    handler: 'recommendations-public.endpoint#trackClicked',
  },
  {
    surface: 'members',
    method: 'post',
    path: '/api/recommendations/:id/subscribed',
    middleware: ['loadMemberSession'],
    handler: 'recommendations-public.endpoint#trackSubscribed',
  },
]);
