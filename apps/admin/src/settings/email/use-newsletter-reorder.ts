import { type InfiniteData, useQueryClient } from '@tryghost/admin-x-framework';
import {
  type Newsletter,
  type NewslettersResponseType,
  newslettersDataType,
  useEditNewsletter,
} from '@tryghost/admin-x-framework/api/newsletters';
import { arrayMove } from '@dnd-kit/sortable';
import { useEffect, useState } from 'react';

export const useNewsletterReorder = (apiNewsletters: Newsletter[] | undefined) => {
  const { mutateAsync: editNewsletter } = useEditNewsletter();
  const queryClient = useQueryClient();

  const [newsletters, setNewsletters] = useState<Newsletter[]>(apiNewsletters || []);

  useEffect(() => {
    setNewsletters(apiNewsletters || []);
  }, [apiNewsletters]);

  const sortedActiveNewsletters =
    newsletters.filter((n) => n.status === 'active').sort((a, b) => a.sort_order - b.sort_order) ||
    [];
  const archivedNewsletters = newsletters.filter((newsletter) => newsletter.status !== 'active');

  const onSort = async (id: string, overId?: string) => {
    const fromIndex = sortedActiveNewsletters.findIndex((newsletter) => newsletter.id === id);
    const toIndex =
      sortedActiveNewsletters.findIndex((newsletter) => newsletter.id === overId) || 0;
    const newSortOrder = arrayMove(sortedActiveNewsletters, fromIndex, toIndex);

    const updatedActiveNewsletters = newSortOrder
      .map((newsletter, index) =>
        newsletter.sort_order === index ? null : { ...newsletter, sort_order: index },
      )
      .filter((newsletter): newsletter is Newsletter => !!newsletter);

    const updatedArchivedNewsletters = archivedNewsletters
      .map((newsletter, index) =>
        newsletter.sort_order === index + sortedActiveNewsletters.length
          ? null
          : { ...newsletter, sort_order: index },
      )
      .filter((newsletter): newsletter is Newsletter => !!newsletter);

    const orderUpdatedNewsletters = [
      ...updatedActiveNewsletters,
      ...updatedArchivedNewsletters,
    ].sort((a, b) => a.sort_order - b.sort_order);

    // Set the new order in local state and cache first so that the UI updates immediately
    setNewsletters(
      newsletters.map(
        (newsletter) => orderUpdatedNewsletters.find((n) => n.id === newsletter.id) || newsletter,
      ),
    );
    queryClient.setQueriesData<InfiniteData<NewslettersResponseType>>(
      { queryKey: [newslettersDataType] },
      (currentData) => {
        if (!currentData) {
          return;
        }

        return {
          ...currentData,
          pages: currentData.pages.map((page) => ({
            ...page,
            newsletters: page.newsletters.map(
              (newsletter) =>
                orderUpdatedNewsletters.find((n) => n.id === newsletter.id) || newsletter,
            ),
          })),
        };
      },
    );

    for (const newsletter of orderUpdatedNewsletters) {
      await editNewsletter(newsletter);
    }
  };

  return { newsletters, sortedActiveNewsletters, archivedNewsletters, onSort };
};
