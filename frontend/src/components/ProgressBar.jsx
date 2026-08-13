import React from 'react';
export default function ProgressBar({ percent }) {
  return (
    <div style={{height:8,background:'var(--bg-subtle)',borderRadius:'var(--radius-md)',overflow:'hidden',margin:'12px 0 24px 0'}}>
      <div style={{height:8,width:`${percent}%`,background:'var(--sage)',transition:'width 0.4s'}} />
    </div>
  );
}

