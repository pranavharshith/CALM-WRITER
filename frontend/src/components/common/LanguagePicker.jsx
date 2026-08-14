
import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon } from '../../icons/Icons';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'zh', name: 'Chinese', native: '中文' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands' },
    { code: 'pl', name: 'Polish', native: 'Polski' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
];

export default function LanguagePicker({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        function handleKey(event) {
            if (event.key === 'Escape') setIsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const filteredLanguages = LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.native.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedLang = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

    return (
        <div className="language-picker" ref={dropdownRef}>
            <button
                type="button"
                className="language-picker__trigger"
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="language-picker__flag">{selectedLang.code.toUpperCase()}</span>
                <span className="language-picker__name">{selectedLang.native} ({selectedLang.name})</span>
                <span className="language-picker__arrow" aria-hidden="true">▼</span>
            </button>

            {isOpen && (
                <div className="language-picker__dropdown">
                    <div className="language-picker__search">
                        <input
                            type="text"
                            placeholder="Search language..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="language-picker__list" role="listbox">
                        {filteredLanguages.map(lang => (
                            <button
                                type="button"
                                key={lang.code}
                                role="option"
                                aria-selected={lang.code === value}
                                className={`language-picker__item ${lang.code === value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(lang.code);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span className="language-picker__flag">{lang.code.toUpperCase()}</span>
                                <span className="language-picker__label">
                                    <span className="language-picker__native">{lang.native}</span>
                                    <span className="language-picker__english">{lang.name}</span>
                                </span>
                                {lang.code === value && <span className="language-picker__check"><CheckIcon size={14} /></span>}
                            </button>
                        ))}
                        {filteredLanguages.length === 0 && (
                            <div className="language-picker__no-results">No languages found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
