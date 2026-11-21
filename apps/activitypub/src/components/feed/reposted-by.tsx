import APAvatar from '../global/ap-avatar';
import ProfilePreviewHoverCard from '../global/profile-preview-hover-card';
import React from 'react';
import getHandle from '../../utils/get-handle';
import { ActorProperties } from '@tryghost/admin-x-framework/api/activitypub';
import {
  Button,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { formatNumber } from '@tryghost/shade/utils';
import { handleProfileClick } from '../../utils/handle-profile-click';
import { useNavigateWithBasePath } from '@src/hooks/use-navigate-with-base-path';
import { useUserDataForUser } from '@hooks/use-activity-pub-queries';

interface RepostedByProps {
  /** Everyone who reposted the post, newest first */
  reposters: ActorProperties[];
  nameClassName: string;
}

/**
 * The "reposted" line above a post: "Ana reposted", "Ana and Ben reposted" or
 * "Ana and 3 others reposted", where "3 others" opens a list of the rest.
 */
const RepostedBy: React.FC<RepostedByProps> = ({ reposters, nameClassName }) => {
  const navigate = useNavigateWithBasePath();
  const { data: user } = useUserDataForUser('index');
  const userHandle = user ? getHandle(user).toLowerCase() : null;

  const [first, ...others] = reposters;

  if (!first) {
    return null;
  }

  const renderName = (reposter: ActorProperties) => (
    <ProfilePreviewHoverCard
      actor={reposter}
      align="center"
      isCurrentUser={getHandle(reposter).toLowerCase() === userHandle}
    >
      <span
        className={nameClassName}
        onClick={(e) => {
          handleProfileClick(reposter, navigate, e);
        }}
      >
        {reposter.name}
      </span>
    </ProfilePreviewHoverCard>
  );

  // The {' '} separators don't render in the flex row, which spaces the words
  // with its gap, but keep the line readable as text
  return (
    <>
      {renderName(first)}
      {others.length === 1 && (
        <>
          {' '}
          <span className="shrink-0">and</span> {renderName(others[0])}
        </>
      )}
      {others.length > 1 && (
        <>
          {' '}
          <span className="shrink-0">and</span>{' '}
          <Popover>
            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="shrink-0 whitespace-nowrap hover:underline" type="button">
                {formatNumber(others.length)} others
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-2"
              // The popover renders in a portal, but React still bubbles its
              // clicks to the feed item, which would open the post
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="flex max-h-72 w-56 flex-col overflow-y-auto">
                {others.map((reposter) => (
                  <li key={getHandle(reposter)}>
                    <PopoverClose asChild>
                      <Button
                        className="w-full justify-start rounded-menu-item"
                        shape="rounded"
                        variant="ghost"
                        onClick={(e) => {
                          handleProfileClick(reposter, navigate, e);
                        }}
                      >
                        <APAvatar author={reposter} size="2xs" />
                        <span className="truncate">{reposter.name}</span>
                      </Button>
                    </PopoverClose>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </>
      )}{' '}
      <span className="shrink-0">reposted</span>
    </>
  );
};

export default RepostedBy;
