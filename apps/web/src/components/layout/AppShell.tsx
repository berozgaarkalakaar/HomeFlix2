import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Input } from '../ui/input';
import { Search, Bell, Menu, Plus, Home, Film, Tv, Music, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { useLocation, NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AddContentModal } from '../AddContentModal';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const { user, logout } = useAuth();
    const [isAddContentOpen, setIsAddContentOpen] = useState(false);

    // Persist sidebar state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {

        const stored = localStorage.getItem('sidebarCollapsed');
        return stored ? JSON.parse(stored) : false;
    });

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    // Responsive: Auto-collapse on smaller screens (simplistic approach for now)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const location = useLocation();
    // Helper to get title from path
    const getPageTitle = () => {
        const p = location.pathname;
        if (p === '/') return 'Home';
        if (p.startsWith('/library/')) return p.split('/')[2].toUpperCase();
        if (p.startsWith('/item/')) return 'Details';
        return p.substring(1).charAt(0).toUpperCase() + p.substring(2);
    }

    return (
        <div className="flex h-screen w-full bg-background text-text-high overflow-hidden">
            <Sidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                onAddContent={() => setIsAddContentOpen(true)}
            />


            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Bar - Adaptive for Home */}
                <header className={cn(
                    "h-16 flex items-center justify-between px-6 z-30 transition-all duration-300",
                    location.pathname === '/'
                        ? "fixed top-0 right-0 left-0 md:left-20 lg:left-64 bg-transparent bg-gradient-to-b from-black/80 to-transparent border-b-0"
                        : "sticky top-0 bg-surface/50 backdrop-blur-md border-b border-white/5"
                )}>
                    <div className="flex items-center gap-4 flex-1">
                        {/* Mobile Menu Trigger */}
                        <Button variant="ghost" size="icon" className="md:hidden text-white">
                            <Menu size={20} />
                        </Button>

                        {location.pathname === '/' ? (
                            <h2 className="text-xl md:text-2xl font-black tracking-tighter text-white hidden md:block">
                                MY MEDIA HUB
                            </h2>
                        ) : (
                            <h2 className="text-lg font-semibold hidden md:block">
                                {getPageTitle()}
                            </h2>
                        )}

                        {/* Global Search - Hidden on Home for cleaner look, or kept if preferred. Removing for 'My Media Hub' clean look */}
                        {location.pathname !== '/' && (
                            <div className="max-w-md w-full ml-4 hidden md:block">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-medium" />
                                    <Input
                                        type="search"
                                        placeholder="Search library..."
                                        className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-text-medium focus-visible:ring-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {location.pathname === '/' && (
                            <Button
                                variant="outline"
                                className="hidden md:flex gap-2 border-white/20 hover:bg-white/10 text-white rounded-full"
                                onClick={() => setIsAddContentOpen(true)}
                            >
                                <Plus size={16} />
                                Upload
                            </Button>
                        )}

                        <Button variant="ghost" size="icon" className="text-text-medium hover:text-white">
                            <Bell size={20} />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold border border-white/10 ring-2 ring-white/20">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.username}</p>
                                        <p className="text-xs leading-none text-text-medium">Administrator</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Settings</DropdownMenuItem>
                                <DropdownMenuItem>Playback Preferences</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={logout}>
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className={cn(
                    "flex-1 overflow-y-auto scroll-smooth",
                    location.pathname === '/' ? "p-0" : "p-6"
                )}>
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav - Netflix Style */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 z-50 pb-safe">
                <div className="flex justify-between items-center px-2 h-16">
                    <NavLink
                        to="/"
                        className={({ isActive }) => cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors",
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <Home size={20} />
                        <span className="text-[10px] font-medium">Home</span>
                    </NavLink>
                    <NavLink
                        to="/library/movies"
                        className={({ isActive }) => cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors",
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <Film size={20} />
                        <span className="text-[10px] font-medium">Movies</span>
                    </NavLink>

                    {/* Add Button in Center for Mobile */}
                    {/* Add Button - Integrated Style */}
                    <button
                        onClick={() => setIsAddContentOpen(true)}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-1 text-gray-400 hover:text-white transition-colors group"
                    >
                        <div className="bg-white/10 p-1 rounded-lg group-hover:bg-white/20 transition-colors">
                            <Plus size={20} className="text-white" />
                        </div>
                        <span className="text-[10px] font-medium">Add</span>
                    </button>

                    <NavLink
                        to="/library/tv"
                        className={({ isActive }) => cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors",
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <Tv size={20} />
                        <span className="text-[10px] font-medium">TV</span>
                    </NavLink>
                    <NavLink
                        to="/library/photos"
                        className={({ isActive }) => cn(
                            "flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors",
                            isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <ImageIcon size={20} />
                        <span className="text-[10px] font-medium">Photos</span>
                    </NavLink>
                </div>
            </div>
            <AddContentModal isOpen={isAddContentOpen} onClose={() => setIsAddContentOpen(false)} />
        </div>
    );
}
