import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Home,
    Film,
    Tv,
    Music,
    Image as ImageIcon,
    Settings,
    Activity,
    LogOut,
    User,
    Search,
    ChevronLeft,
    ChevronRight,
    Pin,
    Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    onAddContent: () => void;
}

export function Sidebar({ collapsed, setCollapsed, onAddContent }: SidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Film, label: 'Movies', path: '/library/movies' },
        { icon: Tv, label: 'TV Shows', path: '/library/tv' },
        { icon: Music, label: 'Music', path: '/library/music' },
        { icon: ImageIcon, label: 'Photos', path: '/library/photos' },
    ];

    const utilityItems = [
        { icon: Activity, label: 'Diagnostics', path: '/diagnostics' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-surface border-r border-white/5 transition-all duration-300 md:relative",
                collapsed ? "w-[72px]" : "w-[240px]",
                // Mobile: typically hidden or overlay, simplified here for responsive tablet logic
                "hidden md:flex"
            )}
        >
            <div className="flex items-center justify-between p-4 h-16 border-b border-white/5">
                {!collapsed && (
                    <h1 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-400 bg-clip-text text-transparent truncate">
                        HomeFlix
                    </h1>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto"
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </Button>
            </div>

            <nav className="flex-1 py-4 space-y-2 overflow-y-auto">
                <div className="px-3 mb-6">
                    <Button
                        onClick={onAddContent}
                        className={cn(
                            "w-full flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold transition-all shadow-lg hover:shadow-primary/25",
                            collapsed ? "justify-center px-0 aspect-square" : "justify-center"
                        )}
                        size={collapsed ? "icon" : "default"}
                    >
                        <Plus size={20} />
                        {!collapsed && <span>Add Content</span>}
                    </Button>
                </div>

                <div className="px-3">
                    {!collapsed && (
                        <p className="text-xs uppercase text-text-medium font-semibold mb-2 px-3">
                            Menu
                        </p>
                    )}
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-text-medium hover:text-text-high hover:bg-white/5",
                                isActive && "bg-accent/10 text-accent border-l-2 border-accent",
                                collapsed && "justify-center px-0"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </div>

                <div className="px-3 mt-6">
                    {!collapsed && (
                        <p className="text-xs uppercase text-text-medium font-semibold mb-2 px-3">
                            System
                        </p>
                    )}
                    {utilityItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-text-medium hover:text-text-high hover:bg-white/5",
                                isActive && "bg-accent/10 text-accent border-l-2 border-accent",
                                collapsed && "justify-center px-0"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon size={20} />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </div>
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                    <div className="w-8 h-8 rounded-full bg-surface border border-white/10 flex items-center justify-center">
                        <User size={16} className="text-text-medium" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate text-text-high">{user?.username}</p>
                            <button onClick={logout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                <LogOut size={12} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
