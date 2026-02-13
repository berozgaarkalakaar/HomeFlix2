import { useState, useRef, useEffect } from 'react';
import { Upload, X, Film, Tv, Music, Image as ImageIcon, FileVideo, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import * as tus from 'tus-js-client';
import axios from 'axios';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils'; // Assuming cn utility exists

interface AddContentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Category = 'movies' | 'tv' | 'music' | 'photos';

interface UploadItem {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'paused' | 'success' | 'error';
    uploadId?: string;
    speed?: string;
    tusUpload?: tus.Upload;
    error?: string;
}

export function AddContentModal({ isOpen, onClose }: AddContentModalProps) {
    const { token } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [category, setCategory] = useState<Category | null>(null);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [metadata, setMetadata] = useState<any>({});

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setCategory(null);
                setUploads([]);
                setMetadata({});
            }, 300); // Wait for fade out
        }
    }, [isOpen]);


    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newUploads: UploadItem[] = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            progress: 0,
            status: 'pending'
        }));
        setUploads([...uploads, ...newUploads]);
    };

    const startUpload = async (item: UploadItem) => {
        if (!category) return;

        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u));

        const upload = new tus.Upload(item.file, {
            endpoint: 'http://localhost:3001/files',
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: {
                filename: item.file.name,
                filetype: item.file.type
            },
            onError: (error) => {
                console.error('Failed because: ' + error);
                setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: error.message } : u));
            },
            onProgress: (bytesUploaded, bytesTotal) => {
                const percentage = (bytesUploaded / bytesTotal) * 100;
                setUploads(prev => prev.map(u => u.id === item.id ? { ...u, progress: percentage } : u));
            },
            onSuccess: async () => {
                const uploadUrl = upload.url;
                const uploadId = uploadUrl?.split('/').pop();

                if (uploadId) {
                    try {
                        await axios.post('/api/v1/uploads/commit', {
                            uploadId,
                            category,
                            originalFilename: item.file.name,
                            metadata: {
                                ...metadata,
                                title: category === 'movies' && uploads.length === 1 ? metadata.title : undefined
                            }
                        }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'success', progress: 100 } : u));
                    } catch (err: any) {
                        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: err.response?.data?.error || err.message } : u));
                    }
                }
            }
        });

        upload.start();
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, tusUpload: upload } : u));
    };

    const handleUploadAll = () => {
        uploads.filter(u => u.status === 'pending').forEach(startUpload);
    };

    const categories = [
        { id: 'movies', label: 'Movies', icon: Film, desc: 'Add blockedbuster hits to your library', color: 'from-blue-600 to-indigo-900' },
        { id: 'tv', label: 'TV Shows', icon: Tv, desc: 'Manage series, seasons, and episodes', color: 'from-purple-600 to-pink-900' },
        { id: 'music', label: 'Music', icon: Music, desc: 'Organize albums, artists, and tracks', color: 'from-emerald-600 to-teal-900' },
        { id: 'photos', label: 'Photos', icon: ImageIcon, desc: 'Your personal gallery and memories', color: 'from-orange-500 to-red-900' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[600px] animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Add Content</h2>
                        <p className="text-sm text-gray-400 mt-1">Upload media to your personal streaming library</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Indicators (Breadcrumbs style) */}
                <div className="px-8 py-4 flex items-center gap-4 text-sm font-medium border-b border-white/5 bg-[#0a0a0a]">
                    <div className={cn("flex items-center gap-2", step >= 1 ? "text-primary" : "text-gray-600")}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs border", step >= 1 ? "border-primary bg-primary/20" : "border-gray-700 bg-transparent")}>1</div>
                        <span>Type</span>
                    </div>
                    <div className="w-8 h-px bg-white/10" />
                    <div className={cn("flex items-center gap-2", step >= 2 ? "text-primary" : "text-gray-600")}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs border", step >= 2 ? "border-primary bg-primary/20" : "border-gray-700 bg-transparent")}>2</div>
                        <span>Details & Upload</span>
                    </div>
                    <div className="w-8 h-px bg-white/10" />
                    <div className={cn("flex items-center gap-2", step >= 3 ? "text-primary" : "text-gray-600")}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs border", step >= 3 ? "border-primary bg-primary/20" : "border-gray-700 bg-transparent")}>3</div>
                        <span>Processing</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">

                    {/* Step 1: Category Selection */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full content-center">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setCategory(cat.id as Category);
                                        setStep(2);
                                    }}
                                    className="group relative overflow-hidden rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300 text-left h-40"
                                >
                                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br", cat.color)} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                                    <div className="relative p-6 h-full flex flex-col justify-end z-10">
                                        <div className="mb-auto p-3 bg-white/10 rounded-lg w-fit backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                            <cat.icon size={24} className="text-white" />
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">{cat.label}</h3>
                                        <p className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">{cat.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Configure & Upload */}
                    {step === 2 && category && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <span className="text-primary uppercase tracking-wider text-sm font-bold">Target Library:</span>
                                    {categories.find(c => c.id === category)?.label}
                                </h3>
                                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-gray-400 hover:text-white">
                                    Change Category
                                </Button>
                            </div>

                            <div className="grid gap-8 md:grid-cols-[1fr_300px]">
                                {/* Upload Zone */}
                                <div className="order-2 md:order-1">
                                    <div className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center hover:border-primary/50 hover:bg-white/5 transition-all duration-300 cursor-pointer h-full flex flex-col items-center justify-center min-h-[250px] relative group">
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileSelect}
                                        />
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <Upload size={32} className="text-primary" />
                                        </div>
                                        <span className="text-lg font-medium text-white mb-2">Drag & Drop files here</span>
                                        <span className="text-sm text-gray-500">or click to browse your computer</span>
                                        <div className="mt-6 flex gap-2 text-xs text-gray-600 font-mono">
                                            <span className="px-2 py-1 rounded bg-white/5">MP4</span>
                                            <span className="px-2 py-1 rounded bg-white/5">MKV</span>
                                            <span className="px-2 py-1 rounded bg-white/5">MP3</span>
                                            <span className="px-2 py-1 rounded bg-white/5">JPG</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata Sidebar */}
                                <div className="order-1 md:order-2 space-y-4">
                                    <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Metadata</h4>
                                        <div className="space-y-4">
                                            {category === 'movies' && (
                                                <>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Movie Title</label>
                                                        <input
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-700"
                                                            placeholder="Auto-detect from file"
                                                            onChange={e => setMetadata({ ...metadata, title: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Release Year</label>
                                                        <input
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-700"
                                                            placeholder="Year"
                                                            onChange={e => setMetadata({ ...metadata, year: e.target.value })}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            {category === 'tv' && (
                                                <>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Show Name</label>
                                                        <input
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-700"
                                                            placeholder="e.g. Breaking Bad"
                                                            onChange={e => setMetadata({ ...metadata, show: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Season Number</label>
                                                        <input
                                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-gray-700"
                                                            placeholder="e.g. 1"
                                                            onChange={e => setMetadata({ ...metadata, season: e.target.value })}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            {(category === 'music' || category === 'photos') && (
                                                <div className="p-4 rounded bg-white/5 text-center text-xs text-gray-500">
                                                    Metadata will be extracted automatically from file tags where possible.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed File List */}
                            {uploads.length > 0 && (
                                <div className="space-y-3 pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-end">
                                        <h4 className="text-sm font-medium text-gray-400">Queue ({uploads.length})</h4>
                                        <Button
                                            size="lg"
                                            onClick={() => { setStep(3); handleUploadAll(); }}
                                            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 px-8"
                                        >
                                            Start Processing <ArrowRight size={16} className="ml-2" />
                                        </Button>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden max-h-[160px] overflow-y-auto">
                                        {uploads.map((u, i) => (
                                            <div key={u.id} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-mono text-gray-400">
                                                        {u.file.name.split('.').pop()?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-white truncate max-w-[200px]">{u.file.name}</p>
                                                        <p className="text-xs text-gray-500">{(u.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                    onClick={() => setUploads(uploads.filter(item => item.id !== u.id))}
                                                >
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Upload Progress */}
                    {step === 3 && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 py-8">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Processing Your Files</h3>
                                <p className="text-gray-400">Please keep this window open until uploads complete.</p>
                            </div>

                            <div className="space-y-4">
                                {uploads.map(u => (
                                    <div key={u.id} className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5 shadow-inner">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                {u.status === 'uploading' && <Loader2 size={18} className="text-primary animate-spin" />}
                                                {u.status === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                                                {u.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                                                <span className="font-medium text-white truncate max-w-[250px]">{u.file.name}</span>
                                            </div>
                                            <span className="text-xs font-mono text-gray-400">
                                                {u.status === 'success' ? 'COMPLETE' : u.status === 'error' ? 'FAILED' : `${u.progress.toFixed(0)}%`}
                                            </span>
                                        </div>

                                        <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-500 ease-out rounded-full",
                                                    u.status === 'success' ? 'bg-green-500' :
                                                        u.status === 'error' ? 'bg-red-500' :
                                                            'bg-gradient-to-r from-primary to-orange-500'
                                                )}
                                                style={{ width: `${u.progress}%` }}
                                            />
                                        </div>

                                        {u.error && <p className="text-xs text-red-500 mt-2 bg-red-500/10 p-2 rounded">{u.error}</p>}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-center">
                                {uploads.every(u => ['success', 'error'].includes(u.status)) && (
                                    <Button onClick={onClose} size="lg" className="bg-white text-black hover:bg-gray-200 font-semibold px-8 rounded-full">
                                        Return to Library
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Status Bar */}
                <div className="px-8 py-3 bg-[#0a0a0a] border-t border-white/5 flex justify-between items-center text-xs text-gray-600 font-mono">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                        <span>System Online</span>
                    </div>
                    {category && <span>Target: {category.toUpperCase()}</span>}
                </div>
            </div>
        </div>
    );
}
