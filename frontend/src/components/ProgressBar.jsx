import React from 'react';
export default function ProgressBar({ percent }) {
  return (
    <div style={{height:8,background:'#eee',borderRadius:6,overflow:'hidden',margin:'12px 0 24px 0'}}>
      <div style={{height:8,width:`${percent}%`,background:'#7db7ab',transition:'width 0.4s'}} />
    </div>
  );
}

