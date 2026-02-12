import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function PlaybackDiagnostics() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hlsUrl, setHlsUrl] = useState('');
    const [mode, setMode] = useState<'native' | 'hls.js' | 'none'>('none');
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({
        buffered: '0',
        currentTime: 0,
        duration: 0,
    });

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toISOString().split('T')[1]}] ${msg}`, ...prev].slice(0, 50));
    };

    const loadStream = () => {
        if (!hlsUrl || !videoRef.current) return;
        const video = videoRef.current;
        addLog(`Attempting to load: ${hlsUrl}`);

        if (Hls.isSupported()) {
            setMode('hls.js');
            addLog('Hls.js is supported. Initializing...');
            const hls = new Hls({ debug: false });
            hls.loadSource(hlsUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                addLog('Manifest parsed, starting playback');
                video.play().catch(e => addLog(`Play error: ${e.message}`));
            });

            hls.on(Hls.Events.ERROR, (_event, data) => {
                addLog(`HLS Error: ${data.type} - ${data.details}`);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            addLog('Fatal network error, trying to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            addLog('Fatal media error, trying to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            addLog('Fatal error, cannot recover');
                            hls.destroy();
                            break;
                    }
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            setMode('native');
            addLog('Native HLS supported. Setting src...');
            video.src = hlsUrl;
            video.addEventListener('loadedmetadata', () => {
                addLog('Native: loadedmetadata');
                video.play().catch(e => addLog(`Play error: ${e.message}`));
            });
            video.addEventListener('error', (e) => {
                addLog(`Native Error: ${(e.target as HTMLVideoElement).error?.message || 'Unknown'}`);
            });
        } else {
            setMode('none');
            addLog('Error: HLS not supported in this browser');
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current) {
                const v = videoRef.current;
                let bufferStr = '';
                for (let i = 0; i < v.buffered.length; i++) {
                    bufferStr += `[${v.buffered.start(i).toFixed(1)}-${v.buffered.end(i).toFixed(1)}] `;
                }
                setStats({
                    currentTime: v.currentTime,
                    duration: v.duration,
                    buffered: bufferStr || 'none'
                });
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4" style={{ color: 'white' }}>
            <h2>Playback Diagnostics</h2>
            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    value={hlsUrl}
                    onChange={e => setHlsUrl(e.target.value)}
                    placeholder="Enter HLS URL (.m3u8)"
                    style={{ width: '80%', padding: '8px', color: 'black' }}
                />
                <button onClick={loadStream} style={{ padding: '8px', marginLeft: '8px', cursor: 'pointer' }}>
                    Load
                </button>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <video
                        ref={videoRef}
                        controls
                        style={{ width: '100%', border: '1px solid #444' }}
                    />
                    <div style={{ marginTop: '10px', background: '#222', padding: '10px' }}>
                        <p><strong>Mode:</strong> {mode}</p>
                        <p><strong>Time:</strong> {stats.currentTime.toFixed(2)} / {stats.duration.toFixed(2)}</p>
                        <p><strong>Buffered:</strong> {stats.buffered}</p>
                    </div>
                </div>
                <div style={{ flex: 1, background: '#111', padding: '10px', height: '400px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                    {logs.map((log, i) => <div key={i} style={{ borderBottom: '1px solid #333' }}>{log}</div>)}
                </div>
            </div>
        </div>
    );
}
