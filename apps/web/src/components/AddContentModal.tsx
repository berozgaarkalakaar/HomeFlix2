import { useState, useRef, useEffect } from 'react';
import { Upload, X, Film, Tv, Music, Image as ImageIcon, FileVideo, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ArrowRight, Trash2, RefreshCw, List, FolderOpen } from 'lucide-react';
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

interface Library {
    id: string;
    name: string;
    path: string;
    type: string;
    itemCount?: number;
}

export function AddContentModal({ isOpen, onClose }: AddContentModalProps) {
    const { token } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [category, setCategory] = useState<Category | null>(null);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [metadata, setMetadata] = useState<any>({});
    const [systemMessage, setSystemMessage] = useState<string | null>(null);

    const [entryType, setEntryType] = useState<'upload' | 'link'>('upload');
    const [folderPaths, setFolderPaths] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [existingLibraries, setExistingLibraries] = useState<Library[]>([]);
    const [loadingLibs, setLoadingLibs] = useState(false);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setCategory(null);
                setUploads([]);
                setMetadata({});
                setEntryType('upload');
                setFolderPaths('');
                setIsLinking(false);
                setSystemMessage(null);
            }, 300); // Wait for fade out
        }
    }, [isOpen]);

    const fetchLibraries = async () => {
        setLoadingLibs(true);
        try {
            const res = await axios.get('/api/v1/libraries', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExistingLibraries(res.data);
        } catch (err) {
            console.error("Failed to fetch libraries", err);
        } finally {
            setLoadingLibs(false);
        }
    };

    useEffect(() => {
        if (isOpen && entryType === 'link') {
            fetchLibraries();
        }
    }, [isOpen, entryType]);


    if (!isOpen) return null;


    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) {
            setSystemMessage("No files selected.");
            return;
        }
        setSystemMessage(`Selected ${e.target.files.length} files. click "Start Processing" to begin.`);

        const newUploads: UploadItem[] = Array.from(e.target.files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            progress: 0,
            status: 'pending'
        }));
        setUploads(prev => [...prev, ...newUploads]);
    };

    const handleLinkFolders = async () => {
        if (!category || !folderPaths.trim()) return;
        setIsLinking(true);
        setSystemMessage(null);

        const paths = folderPaths.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        let successCount = 0;
        let failCount = 0;
        let errors: string[] = [];

        for (const path of paths) {
            try {
                await axios.post('/api/v1/libraries', {
                    name: `${category.charAt(0).toUpperCase() + category.slice(1)} (${path.split(/[/\\]/).pop()})`,
                    type: category === 'tv' ? 'show' : category === 'movies' ? 'movie' : category === 'music' ? 'music' : 'photo',
                    path: path
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                successCount++;
            } catch (err: any) {
                failCount++;
                errors.push(`${path}: ${err.response?.data?.error || err.message}`);
            }
        }

        setIsLinking(false);
        fetchLibraries(); // Refresh list

        if (failCount === 0) {
            setSystemMessage(`Successfully linked ${successCount} folder(s). Scanning in background.`);
            setFolderPaths(''); // Clear input on total success
            // Optional: Move to step 3 or stay here? User might want to see list.
            // Let's stay here and show success message, or maybe show a toast.
        } else {
            setSystemMessage(`Linked ${successCount} folder(s). Failed: ${failCount}. Errors: ${errors.join(', ')}`);
        }
    };

    const handleRemoveLibrary = async (id: string) => {
        if (!confirm('Are you sure you want to remove this library? Scanning data will be lost.')) return;
        try {
            await axios.delete(`/api/v1/libraries/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLibraries();
        } catch (err) {
            alert('Failed to delete library');
        }
    };

    const handleRescanLibrary = async (id: string) => {
        try {
            await axios.post(`/api/v1/libraries/${id}/scan`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Scan started for this library.');
        } catch (err) {
            alert('Failed to trigger scan');
        }
    };

    const startUpload = async (item: UploadItem) => {
        if (!category) return;

        console.log("Starting upload for:", item.file.name);
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'uploading' } : u));

        // Construct absolute URL for robustness
        const endpoint = `${window.location.origin}/files`;

        if (!item.file) {
            console.error("Invalid file object");
            setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: "Invalid File Object" } : u));
            return;
        }

        const upload = new tus.Upload(item.file, {
            endpoint,
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

        try {
            upload.start();
            setUploads(prev => prev.map(u => u.id === item.id ? { ...u, tusUpload: upload } : u));
        } catch (err: any) {
            console.error("Failed to start upload:", err);
            setUploads(prev => prev.map(u => u.id === item.id ? { ...u, status: 'error', error: "Start Fail: " + err.message } : u));
            setSystemMessage("Error starting upload: " + err.message);
        }
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

            <div className="relative bg-[#141414] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[700px] animate-in zoom-in-95 duration-300">

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
                        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-8 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <span className="text-primary uppercase tracking-wider text-sm font-bold">Target Library:</span>
                                    {categories.find(c => c.id === category)?.label}
                                </h3>
                                <div className="flex bg-white/10 rounded-lg p-1">
                                    <button
                                        onClick={() => setEntryType('upload')}
                                        className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", entryType === 'upload' ? "bg-primary text-white" : "text-gray-400 hover:text-white")}
                                    >
                                        Upload File
                                    </button>
                                    <button
                                        onClick={() => setEntryType('link')}
                                        className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", entryType === 'link' ? "bg-primary text-white" : "text-gray-400 hover:text-white")}
                                    >
                                        Manage Libraries
                                    </button>
                                </div>
                            </div>

                            {entryType === 'upload' ? (
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
                                        {systemMessage && (
                                            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-200 text-center text-sm animate-in fade-in slide-in-from-top-2">
                                                {systemMessage}
                                            </div>
                                        )}
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
                            ) : (
                                /* Link Folder & Manage Libraries UI */
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left: Add New Link */}
                                    <div className="space-y-6">
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 space-y-6 h-full">
                                            <div className="text-center">
                                                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 text-primary">
                                                    <FolderOpen size={24} />
                                                </div>
                                                <h4 className="text-lg font-bold text-white">Add Local Library</h4>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    Enter absolute paths to folders on your server. One path per line.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Folder Paths (Server Side)</label>
                                                <textarea
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono min-h-[120px] resize-none"
                                                    placeholder={window.navigator.platform.includes('Win') ? "C:\\Users\\Name\\Movies\nD:\\Backup\\TV Shows" : "/Users/name/Movies\n/Volumes/External/TV"}
                                                    value={folderPaths}
                                                    onChange={(e) => setFolderPaths(e.target.value)}
                                                />
                                                <p className="text-xs text-orange-400/80 mt-1">
                                                    * Ensure the server has read permissions.
                                                </p>
                                            </div>

                                            <Button
                                                onClick={handleLinkFolders}
                                                disabled={isLinking || !folderPaths.trim()}
                                                className="w-full py-6 text-base bg-primary hover:bg-primary/90 mt-4"
                                            >
                                                {isLinking ? (
                                                    <><Loader2 className="animate-spin mr-2" /> Linking & Scanning...</>
                                                ) : (
                                                    'Link Folders'
                                                )}
                                            </Button>

                                            {systemMessage && (
                                                <div className={cn("mt-4 p-3 rounded-lg text-center text-sm break-words", systemMessage.includes('Fail') || systemMessage.includes('Error') ? "bg-red-500/10 text-red-200" : "bg-green-500/10 text-green-200")}>
                                                    {systemMessage}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Existing Libraries List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Existing Libraries</h4>
                                            <Button variant="ghost" size="sm" onClick={fetchLibraries} disabled={loadingLibs}>
                                                <RefreshCw size={14} className={loadingLibs ? "animate-spin" : ""} />
                                            </Button>
                                        </div>

                                        <div className="bg-white/5 border border-white/5 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                                            {existingLibraries.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500 text-sm">
                                                    <List size={24} className="mx-auto mb-2 opacity-50" />
                                                    No libraries linked yet.
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-white/5">
                                                    {existingLibraries.map((lib) => (
                                                        <div key={lib.id} className="p-4 hover:bg-white/5 transition-colors group">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h5 className="font-semibold text-white text-sm">{lib.name}</h5>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleRescanLibrary(lib.id)}
                                                                        className="p-1.5 hover:bg-blue-500/20 text-blue-400 rounded"
                                                                        title="Rescan Library"
                                                                    >
                                                                        <RefreshCw size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleRemoveLibrary(lib.id)}
                                                                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded"
                                                                        title="Remove Library"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300 uppercase">{lib.type}</span>
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-400">
                                                                    {lib.itemCount !== undefined ? `${lib.itemCount} Items` : '...'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 font-mono break-all">{lib.path}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detailed File List (Only for uploads) */}
                            {entryType === 'upload' && uploads.length > 0 && (
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

                    {/* Step 3: Upload Progress / Success */}
                    {step === 3 && (
                        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 py-8">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">Processing Your Files</h3>
                                <p className="text-gray-400">Please keep this window open until uploads complete.</p>
                            </div>

                            <div className="space-y-4">
                                {uploads && Array.isArray(uploads) && uploads.map(u => (
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
