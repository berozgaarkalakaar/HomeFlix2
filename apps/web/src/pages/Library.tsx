import { useState, useEffect } from 'react';
import axios from 'axios';
import VideoPlayer from '../components/VideoPlayer';

interface MediaItem {
    id: string;
    title: string;
    type: string;
    year?: number;
    duration?: number;
}

export default function Library() {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

    const [progressMap, setProgressMap] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchLibrary();
        fetchProgress();
    }, []);

    const fetchLibrary = async () => {
        try {
            const res = await axios.get('/api/v1/library/items');
            setItems(res.data);
        } catch (err) {
            console.error("Failed to fetch library", err);
        }
    };

    const fetchProgress = async () => {
        try {
            const res = await axios.get('/api/v1/user/progress');
            setProgressMap(res.data);
        } catch (err) {
            // might fail if not logged in or auth error, ignore for public view if strict
            console.error("Failed to fetch progress", err);
        }
    };

    const onItemClick = (item: MediaItem) => {
        setActiveItem(item);
        // Refresh progress when closing?
    };

    return (
        <div>
            {activeItem && (
                <VideoPlayer
                    itemId={activeItem.id}
                    src={`/api/v1/stream/${activeItem.id}`}
                    poster={`/api/v1/items/${activeItem.id}/poster`}
                    initialTime={progressMap[activeItem.id]?.progressSeconds || 0}
                    onClose={() => { setActiveItem(null); fetchProgress(); }}
                />
            )}

            <div className="library-grid">
                {items.map(item => {
                    const progress = progressMap[item.id];
                    let progressPercent = 0;
                    if (progress && item.duration) {
                        progressPercent = Math.min(100, (progress.progressSeconds / item.duration) * 100);
                    }

                    return (
                        <div key={item.id} className="media-card" onClick={() => onItemClick(item)}>
                            <div className="poster-placeholder" style={{ position: 'relative' }}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                                {progressPercent > 0 && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: '#444' }}>
                                        <div style={{ width: `${progressPercent}%`, height: '100%', background: '#e50914' }}></div>
                                    </div>
                                )}
                            </div>
                            <h3>{item.title}</h3>
                            <p>{item.year || 'Unknown Year'}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
