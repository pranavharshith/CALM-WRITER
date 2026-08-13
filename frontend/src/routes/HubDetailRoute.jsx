import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCurrentUser } from '../api/api';
import HubDetail from '../components/HubDetail';

export default function HubDetailRoute() {
    const { hubId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchCurrentUser().then(setUser).catch(err => console.error('Failed to load user:', err));
    }, []);

    return (
        <HubDetail
            hubId={hubId}
            onBack={() => navigate(-1)}
            onReadStory={(story) => navigate(`/story/${story._id}`)}
            user={user}
        />
    );
}
