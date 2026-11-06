import { create } from 'zustand';

import { initialTopics, type ForumComment, type Topic } from '@/lib/mock/forum';

function toggleLike<T extends { likes: number; likedByMe: boolean }>(item: T): T {
  return {
    ...item,
    likedByMe: !item.likedByMe,
    likes: item.likes + (item.likedByMe ? -1 : 1),
  };
}

type ForumState = {
  topics: Topic[];
  toggleTopicLike: (topicId: string) => void;
  toggleCommentLike: (topicId: string, commentId: string, replyId?: string) => void;
  addTopic: (input: {
    title: string;
    body: string;
    imageUri?: string;
    boxTagId: string;
    authorName: string;
    authorEmoji: string;
    authorBackground: string;
  }) => void;
  addComment: (topicId: string, body: string, author: Topic['author'], parentCommentId?: string) => void;
};

export const useForumStore = create<ForumState>((set) => ({
  topics: initialTopics,

  toggleTopicLike: (topicId) => {
    set((state) => ({
      topics: state.topics.map((t) => (t.id === topicId ? toggleLike(t) : t)),
    }));
  },

  toggleCommentLike: (topicId, commentId, replyId) => {
    set((state) => ({
      topics: state.topics.map((topic) => {
        if (topic.id !== topicId) return topic;
        return {
          ...topic,
          comments: topic.comments.map((comment) => {
            if (comment.id !== commentId) return comment;
            if (!replyId) return toggleLike(comment);
            return {
              ...comment,
              replies: comment.replies.map((reply) =>
                reply.id === replyId ? toggleLike(reply) : reply,
              ),
            };
          }),
        };
      }),
    }));
  },

  addTopic: ({ title, body, imageUri, boxTagId, authorName, authorEmoji, authorBackground }) => {
    const topic: Topic = {
      id: `topic-${Date.now()}`,
      author: { name: authorName, avatarEmoji: authorEmoji, avatarBackground: authorBackground },
      title,
      body,
      imageUri,
      boxTagId,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      comments: [],
    };
    set((state) => ({ topics: [topic, ...state.topics] }));
  },

  addComment: (topicId, body, author, parentCommentId) => {
    const comment: ForumComment = {
      id: `c-${Date.now()}`,
      author,
      body,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      replies: [],
    };
    set((state) => ({
      topics: state.topics.map((topic) => {
        if (topic.id !== topicId) return topic;
        if (!parentCommentId) {
          return { ...topic, comments: [...topic.comments, comment] };
        }
        return {
          ...topic,
          comments: topic.comments.map((c) =>
            c.id === parentCommentId ? { ...c, replies: [...c.replies, comment] } : c,
          ),
        };
      }),
    }));
  },
}));
