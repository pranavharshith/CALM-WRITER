import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCurrentUser } from '../api/api';
import UserProfile from '../components/UserProfile';

export default function UserProfileRoute() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                setUser(await fetchCurrentUser());
            } catch (error) {
                console.error('Failed to load user:', error);
            }
        };
        loadUser();
    }, []);

    return (
        <UserProfile
            username={username}
            onBack={() => navigate('/community')}
            currentUser={user}
            onLogout={() => {
                setUser(null);
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('translation_')) localStorage.removeItem(key);
                });
                navigate('/login');
            }}
            onViewBookmarks={() => navigate('/bookmarks')}
            onViewMyStories={() => navigate('/my-stories')}
            onViewFollowing={(name) => navigate(`/following/${name}`)}
            onViewUserStories={(name) => navigate(`/user/${name}/stories`)}
        />
    );
}
