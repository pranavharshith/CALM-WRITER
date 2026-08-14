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
        <div className="hub-chat">
            <div className="hub-chat__log">
                {chat.length === 0 && (
                    <p className="hub-chat__empty">No messages yet. Say hello.</p>
                )}
                {chat.map((msg) => (
                    <HubChatMessage key={msg._id} msg={msg} targetLang={targetLang} />
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={onSendMessage} className="hub-chat__composer">
                <input
                    type="text"
                    className="form-input"
                    placeholder="Write a message…"
                    value={message}
                    onChange={onMessageChange}
                    aria-label="Chat message"
                />
                <button
                    type="submit"
                    disabled={sendingChat || !message.trim()}
                    className={`btn btn--primary${sendingChat ? ' btn--loading' : ''}`}
                >
                    {sendingChat && <span className="spinner-ring" aria-hidden="true" />}
                    {sendingChat ? 'Sending…' : 'Send'}
                </button>
            </form>
        </div>
    );
}
