
import React, { useState, useEffect, useRef } from 'react';

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
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
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredLanguages = LANGUAGES.filter(lang =>
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.native.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedLang = LANGUAGES.find(l => l.code === value) || LANGUAGES[0];

    return (
        <div className="language-picker" ref={dropdownRef}>
            <div
                className="language-picker__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="language-picker__flag">{selectedLang.flag}</span>
                <span className="language-picker__name">{selectedLang.native} ({selectedLang.name})</span>
                <span className="language-picker__arrow">▼</span>
            </div>

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
                    <div className="language-picker__list">
                        {filteredLanguages.map(lang => (
                            <div
                                key={lang.code}
                                className={`language-picker__item ${lang.code === value ? 'selected' : ''}`}
                                onClick={() => {
                                    onChange(lang.code);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                <span className="language-picker__flag">{lang.flag}</span>
                                <span className="language-picker__label">
                                    <span className="language-picker__native">{lang.native}</span>
                                    <span className="language-picker__english">{lang.name}</span>
                                </span>
                                {lang.code === value && <span className="language-picker__check">✓</span>}
                            </div>
                        ))}
                        {filteredLanguages.length === 0 && (
                            <div className="language-picker__no-results">No languages found</div>
                        )}
                    </div>
                </div>
            )}
            <style>{`
        .language-picker {
          position: relative;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .language-picker__trigger {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .language-picker__trigger:hover {
          border-color: #aaa;
        }
        .language-picker__flag {
          font-size: 1.2em;
          margin-right: 10px;
        }
        .language-picker__name {
          flex: 1;
          color: #333;
        }
        .language-picker__arrow {
          font-size: 0.8em;
          color: #999;
        }
        .language-picker__dropdown {
          position: absolute;
          top: 110%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #eee;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 100;
          overflow: hidden;
        }
        .language-picker__search {
          padding: 10px;
          border-bottom: 1px solid #f0f0f0;
        }
        .language-picker__search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          outline: none;
        }
        .language-picker__search input:focus {
          border-color: #667eea;
        }
        .language-picker__list {
          max-height: 250px;
          overflow-y: auto;
        }
        .language-picker__item {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          cursor: pointer;
          transition: background 0.1s;
        }
        .language-picker__item:hover {
          background: #f8f9fa;
        }
        .language-picker__item.selected {
          background: #f0f4ff;
        }
        .language-picker__label {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .language-picker__native {
          font-weight: 500;
          color: #333;
        }
        .language-picker__english {
          font-size: 0.85em;
          color: #777;
        }
        .language-picker__check {
          color: #667eea;
          font-weight: bold;
        }
        .language-picker__no-results {
          padding: 15px;
          text-align: center;
          color: #999;
          font-size: 0.9em;
        }
      `}</style>
        </div>
    );
}
