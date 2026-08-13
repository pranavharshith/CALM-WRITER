import React, { useState } from 'react';
import { translateText } from '../../api/api';
import DualArrowIcon from '../../icons/DualArrowIcon';

export default function HubChatMessage({ msg, targetLang }) {
    const [translatedText, setTranslatedText] = useState(null);
    const [showTranslated, setShowTranslated] = useState(false);
    const [translating, setTranslating] = useState(false);

    const handleTranslate = async () => {
        if (showTranslated) {
            setShowTranslated(false);
            return;
        }
        if (translatedText) {
            setShowTranslated(true);
            return;
        }
        setTranslating(true);
        try {
            const result = await translateText(msg._id, 'hub_message', msg.message, targetLang);
            if (result.translatedText) {
                setTranslatedText(result.translatedText);
                setShowTranslated(true);
            }
        } catch (error) {
            console.error('Translation failed', error);
        } finally {
            setTranslating(false);
        }
    };

    return (
        <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span><strong>{msg.senderUsername}</strong> · {new Date(msg.createdAt).toLocaleTimeString()}</span>
                <button
                    onClick={handleTranslate}
                    disabled={translating}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                    }}
                    title="Translate message"
                >
                    <DualArrowIcon size={14} color={showTranslated ? 'var(--blue-icon)' : 'var(--text-secondary)'} />
                </button>
            </div>
            <div style={{ fontSize: '15px' }}>
                {translating ? <span style={{ color: 'var(--text-tertiary)' }}>Translating...</span> : (showTranslated ? translatedText : msg.message)}
            </div>
        </div>
    );
}
