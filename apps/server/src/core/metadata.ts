import ffmpeg from 'fluent-ffmpeg';

export interface MediaMetadata {
    duration: number; // seconds
    format: string; // container
    bitrate: number;
    size: number;
    video: {
        codec: string;
        resolution: string; // 1920x1080
        width: number;
        height: number;
    } | null;
    audio: {
        index: number;
        codec: string;
        channels: number;
        language?: string;
        label?: string;
        isDefault: boolean;
    }[];
    subtitles: {
        index: number;
        codec: string;
        language?: string;
        label?: string;
        isDefault: boolean;
    }[];
    chapters: {
        title: string;
        start: number;
        end: number;
    }[];
}

export const getMediaMetadata = (filePath: string): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);

            const format = metadata.format;
            const streams = metadata.streams;

            const videoStream = streams.find(s => s.codec_type === 'video');
            const audioStreams = streams.filter(s => s.codec_type === 'audio');
            const subtitleStreams = streams.filter(s => s.codec_type === 'subtitle');

            const result: MediaMetadata = {
                duration: format.duration || 0,
                format: format.format_name || 'unknown',
                bitrate: format.bit_rate || 0,
                size: format.size || 0,
                video: videoStream ? {
                    codec: videoStream.codec_name || 'unknown',
                    resolution: `${videoStream.width}x${videoStream.height}`,
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                } : null,
                audio: audioStreams.map(s => ({
                    index: s.index,
                    codec: s.codec_name || 'unknown',
                    channels: s.channels || 2,
                    language: s.tags?.language,
                    label: s.tags?.title || s.tags?.label,
                    isDefault: !!s.disposition?.default,
                })),
                subtitles: subtitleStreams.map(s => ({
                    index: s.index,
                    codec: s.codec_name || 'unknown',
                    language: s.tags?.language,
                    label: s.tags?.title || s.tags?.label,
                    isDefault: !!s.disposition?.default,
                })),
                chapters: metadata.chapters?.map(c => ({
                    title: c.tags?.title || 'Chapter',
                    start: c.start_time || 0,
                    end: c.end_time || 0,
                })) || []
            };

            resolve(result);
        });
    });
};
