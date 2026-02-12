import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
// Hls import removed as currently handled in Diagnostics for detailed testing, 
// and this player focuses on Direct Play with API integration for properties.
// Ref is used for type but we can omit the import if we import type only or just any.


interface VideoPlayerProps {
    src: string; // Direct stream URL
    hlsUrl?: string; // Optional HLS URL if different, or we derive it
    itemId: string;
    poster?: string;
    initialTime?: number;
    onClose: () => void;
}

interface Track {
    id: string;
    index: number;
    type: 'audio' | 'subtitle';
    codec: string;
    language?: string;
    label?: string;
}

export default function VideoPlayer({ src, itemId, poster, initialTime, onClose }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const saveInterval = useRef<any>(null);

    // Player State
    const [audioTracks, setAudioTracks] = useState<any[]>([]); // HLS/Native objects
    const [currentAudio, setCurrentAudio] = useState<number>(-1);

    useEffect(() => {
        // Fetch DB tracks for info (though player might detect its own)
        axios.get(`/api/v1/items/${itemId}/tracks`)
            .then(res => setTracks(res.data))
            .catch(console.error);

        initializePlayer(src);

        // Start Progress Saver
        saveInterval.current = setInterval(saveProgress, 10000); // Save every 10s

        return () => {
            if (saveInterval.current) clearInterval(saveInterval.current);
            saveProgress(); // Final save
        };
    }, [src, itemId]);

    const saveProgress = () => {
        if (videoRef.current && !videoRef.current.paused) {
            const time = Math.floor(videoRef.current.currentTime);
            const duration = Math.floor(videoRef.current.duration);
            if (time > 0) {
                axios.post(`/api/v1/user/progress/${itemId}`, {
                    progressSeconds: time,
                    completed: duration > 0 && (time / duration > 0.9)
                }).catch(console.error);
            }
        }
    };

    const initializePlayer = (url: string) => {
        const video = videoRef.current;
        if (!video) return;

        video.src = url;
        // Logic to set initial time
        if (initialTime && initialTime > 0) {
            video.currentTime = initialTime;
        }
        video.load();

        // Listen for native tracks (Safari)
        // We need a small timeout or event to check tracks after metadata load
        video.addEventListener('loadedmetadata', () => {
            // Check native audio tracks (Safari)
            if ((video as any).audioTracks) {
                updateNativeTracks(video);
                (video as any).audioTracks.addEventListener('change', () => updateNativeTracks(video));
            }
            // Ensure initial time is set if metadata loaded later
            if (initialTime && initialTime > 0 && video.currentTime < 1) {
                video.currentTime = initialTime;
            }
        });
    };

    const updateNativeTracks = (video: any) => {
        const nativeTracks = video.audioTracks;
        const tracksArr = [];
        for (let i = 0; i < nativeTracks.length; i++) {
            tracksArr.push({
                id: i,
                label: nativeTracks[i].label || `Track ${i + 1} (${nativeTracks[i].language})`,
                enabled: nativeTracks[i].enabled
            });
            if (nativeTracks[i].enabled) setCurrentAudio(i);
        }
        setAudioTracks(tracksArr);
    };

    const selectAudio = (index: number) => {
        const video = videoRef.current as any;
        if (video && video.audioTracks) {
            for (let i = 0; i < video.audioTracks.length; i++) {
                video.audioTracks[i].enabled = (i === index);
            }
            setCurrentAudio(index);
        } else {
            console.warn("Audio switching not supported in this browser via Direct Play");
        }
    };

    return (
        <div className="player-wrapper">
            <div className="player-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <h3>Now Playing</h3>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <video
                ref={videoRef}
                controls
                autoPlay
                className="video-player"
                poster={poster}
            />

            {/* Controls Overlay */}
            <div className="player-controls" style={{ padding: '10px', background: '#222', color: '#fff' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                        <strong>Audio: </strong>
                        {audioTracks.length > 0 ? (
                            <select
                                value={currentAudio}
                                onChange={(e) => selectAudio(Number(e.target.value))}
                                style={{ background: '#333', color: 'white', border: '1px solid #555' }}
                            >
                                {audioTracks.map((t) => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        ) : (
                            <span style={{ fontSize: '0.9em', color: '#aaa' }}>
                                {tracks.filter(t => t.type === 'audio').length} detected (Selection unavailable in this browser)
                            </span>
                        )}
                    </div>

                    <div>
                        <strong>Subtitles: </strong>
                        <span style={{ fontSize: '0.9em', color: '#aaa' }}>
                            {tracks.filter(t => t.type === 'subtitle').length} detected (Not supported in Direct Play yet)
                        </span>
                    </div>
                </div>

                <div style={{ marginTop: '5px', fontSize: '0.8em', color: '#666' }}>
                    Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'} |
                    Direct Play Mode
                </div>
            </div>
        </div>
    );
}
