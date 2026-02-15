import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

// Helper to format duration
const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
};

interface HubItem {
    id: string;
    title: string;
    type: string;
    path: string;
    // Metadata
    year?: number;
    duration?: number;
    // Progress
    progressSeconds?: number;
    completed?: boolean;
}

interface HubRowProps {
    title: string;
    items: HubItem[];
    type: string;
    loading?: boolean;
}

export function HubRow({ title, items, type, loading }: HubRowProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = direction === 'left' ? -container.offsetWidth / 2 : container.offsetWidth / 2;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="h-8 w-40 bg-white/10 rounded mb-4 animate-pulse" />
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex-none w-[160px] md:w-[200px] aspect-[2/3] bg-white/5 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!items || items.length === 0) return null;

    return (
        <div className="mb-8 group/row">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <Button variant="ghost" className="text-sm text-text-medium hover:text-primary">
                    See All
                </Button>
            </div>

            <div className="relative group/scroll">
                {/* Left Scroll Button */}
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity disabled:opacity-0"
                >
                    <ChevronLeft className="text-white" />
                </button>

                {/* Scroll Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x px-8"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.map((item) => (
                        <Link
                            key={item.id}
                            to={`/item/${item.id}`}
                            className="flex-none w-[160px] md:w-[200px] snap-start group/card focus:outline-none shrink-0"
                            style={{ minWidth: '160px' }}
                        >
                            <div className="relative aspect-[2/3] bg-surface rounded-lg overflow-hidden mb-2 shadow-lg transition-transform duration-300 group-hover/card:scale-105 group-focus/card:scale-105 ring-offset-background group-focus-visible/card:ring-2 group-focus-visible/card:ring-ring border border-white/5">
                                {/* Poster Image */}
                                <img
                                    src={`/api/v1/items/${item.id}/poster`}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Overlay Play Icon */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-xl transform scale-75 group-hover/card:scale-100 transition-transform">
                                        <Play fill="white" className="text-white ml-1" size={24} />
                                    </div>
                                </div>

                                {/* Progress Bar (Continue Watching) */}
                                {(type === 'continue_watching' || (item.progressSeconds && item.progressSeconds > 0)) && item.duration ? (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.min(((item.progressSeconds || 0) / item.duration) * 100, 100)}%` }}
                                        />
                                    </div>
                                ) : null}
                            </div>

                            {/* Metadata */}
                            <div className="px-1">
                                <h4 className="text-sm font-medium text-white truncate" title={item.title}>
                                    {item.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-text-medium mt-1">
                                    {item.year && <span>{item.year}</span>}
                                    {item.duration && <span>• {Math.floor(item.duration / 60)}m</span>}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Right Scroll Button */}
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity"
                >
                    <ChevronRight className="text-white" />
                </button>
            </div>
        </div>
    );
}
