import {act, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {renderHookWithProviders, createTestQueryClient} from '../../../src/test/test-utils';
import {useEditAutomatedEmailDesign, type AutomatedEmailDesignResponseType} from '../../../src/api/automated-email-design';
import {withMockFetch} from '../../utils/mock-fetch';

describe('automated-email-design api', () => {
    it('updates the React cache without invalidating Ember state', async () => {
        const queryClient = createTestQueryClient();
        const onInvalidate = vi.fn();

        const initialData: AutomatedEmailDesignResponseType = {
            automated_email_design: [{
                id: 'default-automated-email-design',
                slug: 'default-automated-email',
                background_color: 'light',
                header_background_color: 'transparent',
                header_image: null,
                show_header_icon: true,
                show_header_title: true,
                footer_content: null,
                button_color: null,
                button_corners: 'square',
                button_style: 'fill',
                link_color: null,
                link_style: 'underline',
                body_font_category: 'sans_serif',
                title_font_category: 'sans_serif',
                title_font_weight: 'bold',
                image_corners: 'square',
                divider_color: null,
                section_title_color: null,
                show_badge: true,
                created_at: '2024-01-01T00:00:00.000Z',
                updated_at: null
            }]
        };

        const updatedData: AutomatedEmailDesignResponseType = {
            automated_email_design: [{
                ...initialData.automated_email_design[0],
                body_font_category: 'serif',
                updated_at: '2024-01-02T00:00:00.000Z'
            }]
        };

        queryClient.setQueryData(
            ['AutomatedEmailDesignResponseType', 'http://localhost:3000/ghost/api/admin/automated_emails/design/'],
            initialData
        );

        await withMockFetch({json: updatedData}, async () => {
            const {result} = renderHookWithProviders(() => useEditAutomatedEmailDesign(), {
                frameworkProps: {onInvalidate},
                queryClient
            });

            await act(async () => {
                await result.current.mutateAsync({body_font_category: 'serif'});
            });

            await waitFor(() => {
                expect(queryClient.getQueryData([
                    'AutomatedEmailDesignResponseType',
                    'http://localhost:3000/ghost/api/admin/automated_emails/design/'
                ])).toEqual(updatedData);
            });

            expect(onInvalidate).not.toHaveBeenCalled();
        });
    });
});
