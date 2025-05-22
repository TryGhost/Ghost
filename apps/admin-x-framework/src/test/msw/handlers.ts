import {HttpResponse, http} from 'msw';
import {responseFixtures} from '../acceptance';

// This file contains reusable MSW handlers for mocking API responses
// based on the existing response fixtures used in Playwright tests

// Define handlers for common API endpoints
export const handlers = [
    // Settings
    http.get('/ghost/api/admin/settings/', () => {
        return HttpResponse.json(responseFixtures.settings);
    }),

    // Users
    http.get('/ghost/api/admin/users/', () => {
        return HttpResponse.json(responseFixtures.users);
    }),

    // Me (current user)
    http.get('/ghost/api/admin/users/me/', () => {
        return HttpResponse.json(responseFixtures.me);
    }),

    // Roles
    http.get('/ghost/api/admin/roles/', () => {
        return HttpResponse.json(responseFixtures.roles);
    }),

    // Site
    http.get('/ghost/api/admin/site/', () => {
        return HttpResponse.json(responseFixtures.site);
    }),

    // Config
    http.get('/ghost/api/admin/config/', () => {
        return HttpResponse.json(responseFixtures.config);
    }),

    // Invites
    http.get('/ghost/api/admin/invites/', () => {
        return HttpResponse.json(responseFixtures.invites);
    }),

    // Custom Theme Settings
    http.get('/ghost/api/admin/custom_theme_settings/', () => {
        return HttpResponse.json(responseFixtures.customThemeSettings);
    }),

    // Tiers
    http.get('/ghost/api/admin/tiers/', () => {
        return HttpResponse.json(responseFixtures.tiers);
    }),

    // Labels
    http.get('/ghost/api/admin/labels/', () => {
        return HttpResponse.json(responseFixtures.labels);
    }),

    // Offers
    http.get('/ghost/api/admin/offers/', () => {
        return HttpResponse.json(responseFixtures.offers);
    }),

    // Themes
    http.get('/ghost/api/admin/themes/', () => {
        return HttpResponse.json(responseFixtures.themes);
    }),

    // Newsletters
    http.get('/ghost/api/admin/newsletters/', () => {
        return HttpResponse.json(responseFixtures.newsletters);
    }),

    // Actions
    http.get('/ghost/api/admin/actions/', () => {
        return HttpResponse.json(responseFixtures.actions);
    }),

    // Recommendations
    http.get('/ghost/api/admin/recommendations/', () => {
        return HttpResponse.json(responseFixtures.recommendations);
    }),

    // Incoming Recommendations
    http.get('/ghost/api/admin/recommendations/incoming/', () => {
        return HttpResponse.json(responseFixtures.incomingRecommendations);
    }),

    // ActivityPub Inbox
    http.get('/activitypub/inbox/', () => {
        return HttpResponse.json(responseFixtures.activitypubInbox);
    }),

    // ActivityPub Feed
    http.get('/activitypub/feed/', () => {
        return HttpResponse.json(responseFixtures.activitypubFeed);
    })
]; 