import App from '../App.js';
import {appRender, fireEvent, waitFor, within} from '../utils/test-utils';
import setupGhostApi from '../utils/api.js';
import {getMemberData, getPostsData, getSiteData} from '../utils/fixtures-generator.js';

const siteData = getSiteData();
const memberData = getMemberData();
const posts = getPostsData();
const postSlug = posts[0].slug;
const postId = posts[0].id;

const setup = async (site = siteData, member = memberData, loggedOut = false, api = {}) => {
    const ghostApi = setupGhostApi({siteUrl: site.url});
    ghostApi.init = api?.init || jest.fn(() => {
        return Promise.resolve({
            site,
            member: loggedOut ? null : member
        });
    });
    ghostApi.feedback.add = api?.add || jest.fn(() => {
        return Promise.resolve({
            feedback: [
                {
                    id: 1,
                    postId: 1,
                    memberId: member ? member.uuid : null,
                    score: 1
                }
            ]
        });
    });

    const utils = appRender(
        <App api={ghostApi} />
    );

    // Note: this await is CRITICAL otherwise the iframe won't be loaded
    const popupFrame = await utils.findByTitle(/portal-popup/i);
    const popupIframeDocument = popupFrame.contentDocument;

    return {
        ghostApi,
        popupIframeDocument,
        popupFrame,
        ...utils
    };
};

describe('Feedback Submission Flow', () => {
    describe('Valid feedback URL', () => {
        describe('Logged in', () => {
            test('Autosubmits feedback', async () => {
                Object.defineProperty(window, 'location', {
                    value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/?uuid=${memberData.uuid}&key=key`),
                    writable: true
                });

                const {ghostApi, popupFrame, popupIframeDocument} = await setup();
                
                expect(popupFrame).toBeInTheDocument();
                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(1);    

                within(popupIframeDocument).getByText('Thanks for the feedback!');
                within(popupIframeDocument).getByText('Your input helps shape what gets published.');
            });

            test('Autosubmits feedback w/o uuid or key params', async () => {
                Object.defineProperty(window, 'location', {
                    value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/`),
                    writable: true
                });
                const {ghostApi, popupFrame, popupIframeDocument} = await setup();

                expect(popupFrame).toBeInTheDocument();
                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(1);    
                within(popupIframeDocument).getByText('Thanks for the feedback!');
                within(popupIframeDocument).getByText('Your input helps shape what gets published.');
            });
        });

        describe('Logged out', () => {
            test('Requires confirmation', async () => {
                Object.defineProperty(window, 'location', {
                    value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/?uuid=${memberData.uuid}&key=key`),
                    writable: true
                });
                const {ghostApi, popupFrame, popupIframeDocument} = await setup(siteData, null, true);

                expect(popupFrame).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText('Give feedback on this post')).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText('More like this')).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText('Less like this')).toBeInTheDocument();
                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(0);

                const submitBtn = within(popupIframeDocument).getByText('Submit feedback');
                fireEvent.click(submitBtn);

                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(1);
                
                // the re-render loop is slow to get to the final state
                await waitFor(() => {
                    within(popupIframeDocument).getByText('Thanks for the feedback!');
                    within(popupIframeDocument).getByText('Your input helps shape what gets published.');
                });
            });

            test('Requires login without key', async () => {
                Object.defineProperty(window, 'location', {
                    value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/?uuid=${memberData.uuid}`),
                    writable: true
                });
                const {ghostApi, popupFrame, popupIframeDocument} = await setup(siteData, null, true);

                expect(popupFrame).toBeInTheDocument();
                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(0);
                expect(within(popupIframeDocument).getByText(/Sign in/)).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText(/Sign up/)).toBeInTheDocument();
            });

            test('Requires login without uuid or key', async () => {
                Object.defineProperty(window, 'location', {
                    value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/`),
                    writable: true
                });
                const {ghostApi, popupFrame, popupIframeDocument} = await setup(siteData, null, true);

                expect(popupFrame).toBeInTheDocument();
                expect(ghostApi.feedback.add).toHaveBeenCalledTimes(0);
                expect(within(popupIframeDocument).getByText(/Sign in/)).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText(/Sign up/)).toBeInTheDocument();
            });
        });

        test('Error on fail to submit', async () => {
            Object.defineProperty(window, 'location', {
                value: new URL(`${siteData.url}/${postSlug}/#/feedback/${postId}/1/?uuid=${memberData.uuid}&key=key`),
                writable: true
            });
            const mockApi = {
                add: jest.fn(() => {
                    return Promise.reject(new Error('Failed to submit feedback'));
                })
            };
            const {ghostApi, popupFrame, popupIframeDocument} = await setup(siteData, memberData, false, mockApi);

            expect(popupFrame).toBeInTheDocument();
            expect(ghostApi.feedback.add).toHaveBeenCalledTimes(1);
            expect(within(popupIframeDocument).getByText(/Sorry/)).toBeInTheDocument();
            expect(within(popupIframeDocument).getByText(/There was a problem submitting your feedback/)).toBeInTheDocument();
        });
    });

    describe('Invalid feedback URL', () => {
        test('Redirects logged in members to account settings', async () => {
            Object.defineProperty(window, 'location', {
                value: new URL(`${siteData.url}/postslughere/#/feedback/1/1/1/`),
                writable: true
            });
            const {popupFrame, popupIframeDocument} = await setup();

            expect(popupFrame).toBeInTheDocument();
            expect(within(popupIframeDocument).getByText(/Your account/)).toBeInTheDocument();
            expect(within(popupIframeDocument).getByText(/Sign out/)).toBeInTheDocument();
        });

        test('Redirects logged out users to sign up', async () => {
            Object.defineProperty(window, 'location', {
                value: new URL(`${siteData.url}/postslughere/#/feedback/1/1/1/`),
                writable: true
            });
            const {popupFrame, popupIframeDocument} = await setup(siteData, null, true);

            expect(popupFrame).toBeInTheDocument();
            // takes to sign up
            await waitFor(() => {
                expect(within(popupIframeDocument).getByText(/Name/)).toBeInTheDocument();
                expect(within(popupIframeDocument).getByText(/Email/)).toBeInTheDocument();
            });
        });
    });
});
