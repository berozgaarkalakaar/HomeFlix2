import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { MediaCard, MediaCardSkeleton, MediaItem } from '../components/MediaCard';
import { LibraryHeader } from '../components/LibraryHeader';
import { useAuth } from '../context/AuthContext';

export default function Library() {
    const { type } = useParams<{ type: string }>();
    const { token } = useAuth();

    // State
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [sort, setSort] = useState('date_added');
    const [searchQuery, setSearchQuery] = useState('');

    // Playback State
    const [activeItem, setActiveItem] = useState<MediaItem | null>(null);

    // Filter type helper
    const getMediaType = () => {
        if (!type) return 'all';
        // Map route params to DB types if needed. 
        // Our DB uses 'movie', 'episode' (which comes from 'tv' library?), 'track'.
        // Simplified: 'movies' -> 'movie', 'tv' -> 'episode' (or show?), 'music' -> 'track'
        // For now let's assume strict mapping or pass 'all'
        if (type === 'movies') return 'movie';
        if (type === 'tv') return 'episode';
        if (type === 'music') return 'track';
        return type; // 'all' or specific
    };

    // Infinite Scroll Observer
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        }, { threshold: 0.5 }); // Trigger when halfway visible

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Fetch Logic
    useEffect(() => {
        setItems([]);
        setPage(1);
        setHasMore(true);
    }, [type, sort, searchQuery]);

    useEffect(() => {
        const fetchLibrary = async () => {
            setLoading(true);
            try {
                const mediaType = getMediaType();
                const limit = 50;

                const res = await axios.get('/api/library/items', {
                    params: {
                        type: mediaType,
                        page,
                        limit,
                        sort,
                        search: searchQuery
                    },
                    headers: { Authorization: `Bearer ${token}` }
                });

                const newItems = res.data;

                // Fetch progress for these items (could be optmized to one call or embedded)
                // For MVP, we'll do best effort or just rely on items having it if API updated.
                // Currently API /user/progress returns all. 
                // Let's assume we might need to merge or API /library/items does it?
                // The previous implementation fetched all progress.
                // Let's fetch progress map once or optimistic.
                // Ideally /library/items should return `progressSeconds` if logged in.

                setItems(prev => page === 1 ? newItems : [...prev, ...newItems]);
                setHasMore(newItems.length === limit);
            } catch (err) {
                console.error("Failed to fetch library", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLibrary();
    }, [page, type, sort, searchQuery, token]);

    // Title Helper
    const getTitle = () => {
        if (type === 'movies') return 'Movies';
        if (type === 'tv') return 'TV Shows';
        if (type === 'music') return 'Music';
        return 'Library';
    };

    return (
        <div className="min-h-screen">
            {activeItem && (
                <VideoPlayer
                    itemId={activeItem.id}
                    src={`/api/stream/${activeItem.id}`}
                    poster={`/api/items/${activeItem.id}/poster`}
                    initialTime={activeItem.progressSeconds || 0}
                    onClose={() => setActiveItem(null)}
                />
            )}

            <LibraryHeader
                title={getTitle()}
                description={`Browse your collection of ${getTitle().toLowerCase()}.`}
                onSearch={setSearchQuery}
                onSortChange={(s) => { setSort(s); setPage(1); }}
                currentSort={sort}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pb-20">
                {items.map((item, index) => {
                    if (items.length === index + 1) {
                        return (
                            <div ref={lastElementRef} key={item.id}>
                                <MediaCard item={item} onClick={() => setActiveItem(item)} />
                            </div>
                        );
                    }
                    return <MediaCard key={item.id} item={item} onClick={() => setActiveItem(item)} />;
                })}

                {loading && Array.from({ length: 12 }).map((_, i) => (
                    <MediaCardSkeleton key={i} />
                ))}
            </div>

            {!loading && items.length === 0 && (
                <div className="text-center py-20 text-text-medium">
                    <p>No items found.</p>
                </div>
            )}
        </div>
    );
}
