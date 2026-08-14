import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCurrentUser } from '../api/api';
import UserStories from '../components/story/UserStories';

export default function UserStoriesRoute() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser().then(setUser).catch(err => console.error('Failed to load user:', err));
    }, []);

    return (
        <UserStories
            username={username}
            onBack={() => navigate(-1)}
            onReadStory={(story) => navigate(`/story/${story._id}`)}
            onProfile={(name) => navigate(`/profile/${name}`)}
            currentUser={user}
        />
    );
}
