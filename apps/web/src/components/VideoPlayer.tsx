import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    Settings, Subtitles, ChevronLeft, SkipForward, Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from './ui/dropdown-menu';

interface VideoPlayerProps {
    src: string;
    itemId: string;
    poster?: string;
    initialTime?: number;
    onClose: () => void;
}

interface Track {
    id: number;
    label: string;
    language?: string;
}

export default function VideoPlayer({ src, itemId, poster, initialTime, onClose }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Player State
    const [paused, setPaused] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [buffered, setBuffered] = useState(0);

    // Stream Info
    const [audioTracks, setAudioTracks] = useState<Track[]>([]);
    const [currentAudio, setCurrentAudio] = useState(-1);
    const [qualities, setQualities] = useState<any[]>([]);
    const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto

    const hlsRef = useRef<Hls | null>(null);

    // -- Initialization --

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Reset
        setLoading(true);

        const onLoadedMetadata = () => {
            setDuration(video.duration);
            setLoading(false);
            if (initialTime && initialTime > 0) {
                video.currentTime = initialTime;
            }
            video.play().catch(() => setPaused(true));
        };

        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            // Buffer
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const onPlay = () => setPaused(false);
        const onPause = () => setPaused(true);
        const onWaiting = () => setLoading(true);
        const onPlaying = () => setLoading(false);

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);

        // HLS Logic
        if (Hls.isSupported() && src.includes('.m3u8')) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const levels = data.levels.map((l: any, idx: number) => ({
                    id: idx,
                    height: l.height,
                    bitrate: l.bitrate
                }));
                setQualities(levels);
            });

            // Audio Tracks (HLS.js)
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
                setAudioTracks(data.audioTracks.map((t: any) => ({
                    id: t.id,
                    label: t.name || t.lang || `Track ${t.id}`,
                    language: t.lang
                })));
                setCurrentAudio(hls.audioTrack);
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari Native HLS
            video.src = src;
        } else {
            // Fallback / Direct Play
            video.src = src;
        }

        return () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('playing', onPlaying);
            if (hlsRef.current) hlsRef.current.destroy();
        };
    }, [src, initialTime]);

    // -- Controls Behavior --

    const resetControlsTimeout = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (!paused) {
            controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
        }
    }, [paused]);

    useEffect(() => {
        resetControlsTimeout();
        window.addEventListener('mousemove', resetControlsTimeout);
        return () => window.removeEventListener('mousemove', resetControlsTimeout);
    }, [resetControlsTimeout]);

    // -- Progress Sync --
    useEffect(() => {
        const interval = setInterval(() => {
            if (!paused && videoRef.current) {
                const time = Math.floor(videoRef.current.currentTime);
                if (time > 0) {
                    axios.post(`/api/v1/user/progress/${itemId}`, {
                        progressSeconds: time,
                        completed: duration > 0 && (time / duration > 0.95)
                    }).catch(console.error);
                }
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [itemId, paused, duration]);


    // -- Actions --

    const togglePlay = () => {
        if (videoRef.current) {
            if (paused) videoRef.current.play();
            else videoRef.current.pause();
        }
    };

    const seek = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            setCurrentTime(seconds);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !muted;
            setMuted(!muted);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const changeQuality = (levelId: number) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = levelId;
            setCurrentQuality(levelId);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const skipForward = () => {
        if (videoRef.current) videoRef.current.currentTime += 10;
    };

    const skipBackward = () => {
        if (videoRef.current) videoRef.current.currentTime -= 10;
    };


    // -- New State --
    const [chapters, setChapters] = useState<any[]>([]);
    const [currentChapter, setCurrentChapter] = useState<any>(null);
    const [qualityLevel, setQualityLevel] = useState<string>('Original');

    // -- Fetch Metadata (Chapters) --
    useEffect(() => {
        axios.get(`/api/v1/library/items/${itemId}`)
            .then(res => {
                if (res.data.chapters) {
                    try {
                        const parsed = typeof res.data.chapters === 'string'
                            ? JSON.parse(res.data.chapters)
                            : res.data.chapters;
                        setChapters(parsed);
                    } catch (e) {
                        console.error("Failed to parse chapters", e);
                    }
                }
            })
            .catch(console.error);
    }, [itemId]);

    // -- Check Chapters for Skip --
    useEffect(() => {
        if (!chapters.length) return;
        const current = chapters.find(c => currentTime >= c.start && currentTime < c.end);

        // Only show if title implies Intro/Outro/Recap
        if (current && /intro|recap|opening/i.test(current.title)) {
            setCurrentChapter(current);
        } else {
            setCurrentChapter(null);
        }
    }, [currentTime, chapters]);

    const skipChapter = () => {
        if (currentChapter) {
            seek(currentChapter.end);
        }
    };

    // -- Quality Change (Non-HLS Transcoding) --
    const changeTranscodeQuality = (height: number | null) => {
        setLoading(true);
        const time = videoRef.current ? videoRef.current.currentTime : 0;

        // Construct new URL
        const mkUrl = (h: number | null) => {
            const base = src.split('?')[0]; // Remove existing params
            return h ? `${base}?height=${h}` : base;
        };

        const newSrc = mkUrl(height);
        setQualityLevel(height ? `${height}p` : 'Original');

        if (videoRef.current) {
            videoRef.current.src = newSrc;
            videoRef.current.currentTime = time;
            videoRef.current.play().catch(console.error);
        }
    };

    const togglePiP = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
                await videoRef.current.requestPictureInPicture();
            }
        } catch (e) {
            console.error("PiP failed", e);
        }
    };

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center group overflow-hidden"
            onDoubleClick={toggleFullscreen}
        >
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                poster={poster}
                onClick={togglePlay}
                playsInline
            />

            {/* Spinner */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none z-10">
                    <Loader2 className="animate-spin text-primary" size={64} />
                </div>
            )}

            {/* Skip Intro Button */}
            {currentChapter && (
                <div className="absolute bottom-24 right-8 z-20 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <Button
                        onClick={skipChapter}
                        className="bg-white text-black hover:bg-white/90 font-bold px-6 py-6 rounded-lg text-lg shadow-xl transition-transform hover:scale-105"
                    >
                        <SkipForward className="mr-2" fill="black" />
                        Skip {currentChapter.title}
                    </Button>
                </div>
            )}

            {/* Overlay */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 flex flex-col justify-between p-6 z-0",
                showControls || paused ? "opacity-100" : "opacity-0 cursor-none"
            )}>
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full" onClick={onClose}>
                        <ChevronLeft size={28} />
                    </Button>
                </div>

                {/* Center Controls (Play/Pause Big) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {!loading && (
                        <div className={cn("bg-black/50 p-6 rounded-full backdrop-blur-sm transition-transform duration-200 transform scale-100 pointer-events-auto cursor-pointer", !paused && "opacity-0 scale-90")} onClick={togglePlay}>
                            {paused ? <Play fill="white" size={48} className="translate-x-1" /> : <Pause fill="white" size={48} />}
                        </div>
                    )}
                </div>


                {/* Bottom Bar */}
                <div className="space-y-4">
                    {/* Scrubber */}
                    <div className="group/scrubber relative h-2 w-full cursor-pointer touch-none"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = (e.clientX - rect.left) / rect.width;
                            seek(pos * duration);
                        }}
                    >
                        {/* Background */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/30 rounded-full group-hover/scrubber:h-2 transition-all" />
                        {/* Buffered */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-white/50 rounded-full group-hover/scrubber:h-2 transition-all"
                            style={{ width: `${(buffered / duration) * 100}%` }}
                        />
                        {/* Progress */}
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full group-hover/scrubber:h-2 transition-all relative"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/scrubber:scale-100 transition-transform shadow-lg" />
                        </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="hover:text-primary transition-colors">
                                {paused ? <Play fill="white" size={24} /> : <Pause fill="white" size={24} />}
                            </button>

                            <button onClick={skipBackward} className="hover:text-primary transition-colors text-xs font-bold flex items-center">
                                -10s
                            </button>

                            <button onClick={skipForward} className="hover:text-primary transition-colors text-xs font-bold flex items-center">
                                +10s
                            </button>

                            <div className="flex items-center gap-2 group/vol">
                                <button onClick={toggleMute} className="hover:text-primary transition-colors">
                                    {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                </button>
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={muted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        setMuted(v === 0);
                                        if (videoRef.current) videoRef.current.volume = v;
                                    }}
                                    className="w-0 overflow-hidden group-hover/vol:w-24 transition-all h-1 bg-white/30 accent-primary rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="text-sm font-medium">
                                {formatTime(currentTime)} <span className="text-white/50">/ {formatTime(duration)}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Quality - Only show if not HLS (HLS has its own logic, assuming separate for now) */}
                            {qualities.length === 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 hover:text-primary text-sm font-bold transition-colors">
                                            <Settings size={20} />
                                            <span className="hidden sm:inline">{qualityLevel}</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 bg-black/90 border-white/10 text-white">
                                        <DropdownMenuLabel>Quality</DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem onClick={() => changeTranscodeQuality(null)}>
                                            Original
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => changeTranscodeQuality(1080)}>
                                            1080p
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => changeTranscodeQuality(720)}>
                                            720p
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => changeTranscodeQuality(480)}>
                                            480p
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* PiP */}
                            <button onClick={togglePiP} className="hover:text-primary transition-colors" title="Picture in Picture">
                                <Maximize size={20} className="scale-75" />
                            </button>


                            <button onClick={toggleFullscreen} className="hover:text-primary transition-colors">
                                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
