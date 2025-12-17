import React, { useState, useEffect } from 'react';
import { submitStory, checkCanWrite } from '../api/api';



export default function WriteScreen({ onBack, user, setUser }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState(0);

  useEffect(() => {
    checkWriteStatus();
  }, []);

  const checkWriteStatus = async () => {
    try {
      const status = await checkCanWrite();
      setCanWrite(status.canWrite);
      setTimeUntilNext(status.timeUntilNext || 0);
    } catch (error) {
      console.error('Failed to check write status:', error);
    }
  };

  const formatTimeUntilNext = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate title (must have at least 3 words)
    const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
    if (titleWords.length < 3) {
      setError('Title must contain at least 3 words.');
      return;
    }
    
    if (!text.trim()) {
      setError('Please write your story before publishing.');
      return;
    }
    
    setSending(true);
    setError('');
    
    try {
      await submitStory(text.trim(), title.trim());
      setTitle('');
      setText('');
      // Show success and go back
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      setError(error.message || 'Failed to publish story');
    } finally {
      setSending(false);
    }
  };

  if (!canWrite) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fefefd',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '1.3em',
            marginBottom: '20px',
            opacity: 0.8
          }}>
            You've said enough for today.
          </div>
          <div style={{
            fontSize: '0.9em',
            opacity: 0.6,
            marginBottom: '30px'
          }}>
            You can write again in {formatTimeUntilNext(timeUntilNext)}
          </div>
          <button 
            onClick={onBack}
            style={{
              padding: '10px 24px',
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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

        <form 
          onSubmit={handleSubmit}
          style={{
            padding: 32,
            boxShadow: '0 1px 4px #eee',
            background: '#fafbf9',
            borderRadius: 8
          }}>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.9em',
              opacity: 0.7
            }}>
              Title (required - at least 3 words)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1.1em',
                fontFamily: 'Georgia, serif'
              }}
              placeholder="Enter your story title (at least 3 words)..."
              required
              maxLength={100}
            />
          </div>
          
          <textarea 
            style={{
              width: '100%',
              height: 300,
              fontSize: '1.1em',
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Georgia, serif',
              lineHeight: '1.6'
            }}
            maxLength={4800} 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Begin writing here..."
          />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20
          }}>
            <div style={{
              fontSize: '0.9em',
              opacity: 0.6
            }}>
              {wordCount} words {wordCount > 800 && '(consider keeping under 800)'}
              {title.trim() && (
                <span style={{ marginLeft: '12px' }}>
                  Title: {title.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </span>
              )}
            </div>
            
            <button 
              type="submit" 
              style={{
                padding: '12px 40px',
                background: sending ? '#bbb' : '#222',
                color: '#fff',
                borderRadius: 4,
                border: 'none',
                cursor: sending ? 'not-allowed' : 'pointer',
                fontSize: '1em'
              }} 
              disabled={sending || !text.trim() || !title.trim()}>
              {sending ? 'Publishing...' : 'Publish'}
            </button>
          </div>
          
          {error && (
            <div style={{
              color: '#dd4444',
              marginTop: 12,
              fontSize: '0.9em'
            }}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}