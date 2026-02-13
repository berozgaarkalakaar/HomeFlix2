import { cn } from "../../lib/utils";

interface CategoryFilterProps {
    activeCategory: string;
    onSelect: (category: string) => void;
}

const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'movies', label: 'Movies' },
    { id: 'tv', label: 'TV Shows' },
    { id: 'documentaries', label: 'Documentaries' },
    { id: 'photos', label: 'Photos' },
    { id: 'music', label: 'Music' },
    { id: 'recent', label: 'Recently Added' },
];

export function CategoryFilter({ activeCategory, onSelect }: CategoryFilterProps) {
    return (
        <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex items-center gap-3 px-1">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.id)}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 border",
                            activeCategory === cat.id
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-gray-300 border-gray-700 hover:border-gray-500 hover:bg-white/5"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
