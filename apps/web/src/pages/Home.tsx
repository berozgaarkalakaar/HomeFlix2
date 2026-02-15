import { Settings2, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { HubRow } from '../components/HubRow';
import { HeroSection } from '../components/home/HeroSection';
import { CategoryFilter } from '../components/home/CategoryFilter';

function CustomizeModal({ isOpen, onClose, hubs, onSave }: any) {
    const [localHubs, setLocalHubs] = useState<any[]>([]);

    useEffect(() => {
        if (hubs) setLocalHubs(hubs);
    }, [hubs]);

    if (!isOpen) return null;

    const toggleHub = (index: number) => {
        const newHubs = [...localHubs];
        newHubs[index].enabled = !newHubs[index].enabled;
        setLocalHubs(newHubs);
    };

    const moveHub = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localHubs.length - 1) return;

        const newHubs = [...localHubs];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newHubs[index], newHubs[swapIndex]] = [newHubs[swapIndex], newHubs[index]];
        setLocalHubs(newHubs);
    };

    const handleSave = () => {
        onSave(localHubs);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-surface border border-white/10 rounded-lg w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold mb-2">Customize Home</h3>
                <p className="text-sm text-text-medium mb-6">
                    Reorder and choose which rows to display.
                </p>

                <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto">
                    {localHubs.map((hub: any, idx: number) => (
                        <div key={hub.id} className="flex items-center gap-3 p-3 rounded bg-white/5 hover:bg-white/10 transition-colors group">
                            {/* Reorder Buttons */}
                            <div className="flex flex-col gap-1 text-text-medium">
                                <button
                                    onClick={() => moveHub(idx, 'up')}
                                    disabled={idx === 0}
                                    className="hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    onClick={() => moveHub(idx, 'down')}
                                    disabled={idx === localHubs.length - 1}
                                    className="hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>

                            <span className="font-medium flex-1">{hub.title}</span>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hub.enabled}
                                    onChange={() => toggleHub(idx)}
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const { token } = useAuth();
    const [hubs, setHubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [allHubConfig, setAllHubConfig] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('all');

    const fetchHome = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/home', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHubs(res.data);

            const defaults = [
                { id: 'continue_watching', title: 'Continue Watching', enabled: true, type: 'continue_watching' },
                { id: 'recently_added_movies', title: 'Recently Added Movies', enabled: true, type: 'latest', mediaType: 'movie' },
                { id: 'recently_added_tv', title: 'Recently Added TV', enabled: true, type: 'latest', mediaType: 'episode' },
                { id: 'recent_music', title: 'Recently Played Music', enabled: true, type: 'recent_played', mediaType: 'track' },
                { id: 'recent_photos', title: 'Recent Photos', enabled: true, type: 'latest', mediaType: 'image' },
            ];

            const merged = defaults.map(def => {
                const active = res.data.find((h: any) => h.id === def.id);
                return active ? { ...def, enabled: true } : { ...def, enabled: false };
            });

            setAllHubConfig(merged);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHome();
    }, [token]);

    const savePreferences = async (newConfig: any[]) => {
        try {
            setLoading(true);
            await axios.post('/api/v1/home/preferences',
                { hubs: newConfig },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchHome();
            setModalOpen(false);
        } catch (err) {
            console.error("Failed to save prefs", err);
            setLoading(false);
        }
    };

    // Filter logic for category pills
    const getFilteredHubs = () => {
        if (activeCategory === 'all') return hubs;
        if (activeCategory === 'movies') return hubs.filter(h => h.id.includes('movie') || h.type === 'continue_watching');
        if (activeCategory === 'tv') return hubs.filter(h => h.id.includes('tv') || h.type === 'continue_watching');
        if (activeCategory === 'music') return hubs.filter(h => h.id.includes('music'));
        if (activeCategory === 'photos') return hubs.filter(h => h.id.includes('photo'));
        if (activeCategory === 'recent') return hubs.filter(h => h.type === 'latest');
        return hubs;
    };

    // Dynamic Hero Item Logic
    const heroItem = useMemo(() => {
        if (!hubs || hubs.length === 0) return null;

        // 1. Priority: Continue Watching (Resume)
        const continueWatching = hubs.find(h => h.id === 'continue_watching');
        if (continueWatching && continueWatching.items && continueWatching.items.length > 0) {
            return continueWatching.items[0];
        }

        // 2. Fallback: Recently Added Movies
        const recentMovies = hubs.find(h => h.id === 'recently_added_movies');
        if (recentMovies && recentMovies.items && recentMovies.items.length > 0) {
            return recentMovies.items[0];
        }

        // 3. Fallback: Recently Added TV
        const recentTV = hubs.find(h => h.id === 'recently_added_tv');
        if (recentTV && recentTV.items && recentTV.items.length > 0) {
            return recentTV.items[0];
        }

        return null;
    }, [hubs]);


    if (loading && hubs.length === 0) {
        return (
            <div className="p-0 space-y-8 bg-black min-h-screen">
                <div className="w-full h-[60vh] bg-surface/10 animate-pulse" />
                <div className="space-y-6 px-8">
                    {[1, 2, 3].map(i => (
                        <HubRow key={i} title="" type="skeleton" loading={true} items={[]} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 bg-background min-h-screen pb-20">
            <HeroSection item={heroItem} />

            <div className="relative z-20 -mt-20 space-y-8 px-4 md:px-12">
                <CategoryFilter activeCategory={activeCategory} onSelect={setActiveCategory} />

                {/* Customize Button (Subtle) */}
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModalOpen(true)}
                        className="gap-2 text-white/50 hover:text-white hover:bg-white/10"
                    >
                        <Settings2 size={14} />
                        Customize Rows
                    </Button>
                </div>

                <div className="space-y-8">
                    {getFilteredHubs().map((hub) => (
                        <div key={hub.id} className="animate-in slide-in-from-bottom-4 duration-500">
                            <HubRow
                                title={hub.title}
                                items={hub.items}
                                type={hub.type}
                            />
                        </div>
                    ))}

                    {getFilteredHubs().length === 0 && (
                        <div
                            className="text-center py-20 text-text-medium bg-surface/5 rounded-xl border border-white/5"
                            style={{
                                textAlign: 'center',
                                padding: '80px 20px',
                                color: '#A0A0A0',
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                marginTop: '40px'
                            }}
                        >
                            <h3 className="text-xl font-medium mb-2" style={{ color: 'white', marginBottom: '8px', fontSize: '1.25rem' }}>No content found</h3>
                            <p>Try selecting a different category or add some media!</p>
                        </div>
                    )}
                </div>
            </div>

            <CustomizeModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                hubs={allHubConfig}
                onSave={savePreferences}
            />
        </div>
    );
}
