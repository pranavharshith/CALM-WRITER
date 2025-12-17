import React, { useState, useRef, useEffect } from 'react';
import ProgressBar from './ProgressBar';
import { trackReadSession } from '../api/api';

export default function StoryReader({ story, onReact, onBack }) {
  const [percentRead, setPercentRead] = useState(0);
  const [canReact, setCanReact] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !story) return;
    const el = ref.current;
    
    function onScroll() {
      const total = el.scrollHeight - el.clientHeight;
      const at = el.scrollTop;
      const percent = Math.min(100, Math.round(100 * (at + el.clientHeight) / el.scrollHeight));
      setPercentRead(percent);
      setCanReact(percent >= 90);
      
      // Track reading progress
      if (percent > 0) {
        trackReadSession(story._id, percent).catch(console.error);
      }
    }
    
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [story]);

  if (!story) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No story available</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <div style={{ maxWidth: '660px', margin: '0 auto' }}>
        <button 
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '20px'
          }}>
          ← Back
        </button>
        
        <div 
          ref={ref} 
          style={{
            height:'70vh',
            overflowY:'auto',
            background:'#fff',
            padding:32,
            borderRadius:8,
            boxShadow:'0 1px 8px #efefee'
          }}>
          <ProgressBar percent={percentRead} />
          <div style={{
            fontSize:'1.17em',
            lineHeight:'1.72',
            whiteSpace:'pre-wrap',
            marginBottom:28,
            color: '#333'
          }}>
            {story.text}
          </div>
          <button 
            style={{
              padding:'10px 34px',
              fontSize:'1em',
              background: canReact ? '#374' : '#bbb',
              border:'none',
              borderRadius:5,
              color:'#fff',
              cursor: canReact ? 'pointer' : 'not-allowed'
            }} 
            disabled={!canReact} 
            onClick={onReact}>
            React
          </button>
        </div>
      </div>
    </div>
  );
}

