import React from 'react';
import StreakWidget from './StreakWidget';
import Leaderboard from '../leaderboard/Leaderboard';

export default function FeedSidebar({ onWriteStory, onLeaderboards }) {
  return (
    <div className="split-shell__aside feed__sidebar">
      <div className="split-shell__aside-inner">
        <StreakWidget onWrite={onWriteStory} />
        <Leaderboard onViewAll={onLeaderboards} />
      </div>
    </div>
  );
}
