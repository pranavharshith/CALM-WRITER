import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchStoryById } from '../api/api';
import { SkeletonStoryReader } from '../components/SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';
import { cacheHas, cacheGet, cachePut } from '../utils/screenCache';
import StoryReader from '../components/StoryReader';

export default function StoryReaderRoute() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const [story, setStory] = useState(null);
    const [rawLoading, setRawLoading] = useState(true);
    const loading = useMinLoadTime(rawLoading);

    useEffect(() => {
        setStory(null);
        setRawLoading(true);
        const loadStory = async () => {
            const cacheKey = `story:${storyId}`;
            if (cacheHas(cacheKey)) {
                setStory(cacheGet(cacheKey));
                setRawLoading(false);
                return;
            }
            try {
                const storyData = await fetchStoryById(storyId);
                setStory(storyData);
                if (storyData) cachePut(cacheKey, storyData);
            } catch (error) {
                console.error('Failed to load story:', error);
            } finally {
                setRawLoading(false);
            }
        };
        loadStory();
    }, [storyId]);

    const handleLike = (id, updates) => {
        setStory(prevStory => ({
            ...prevStory,
            likes: updates.likes,
            isLikedByUser: updates.isLikedByUser,
        }));
    };

    if (loading) return <SkeletonStoryReader />;
    if (!story) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '100vh', background: 'transparent' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Story not found</p>
                <button className="btn btn--secondary" onClick={() => navigate('/community')}>Back to feed</button>
            </div>
        );
    }

    return <StoryReader story={story} onBack={() => navigate(-1)} onLike={handleLike} />;
}
