import React from 'react';
import { ChevronRight, Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface LibraryHeaderProps {
    title: string;
    description?: string;
    onSearch: (query: string) => void;
    onSortChange: (sort: string) => void;
    currentSort: string;
}

export function LibraryHeader({ title, description, onSearch, onSortChange, currentSort }: LibraryHeaderProps) {
    return (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-white/5 pb-4 pt-2 mb-6 -mx-6 px-6 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Breadcrumbs & Title */}
                <div>
                    <div className="flex items-center gap-2 text-xs text-text-medium mb-1">
                        <Link to="/" className="hover:text-white">Home</Link>
                        <ChevronRight size={12} />
                        <span>Library</span>
                        <ChevronRight size={12} />
                        <span className="text-white">Browse</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    {description && <p className="text-sm text-text-medium mt-1">{description}</p>}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-medium group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={`Search in ${title}...`}
                            className="pl-9 bg-surface/50 border-white/10 focus:bg-surface transition-colors"
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-surface/50">
                                <ArrowUpDown size={16} />
                                <span className="hidden sm:inline">Sort</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onSortChange('date_added')}>
                                Recently Added
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('title')}>
                                Title (A-Z)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSortChange('year')}>
                                Release Year
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" className="gap-2 border-white/10 bg-surface/50">
                        <SlidersHorizontal size={16} />
                        <span className="hidden sm:inline">Filters</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
