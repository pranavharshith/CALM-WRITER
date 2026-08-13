import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FollowingPage from '../components/FollowingPage';

export default function FollowingPageRoute() {
    const { username } = useParams();
    const navigate = useNavigate();
    return (
        <FollowingPage
            username={username}
            onBack={() => navigate(-1)}
            onProfile={(name) => navigate(`/profile/${name}`)}
        />
    );
}
