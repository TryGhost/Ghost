import { Meta, createQueryWithId } from '../utils/api/hooks';

export type FeedbackMember = {
  id: string;
  uuid: string;
  name?: string;
  email?: string;
  avatar_image?: string;
};

export type FeedbackItem = {
  id: string;
  score: number;
  created_at: string;
  member: FeedbackMember;
};

export interface FeedbackResponseType {
  meta?: Meta;
  feedback: FeedbackItem[];
}

export const feedbackDataType = 'FeedbackResponseType';

export const usePostFeedbackQuery = createQueryWithId<FeedbackResponseType>({
  dataType: feedbackDataType,
  path: (id) => `/feedback/${id}/`,
});
