import React, { useState } from 'react';

export default function SearchBar({ onSearch, onClear, isSearching }) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minLikes: '',
    maxLikes: '',
    minWords: '',
    maxWords: '',
    dateFrom: '',
    dateTo: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() || Object.values(filters).some(v => v)) {
      onSearch(query.trim(), filters);
    }
  };

  const handleClear = () => {
    setQuery('');
    setFilters({
      minLikes: '',
      maxLikes: '',
      minWords: '',
      maxWords: '',
      dateFrom: '',
      dateTo: ''
    });
    onClear();
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
      border: '1px solid #ddd',
      boxShadow: '0 1px 4px #efefee'
    }}>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories, authors, or content..."
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.95em',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 24px',
              background: '#222',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9em',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}>
            Search
          </button>
          {isSearching && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: '10px 24px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9em',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}>
              Clear
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.85em',
            cursor: 'pointer',
            padding: '4px 0',
            textDecoration: 'underline'
          }}>
          {showFilters ? 'Hide' : 'Show'} filters
        </button>

        {showFilters && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#fafafa',
            borderRadius: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                Min Likes
              </label>
              <input
                type="number"
                value={filters.minLikes}
                onChange={(e) => updateFilter('minLikes', e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                Max Likes
              </label>
              <input
                type="number"
                value={filters.maxLikes}
                onChange={(e) => updateFilter('maxLikes', e.target.value)}
                placeholder="∞"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                Min Words
              </label>
              <input
                type="number"
                value={filters.minWords}
                onChange={(e) => updateFilter('minWords', e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                Max Words
              </label>
              <input
                type="number"
                value={filters.maxWords}
                onChange={(e) => updateFilter('maxWords', e.target.value)}
                placeholder="800"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '4px'
              }}>
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9em'
                }}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
