import AppError from '@components/layout/error';
import Layout from '@components/layout';
import Posts from '@src/views/profile/components/posts';
import React from 'react';
import { H1 } from '@tryghost/shade/primitives';
import { isApiError } from '@src/api/activitypub';
import { useHashtagFeedForUser } from '@hooks/use-activity-pub-queries';
import { useParams } from '@tryghost/admin-x-framework';

const Hashtag: React.FC = () => {
  const params = useParams<{ hashtag: string }>();
  const hashtag = params.hashtag ?? '';

  const { hashtagFeedQuery } = useHashtagFeedForUser({ enabled: hashtag !== '', hashtag });
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    hashtagFeedQuery;

  const posts =
    data?.pages.flatMap((page) => page.posts) ??
    Array.from({ length: 5 }, (_, index) => ({ id: `placeholder-${index}`, object: {} }));

  if (error && isApiError(error)) {
    return <AppError errorCode={error.code} statusCode={error.statusCode} />;
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-[640px] pt-4 pb-20">
        <H1 className="mb-4 !text-[1.5rem] font-semibold tracking-normal break-all">#{hashtag}</H1>
        <Posts
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage!}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          noResultsMessage={`No posts found for #${hashtag} yet`}
          posts={posts}
        />
      </div>
    </Layout>
  );
};

export default Hashtag;
