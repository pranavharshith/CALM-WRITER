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

    const time = msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : '';

    return (
        <div className="hub-chat__msg">
            <div className="hub-chat__msg-head">
                <span>
                    <strong>{msg.senderUsername || 'Someone'}</strong>
                    {time ? ` · ${time}` : ''}
                </span>
                <button
                    type="button"
                    onClick={handleTranslate}
                    disabled={translating}
                    className={`hub-chat__translate${showTranslated ? ' hub-chat__translate--on' : ''}`}
                    title="Translate message"
                    aria-label="Translate message"
                >
                    <DualArrowIcon size={14} color="currentColor" />
                </button>
            </div>
            <p className={`hub-chat__msg-body${translating ? ' hub-chat__msg-body--muted' : ''}`}>
                {translating ? 'Translating…' : (showTranslated ? translatedText : msg.message)}
            </p>
        </div>
    );
}
