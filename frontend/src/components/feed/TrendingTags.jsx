import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendingTags } from '../../api/api';

export default function TrendingTags() {
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);

  useEffect(() => {
    let live = true;
    fetchTrendingTags()
      .then((res) => {
        if (!live) return;
        if (res?.success !== false) setTags(res.tags || []);
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  if (tags.length === 0) return null;

  return (
    <section className="trending-tags" aria-label="Trending tags">
      <div className="trending-tags__row">
        <p className="trending-tags__label">In the air</p>
        <button type="button" className="trending-tags__more" onClick={() => navigate('/tags')}>
          Browse tags
        </button>
      </div>
      <div className="trending-tags__strip">
        {tags.map((item) => (
          <button
            key={item.tag}
            type="button"
            className="tag-chip"
            onClick={() => navigate(`/tags/${encodeURIComponent(item.tag)}`)}
          >
            #{item.tag}
          </button>
        ))}
      </div>
    </section>
  );
}
