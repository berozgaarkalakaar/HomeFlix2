import { Button } from "../ui/button";
import { Play, Info } from "lucide-react";
import { Link } from "react-router-dom";

interface HeroSectionProps {
    item?: any; // We'll improve this type later if needed, effectively HubItem
}

export function HeroSection({ item }: HeroSectionProps) {
    if (!item) {
        // Fallback or Skeleton if needed, but for now we'll just return the skeleton structure or null
        // Better to show a generic placeholder or loading state
        return (
            <div className="relative w-full h-[70vh] mb-8 bg-black animate-pulse">
                <div className="absolute inset-0 bg-white/5" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-[70vh] mb-8 group overflow-hidden bg-black">
            {/* Background Image - with fallback style */}
            <div className="absolute inset-0 z-0">
                <img
                    src={`/api/items/${item.id}/backdrop`}
                    onError={(e) => {
                        // Fallback to poster if backdrop fails, or a default image
                        const target = e.target as HTMLImageElement;
                        target.src = `/api/items/${item.id}/poster`;
                    }}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    alt={item.title}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
            </div>

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"
                style={{ background: 'linear-gradient(to top, #000 0%, transparent 60%)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10"
                style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />

            <div className="absolute bottom-0 left-0 p-8 md:p-12 pb-24 md:pb-32 z-20 max-w-2xl space-y-4">
                <span className="inline-block px-3 py-1 text-xs font-bold text-black bg-white rounded-sm uppercase tracking-wider">
                    {item.progressSeconds > 0 ? "Continue Watching" : "Featured"}
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none drop-shadow-lg line-clamp-2">
                    {item.title}
                </h1>

                <p className="text-lg text-gray-300 line-clamp-3 max-w-xl font-light drop-shadow-md">
                    {item.plot || item.overview || "No description available."}
                </p>

                <div className="flex items-center gap-4 pt-4">
                    <Link to={`/watch/${item.id}`}>
                        <Button size="lg" className="rounded-md px-8 font-bold bg-white text-black hover:bg-gray-200 gap-2 h-12 border-0">
                            <Play size={20} fill="currentColor" />
                            {item.progressSeconds > 0 ? "Resume" : "Play Now"}
                        </Button>
                    </Link>
                    <Link to={`/item/${item.id}`}>
                        <Button size="lg" variant="secondary" className="rounded-md px-8 font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md gap-2 h-12 border border-white/20">
                            <Info size={20} />
                            More Info
                        </Button>
                    </Link>
                </div>

                {/* Removed conflicting "Continue Watching" text to prevent overlap with Category Pills */}
            </div>
        </div>
    );
}
