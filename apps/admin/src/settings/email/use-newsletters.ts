import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { type InfiniteData, useQueryClient } from "@tryghost/admin-x-framework";
import {
    type Newsletter,
    type NewslettersResponseType,
    newslettersDataType,
    useBrowseNewsletters,
    useEditNewsletter,
} from "@tryghost/admin-x-framework/api/newsletters";

/**
 * Newsletter list state shared by the automations-off Newsletters group and
 * the automations-on Emails tab, ported from the legacy newsletters.tsx /
 * newsletters-tab-content.tsx: active/archived split plus the drag-reorder
 * handler (optimistic local + query-cache update, then per-newsletter saves).
 */
export function useNewsletters() {
    const { data: { newsletters: apiNewsletters, meta, isEnd } = {}, isLoading, fetchNextPage } = useBrowseNewsletters();
    const { mutateAsync: editNewsletter } = useEditNewsletter();
    const queryClient = useQueryClient();

    const [newsletters, setNewsletters] = useState<Newsletter[]>(apiNewsletters || []);

    useEffect(() => {
        setNewsletters(apiNewsletters || []);
    }, [apiNewsletters]);

    const sortedActiveNewsletters = newsletters.filter((n) => n.status === "active").sort((a, b) => a.sort_order - b.sort_order) || [];
    const archivedNewsletters = newsletters.filter((newsletter) => newsletter.status !== "active");

    const onSort = async (id: string, overId?: string) => {
        const fromIndex = sortedActiveNewsletters.findIndex((newsletter) => newsletter.id === id);
        const toIndex = sortedActiveNewsletters.findIndex((newsletter) => newsletter.id === overId) || 0;
        const newSortOrder = arrayMove(sortedActiveNewsletters, fromIndex, toIndex);

        const updatedActiveNewsletters = newSortOrder.map((newsletter, index) => (
            newsletter.sort_order === index ? null : { ...newsletter, sort_order: index }
        )).filter((newsletter): newsletter is Newsletter => !!newsletter);

        const updatedArchivedNewsletters = archivedNewsletters.map((newsletter, index) => (
            newsletter.sort_order === index + sortedActiveNewsletters.length ? null : { ...newsletter, sort_order: index }
        )).filter((newsletter): newsletter is Newsletter => !!newsletter);

        const orderUpdatedNewsletters = [...updatedActiveNewsletters, ...updatedArchivedNewsletters].sort((a, b) => a.sort_order - b.sort_order);

        // Set the new order in local state and cache first so the UI updates
        // immediately, then persist each moved newsletter.
        setNewsletters(newsletters.map((newsletter) => orderUpdatedNewsletters.find((n) => n.id === newsletter.id) || newsletter));
        queryClient.setQueriesData<InfiniteData<NewslettersResponseType>>({ queryKey: [newslettersDataType] }, (currentData) => {
            if (!currentData) {
                return;
            }

            return {
                ...currentData,
                pages: currentData.pages.map((page) => ({
                    ...page,
                    newsletters: page.newsletters.map((newsletter) => orderUpdatedNewsletters.find((n) => n.id === newsletter.id) || newsletter),
                })),
            };
        });

        for (const newsletter of orderUpdatedNewsletters) {
            await editNewsletter(newsletter);
        }
    };

    return {
        newsletters,
        sortedActiveNewsletters,
        archivedNewsletters,
        meta,
        isEnd,
        isLoading,
        fetchNextPage,
        onSort,
    };
}
