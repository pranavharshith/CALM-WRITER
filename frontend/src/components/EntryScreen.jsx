import React from 'react';

export default function EntryScreen({ onBegin, onWrite, onArchive }) {
  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      flexDirection:'column',
      alignItems:'center',
      justifyContent:'center',
      background:'#fefefd',
      padding: '20px'
    }}>
      <div style={{
        fontSize:'1.45em',
        marginBottom:40,
        opacity:.78,
        textAlign: 'center'
      }}>
        Read a human story.
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button 
          onClick={onBegin} 
          style={{
            fontSize:'1em',
            padding:'14px 60px',
            background:'#222',
            color:'#fff',
            borderRadius:4,
            border:'none',
            cursor:'pointer',
            boxShadow:'0 1px 4px #eee',
            minWidth: '160px'
          }}>
          Begin
        </button>
        
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button 
            onClick={onWrite}
            style={{
              fontSize:'0.9em',
              padding:'10px 24px',
              background:'transparent',
              color:'#666',
              border:'1px solid #ddd',
              borderRadius:4,
              cursor:'pointer'
            }}>
            Write
          </button>
          
          <button 
            onClick={onArchive}
            style={{
              fontSize:'0.9em',
              padding:'10px 24px',
              background:'transparent',
              color:'#666',
              border:'1px solid #ddd',
              borderRadius:4,
              cursor:'pointer'
            }}>
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}

