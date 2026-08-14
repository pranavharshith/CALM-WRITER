import React, { useState } from 'react';

const EMPTY_FILTERS = {
    minLikes: '',
    maxLikes: '',
    minWords: '',
    maxWords: '',
    dateFrom: '',
    dateTo: '',
};

const FILTER_FIELDS = [
    { key: 'minLikes', label: 'Min likes', type: 'number', placeholder: '0', min: 0 },
    { key: 'maxLikes', label: 'Max likes', type: 'number', placeholder: '∞', min: 0 },
    { key: 'minWords', label: 'Min words', type: 'number', placeholder: '0', min: 0 },
    { key: 'maxWords', label: 'Max words', type: 'number', placeholder: '800', min: 0 },
    { key: 'dateFrom', label: 'From', type: 'date' },
    { key: 'dateTo', label: 'To', type: 'date' },
];

export default function SearchBar({ onSearch, onClear, isSearching }) {
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    const hasQueryOrFilters = Boolean(query.trim() || Object.values(filters).some(Boolean));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (hasQueryOrFilters) onSearch(query.trim(), filters);
    };

    const handleClear = () => {
        setQuery('');
        setFilters(EMPTY_FILTERS);
        onClear();
    };

    const updateFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className={`search-bar${showFilters ? ' is-expanded' : ''}`}>
            <form onSubmit={handleSubmit}>
                <div className="search-bar__row">
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search stories, authors, or #tags..."
                        className="form-input search-bar__input"
                        enterKeyHint="search"
                    />
                    <button type="submit" className="btn btn--primary">
                        Search
                    </button>
                    {(isSearching || hasQueryOrFilters) && (
                        <button type="button" onClick={handleClear} className="btn btn--secondary">
                            Clear
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="search-bar__toggle"
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters((open) => !open)}
                >
                    <span aria-hidden="true">{showFilters ? '▴' : '▾'}</span>
                    {showFilters ? 'Hide filters' : 'Show filters'}
                </button>

                <div className={`search-bar__drawer${showFilters ? ' is-open' : ''}`}>
                    <div className="search-bar__drawer-clip">
                        <div className="search-bar__drawer-panel" aria-hidden={!showFilters}>
                            {FILTER_FIELDS.map((field) => (
                                <div key={field.key} className="search-bar__field">
                                    <label htmlFor={`search-${field.key}`}>{field.label}</label>
                                    <input
                                        id={`search-${field.key}`}
                                        className="form-input"
                                        type={field.type}
                                        min={field.min}
                                        value={filters[field.key]}
                                        placeholder={field.placeholder}
                                        onChange={(e) => updateFilter(field.key, e.target.value)}
                                        tabIndex={showFilters ? 0 : -1}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
