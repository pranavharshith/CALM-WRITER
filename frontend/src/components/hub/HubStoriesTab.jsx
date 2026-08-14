import React from 'react';

function previewOf(story) {
    const raw = (story.preview || story.text || '').trim();
    if (!raw) return 'No preview.';
    return raw.length > 200 ? `${raw.slice(0, 200).trim()}…` : raw;
}

export default function HubStoriesTab({
    isMember,
    showStoryForm,
    onToggleStoryForm,
    storyTitle,
    storyText,
    onStoryTitleChange,
    onStoryTextChange,
    onCreateStory,
    creating = false,
    stories,
    onReadStory,
}) {
    const words = storyText.split(/\s+/).filter(Boolean).length;

    return (
        <div className="hub-room__body">
            {isMember && (
                <div className="hub-room__toolbar">
                    <button type="button" className="btn btn--primary" onClick={onToggleStoryForm}>
                        {showStoryForm ? 'Cancel' : 'New story'}
                    </button>
                </div>
            )}

            {showStoryForm && (
                <form onSubmit={onCreateStory} className="hub-compose">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Title (optional)"
                        value={storyTitle}
                        onChange={onStoryTitleChange}
                    />
                    <textarea
                        className="form-textarea hub-compose__text"
                        placeholder="Write your story…"
                        value={storyText}
                        onChange={onStoryTextChange}
                        rows={8}
                    />
                    <div className="hub-compose__meta">
                        <span className="hub-compose__count">{words} {words === 1 ? 'word' : 'words'}</span>
                        <button
                            type="submit"
                            disabled={creating}
                            className={`btn btn--primary${creating ? ' btn--loading' : ''}`}
                        >
                            {creating && <span className="spinner-ring" aria-hidden="true" />}
                            {creating ? 'Publishing…' : 'Publish'}
                        </button>
                    </div>
                </form>
            )}

            {stories.length === 0 ? (
                <div className="hubs-empty">
                    <p className="hubs-empty__title">No stories yet</p>
                    <p className="hubs-empty__copy">
                        {isMember ? 'Be the first to write in this room.' : 'Members have not published here yet.'}
                    </p>
                </div>
            ) : (
                <div className="hub-stories">
                    {stories.map((story) => (
                        <button
                            key={story._id}
                            type="button"
                            className="hub-story"
                            onClick={() => onReadStory(story)}
                        >
                            {story.title && <h3 className="hub-story__title">{story.title}</h3>}
                            <p className="hub-story__preview">{previewOf(story)}</p>
                            <div className="hub-story__meta">
                                {story.authorUsername ? `by ${story.authorUsername}` : 'Anonymous'}
                                {story.likes != null ? ` · ${story.likes} ${story.likes === 1 ? 'like' : 'likes'}` : ''}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
