import React from 'react';
import { Play, Info, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

export interface MediaItem {
    id: string;
    title: string;
    type: string;
    year?: number;
    duration?: number;
    progressSeconds?: number;
}

interface MediaCardProps {
    item: MediaItem;
    onClick?: () => void;
    className?: string;
}

export function MediaCard({ item, onClick, className }: MediaCardProps) {
    const progressPercent = item.duration && item.progressSeconds
        ? Math.min(100, (item.progressSeconds / item.duration) * 100)
        : 0;

    return (
        <div className={cn("group relative w-full", className)}>
            <div className="relative aspect-[2/3] bg-surface rounded-lg overflow-hidden mb-2 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:z-10 ring-offset-background group-hover:ring-2 group-hover:ring-primary">
                {/* Poster Image */}
                <img
                    src={`/api/v1/items/${item.id}/poster`}
                    alt={item.title}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback placeholder
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Poster';
                    }}
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <Button
                                size="icon"
                                className="h-10 w-10 full-rounded bg-primary hover:bg-primary/90 text-black rounded-full"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onClick?.();
                                }}
                            >
                                <Play fill="black" className="ml-0.5" size={20} />
                            </Button>

                            <div className="flex gap-2">
                                <Link to={`/item/${item.id}`}>
                                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white">
                                        <Info size={16} />
                                    </Button>
                                </Link>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white/20 text-white">
                                    <MoreVertical size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                        <div
                            className="h-full bg-primary"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div className="mt-2">
                <h3 className="text-sm font-semibold text-white truncate pr-2" title={item.title}>
                    {item.title}
                </h3>
                <div className="flex items-center text-xs text-text-medium mt-1">
                    <span>{item.year || 'Unknown'}</span>
                    <span className="mx-1">•</span>
                    <span className="capitalize">{item.type}</span>
                </div>
            </div>
        </div>
    );
}

export function MediaCardSkeleton() {
    return (
        <div className="w-full">
            <Skeleton className="aspect-[2/3] rounded-lg mb-2" />
            <Skeleton className="h-4 w-3/4 mb-1" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    );
}
