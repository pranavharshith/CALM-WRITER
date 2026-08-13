import React from 'react';
import HubChatMessage from './HubChatMessage';

export default function HubChatTab({
    chat,
    targetLang,
    chatEndRef,
    message,
    onMessageChange,
    onSendMessage,
    sendingChat,
}) {
    return (
        <div>
            <div style={{
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                height: '500px',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                }}>
                    {chat.map((msg) => (
                        <HubChatMessage key={msg._id} msg={msg} targetLang={targetLang} />
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <form onSubmit={onSendMessage} style={{
                    borderTop: '1px solid var(--border)',
                    padding: '15px',
                    display: 'flex',
                    gap: '10px',
                }}>
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={message}
                        onChange={onMessageChange}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '15px',
                            fontFamily: 'var(--font-serif)',
                        }}
                    />
                    <button type="submit" disabled={sendingChat} style={{
                        padding: '10px 20px',
                        background: sendingChat ? 'var(--bg-active)' : 'var(--accent)',
                        color: sendingChat ? 'var(--text-muted)' : 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: sendingChat ? 'not-allowed' : 'pointer',
                    }}>
                        {sendingChat ? 'Sending…' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}
