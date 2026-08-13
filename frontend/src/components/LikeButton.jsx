import React, { useRef } from 'react';
import { likeStory } from '../api/api';
import { HeartIcon } from '../icons/Icons';

export default function LikeButton({ story, onLike, disabled = false, size = 15 }) {
  const busy = useRef(false);
  const isLiked = !!story.isLikedByUser;
  const likes = Number.isFinite(story.likes) ? story.likes : 0;

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy.current || disabled) return;
    busy.current = true;

    const prevLiked = isLiked;
    const prevLikes = likes;
    const nextLiked = !prevLiked;
    const nextLikes = nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1);
    if (onLike) onLike(story._id, { likes: nextLikes, isLikedByUser: nextLiked });

    try {
      const result = await likeStory(story._id);
      if (result.success && onLike) {
        onLike(story._id, { likes: result.likes, isLikedByUser: result.liked });
      } else if (onLike) {
        onLike(story._id, { likes: prevLikes, isLikedByUser: prevLiked });
      }
    } catch (error) {
      if (onLike) onLike(story._id, { likes: prevLikes, isLikedByUser: prevLiked });
      console.error('Failed to like story:', error);
    } finally {
      busy.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={disabled}
      title={isLiked ? 'Unlike' : 'Like'}
      aria-pressed={isLiked}
      className="story-card__action-btn story-card__action-btn--like"
    >
      <HeartIcon
        size={size}
        className={`like-heart${isLiked ? ' is-liked' : ''}`}
        fill={isLiked ? 'currentColor' : 'none'}
      />
      <span>{likes}</span>
    </button>
  );
}
