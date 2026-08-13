import React from 'react';
import StreakWidget from '../StreakWidget';
import Leaderboard from '../Leaderboard';

export default function FeedSidebar({ onWriteStory, onLeaderboards }) {
  return (
    <div className="feed__sidebar">
      <div className="feed__sidebar-sticky">
        <StreakWidget onWrite={onWriteStory} />
        <Leaderboard onViewAll={onLeaderboards} />
      </div>
    </div>
  );
}
