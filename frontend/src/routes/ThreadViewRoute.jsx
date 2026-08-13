import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCurrentUser } from '../api/api';
import ThreadView from '../components/ThreadView';

export default function ThreadViewRoute() {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser().then(setUser).catch(err => console.error('Failed to load user:', err));
    }, []);

    return <ThreadView storyId={storyId} user={user} onBack={() => navigate(-1)} />;
}
