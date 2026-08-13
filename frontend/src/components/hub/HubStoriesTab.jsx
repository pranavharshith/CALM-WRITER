import React from 'react';

export default function HubStoriesTab({
    isMember,
    showStoryForm,
    onToggleStoryForm,
    storyTitle,
    storyText,
    onStoryTitleChange,
    onStoryTextChange,
    onCreateStory,
    stories,
    onReadStory,
}) {
    return (
        <div>
            {isMember && (
                <button
                    onClick={onToggleStoryForm}
                    style={{
                        marginBottom: '20px',
                        padding: '10px 20px',
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '15px',
                    }}
                >
                    {showStoryForm ? 'Cancel' : '+ New Story'}
                </button>
            )}

            {showStoryForm && (
                <form onSubmit={onCreateStory} style={{
                    marginBottom: '30px',
                    padding: '20px',
                    background: 'var(--glass-bg-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                }}>
                    <input
                        type="text"
                        placeholder="Story title (optional)"
                        value={storyTitle}
                        onChange={onStoryTitleChange}
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginBottom: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '15px',
                            fontFamily: 'var(--font-serif)',
                        }}
                    />
                    <textarea
                        placeholder="Write your story..."
                        value={storyText}
                        onChange={onStoryTextChange}
                        rows={8}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '15px',
                            fontFamily: 'var(--font-serif)',
                            resize: 'vertical',
                        }}
                    />
                    <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {storyText.split(/\s+/).filter(w => w).length} words
                    </div>
                    <button
                        type="submit"
                        style={{
                            marginTop: '10px',
                            padding: '10px 20px',
                            background: 'var(--accent)',
                            color: 'var(--accent-contrast)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Publish
                    </button>
                </form>
            )}

            {stories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    No stories yet. {isMember && 'Be the first to write!'}
                </div>
            ) : (
                stories.map((story) => (
                    <div
                        key={story._id}
                        onClick={() => onReadStory(story)}
                        style={{
                            padding: '20px',
                            background: 'var(--glass-bg-strong)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            marginBottom: '15px',
                            cursor: 'pointer',
                        }}
                    >
                        {story.title && (
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{story.title}</h3>
                        )}
                        <p style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                            {story.text?.substring(0, 200)}...
                        </p>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            by {story.authorUsername} · {story.likes} likes
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
