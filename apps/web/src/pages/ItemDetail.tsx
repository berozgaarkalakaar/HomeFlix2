import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Play, Shuffle, Plus, Check, MoreVertical, ChevronLeft, Volume2, Monitor, Gauge } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import { HubRow } from '../components/HubRow'; // Reuse for Similar items if we had them

interface MediaDetail {
    id: string;
    title: string;
    type: string;
    year?: number;
    duration?: number;
    overview?: string; // If we had it
    metadata?: any; // JSON
    codec?: string;
    resolution?: string;
    // Progress
    progressSeconds?: number;
    completed?: boolean;
}

export default function ItemDetail() {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();

    const [item, setItem] = useState<MediaDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);

    // Image loading states
    const [backdropLoaded, setBackdropLoaded] = useState(false);

    useEffect(() => {
        const fetchItem = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/library/items/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setItem(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [id, token]);

    if (loading) {
        return <ItemDetailSkeleton />;
    }

    if (!item) return <div className="p-10 text-center">Item not found</div>;

    const progressPercent = item.duration && item.progressSeconds
        ? Math.min(100, (item.progressSeconds / item.duration) * 100)
        : 0;

    const formatTime = (sec?: number) => {
        if (!sec) return '';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="min-h-screen relative -mt-16">
            {/* Negative margin to pull behind transparent header if we had one, 
            but here effectively it just fills the space. We might need to adjust AppShell if we want truly behind header.
            For now, let's assume standard layout. */}

            {playing && (
                <VideoPlayer
                    itemId={item.id}
                    src={`/api/stream/${item.id}`}
                    poster={`/api/items/${item.id}/poster`}
                    initialTime={item.progressSeconds || 0}
                    onClose={() => setPlaying(false)}
                />
            )}

            {/* Hero Section */}
            <div className="relative h-[70vh] w-full overflow-hidden">
                {/* Backdrop Image */}
                <div className="absolute inset-0">
                    <img
                        src={`/api/items/${item.id}/backdrop`}
                        alt=""
                        className={`w-full h-full object-cover transition-opacity duration-1000 ${backdropLoaded ? 'opacity-50' : 'opacity-0'}`}
                        onLoad={() => setBackdropLoaded(true)}
                        onError={(e) => {
                            // Fallback to poster if backdrop missing? or just dark
                            // (e.target as HTMLImageElement).src = ...
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
                </div>

                {/* Content Container */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row gap-8 items-end md:items-start">

                    {/* Poster (Hidden on mobile, visible on tablet+) */}
                    <div className="hidden md:block w-[240px] flex-shrink-0 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                        <img
                            src={`/api/items/${item.id}/poster`}
                            alt={item.title}
                            className="w-full h-auto aspect-[2/3] object-cover"
                        />
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex-1 space-y-6">
                        {/* Breadcrumb-ish */}
                        <Link to="/" className="inline-flex items-center text-sm text-text-medium hover:text-white mb-2 transition-colors">
                            <ChevronLeft size={16} className="mr-1" /> Back to Home
                        </Link>

                        <div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 leading-tight">
                                {item.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-text-medium">
                                {item.year && <span className="text-white font-medium">{item.year}</span>}
                                {item.duration && <span>{formatTime(item.duration)}</span>}
                                {item.resolution === '4k' && <Badge>4K</Badge>}
                                {item.codec === 'hevc' && <Badge>HDR</Badge>}
                                <span className="capitalize px-2 py-0.5 rounded bg-white/10 text-xs">{item.type}</span>
                            </div>
                        </div>

                        {/* Progress Bar (if started) */}
                        {progressPercent > 0 && (
                            <div className="max-w-md space-y-1">
                                <div className="flex justify-between text-xs text-text-medium">
                                    <span>Resume {formatTime(item.progressSeconds)}</span>
                                    <span>{Math.round(progressPercent)}%</span>
                                </div>
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button
                                size="lg"
                                className="gap-2 text-base px-8 h-12"
                                onClick={() => setPlaying(true)}
                            >
                                <Play fill="currentColor" size={20} />
                                {progressPercent > 0 ? 'Resume' : 'Play'}
                            </Button>

                            {item.type === 'track' && (
                                <Button size="lg" variant="secondary" className="gap-2">
                                    <Shuffle size={20} /> Shuffle
                                </Button>
                            )}

                            <div className="flex gap-2">
                                <Button size="icon" variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-background/50 backdrop-blur-sm hover:bg-white/20">
                                    <Plus size={20} />
                                </Button>
                                <Button size="icon" variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-background/50 backdrop-blur-sm hover:bg-white/20">
                                    <Check size={20} />
                                </Button>
                                <Button size="icon" variant="outline" className="h-12 w-12 rounded-full border-white/20 bg-background/50 backdrop-blur-sm hover:bg-white/20">
                                    <MoreVertical size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Overview */}
                        <p className="text-text-medium max-w-2xl leading-relaxed text-lg text-justify line-clamp-4">
                            {item.overview || "No description available for this item. Add metadata to your library to see plot summaries, cast details, and more."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="p-8 md:p-12 lg:p-16 space-y-12">

                {/* Tech Specs */}
                <section>
                    <h3 className="text-xl font-bold text-white mb-4">Technical Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
                        <TechInfo label="Resolution" value={item.resolution || 'Unknown'} icon={<Monitor size={16} />} />
                        <TechInfo label="Codec" value={item.codec || 'Unknown'} icon={<Gauge size={16} />} />
                        <TechInfo label="Audio" value="Stereo/AAC" icon={<Volume2 size={16} />} /> {/* Placeholder */}
                        <TechInfo label="Container" value={item.path?.split('.').pop()?.toUpperCase() || 'MKV'} />
                    </div>
                </section>

                {/* Cast (Placeholder) */}
                <section>
                    <h3 className="text-xl font-bold text-white mb-4">Cast & Crew</h3>
                    <div className="text-text-medium italic">Cast information not available.</div>
                </section>

                {/* Similar Items (Placeholder) */}
                {/* <HubRow title="You Might Also Like" ... /> */}
            </div>
        </div>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs font-bold tracking-wider">
            {children}
        </span>
    );
}

function TechInfo({ label, value, icon }: any) {
    return (
        <div className="p-4 rounded-lg bg-surface border border-white/5 flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/5 text-text-medium">
                {icon || <Monitor size={16} />}
            </div>
            <div>
                <div className="text-xs text-text-medium uppercase tracking-wider">{label}</div>
                <div className="font-medium text-white">{value}</div>
            </div>
        </div>
    );
}

function ItemDetailSkeleton() {
    return (
        <div className="min-h-screen relative -mt-16">
            <div className="relative h-[70vh] w-full bg-surface animate-pulse">
                <div className="absolute bottom-0 left-0 right-0 p-16 flex gap-8 items-end">
                    <Skeleton className="hidden md:block w-[240px] h-[360px] rounded-lg" />
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-16 w-3/4" />
                        <div className="flex gap-4">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                        <Skeleton className="h-12 w-48 rounded" />
                        <Skeleton className="h-24 w-full max-w-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
