import React, { useState, useEffect } from 'react';
import { 
  fetchMostFeltLeaderboard, 
  fetchQuietlyPowerfulLeaderboard, 
  fetchGrowingStoriesLeaderboard 
} from '../api/api';

export default function NewLeaderboards({ onStoryClick }) {
  const [lens, setLens] = useState('most_felt');
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadLeaderboard();
  }, [lens]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      let result;
      
      switch (lens) {
        case 'most_felt':
          result = await fetchMostFeltLeaderboard(10);
          break;
        case 'quietly_powerful':
          result = await fetchQuietlyPowerfulLeaderboard(10);
          break;
        case 'growing_stories':
          result = await fetchGrowingStoriesLeaderboard(10, 7);
          break;
        default:
          result = await fetchMostFeltLeaderboard(10);
      }
      
      setStories(result.stories || []);
      setDescription(result.description || '');
    } catch (err) {
      setError('Failed to load stories');
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const lensLabels = {
    'most_felt': 'Most Felt',
    'quietly_powerful': 'Quietly Powerful',
    'growing_stories': 'Growing Stories'
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '24px',
      boxShadow: '0 1px 4px #efefee',
      marginBottom: '24px'
    }}>
      <div style={{
        fontSize: '1.3em',
        fontWeight: '500',
        marginBottom: '8px',
        color: '#333'
      }}>
        Windows to Appreciate
      </div>

      <div style={{
        fontSize: '0.9em',
        color: '#666',
        marginBottom: '20px',
        lineHeight: '1.5'
      }}>
        {description}
      </div>

      {/* Lens Selector */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        {Object.entries(lensLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setLens(key)}
            style={{
              padding: '8px 16px',
              background: lens === key ? '#374' : 'transparent',
              color: lens === key ? '#fff' : '#666',
              border: lens === key ? 'none' : '1px solid #ddd',
              borderRadius: '20px',
              fontSize: '0.85em',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
          fontSize: '0.9em'
        }}>
          Loading...
        </div>
      ) : error ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#d44',
          fontSize: '0.9em'
        }}>
          {error}
        </div>
      ) : stories.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666',
          fontSize: '0.9em'
        }}>
          No stories found for this lens
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {stories.map((story, index) => (
            <div
              key={story._id}
              onClick={() => onStoryClick(story)}
              style={{
                padding: '16px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'background 0.2s ease',
                border: '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fafafa';
              }}>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '0.85em',
                  color: '#999',
                  minWidth: '24px',
                  paddingTop: '2px'
                }}>
                  {index + 1}.
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '1em',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: '6px',
                    lineHeight: '1.4'
                  }}>
                    {story.title || 'Untitled story'}
                  </div>
                  
                  <div style={{
                    fontSize: '0.85em',
                    color: '#666',
                    marginBottom: '8px',
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {story.preview}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '0.75em',
                    color: '#999'
                  }}>
                    <span>@{story.authorUsername}</span>
                    
                    {lens === 'most_felt' && (
                      <>
                        <span>{story.completionRate}% completion</span>
                        <span>{story.reactions} reactions</span>
                      </>
                    )}
                    
                    {lens === 'quietly_powerful' && (
                      <>
                        <span>{story.reads} reads</span>
                        {story.continuations > 0 && <span>{story.continuations} chapters</span>}
                        {story.responses > 0 && <span>{story.responses} reflections</span>}
                      </>
                    )}
                    
                    {lens === 'growing_stories' && (
                      <>
                        <span>{story.continuations} chapters</span>
                        <span>{story.responses} reflections</span>
                        <span>{story.daysActive}d active</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
