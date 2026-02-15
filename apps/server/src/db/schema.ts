import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    salt: text('salt'), // New
    isAdmin: integer('is_admin', { mode: 'boolean' }).default(false), // New
    preferences: text('preferences', { mode: 'json' }).default('{}'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const libraries = sqliteTable('libraries', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'movie', 'show', 'music', 'photo'
    path: text('path').notNull(),
});

export const mediaItems = sqliteTable('media_items', {
    id: text('id').primaryKey(),
    libraryId: text('library_id').references(() => libraries.id),
    parentId: text('parent_id'), // For episodes/seasons
    type: text('type').notNull(), // 'movie', 'episode', 'track', 'image'
    path: text('path').notNull(),
    title: text('title').notNull(),
    year: integer('year'),
    // Enhanced Metadata
    duration: integer('duration'), // Seconds
    codec: text('codec'), // h264, hevc
    resolution: text('resolution'), // 1080p, 4k
    bitrate: integer('bitrate'), // bps
    audioChannels: integer('audio_channels'),

    metadata: text('metadata', { mode: 'json' }), // JSON string for extra flexibility
    chapters: text('chapters', { mode: 'json' }), // Array of { title, start, end }
    addedAt: integer('added_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const mediaStreams = sqliteTable('media_streams', {
    id: text('id').primaryKey(),
    mediaItemId: text('media_item_id').references(() => mediaItems.id).notNull(),
    index: integer('index').notNull(), // Stream index in file
    type: text('type').notNull(), // 'audio', 'subtitle'
    codec: text('codec').notNull(),
    language: text('language'),
    label: text('label'),
    isDefault: integer('is_default', { mode: 'boolean' }).default(false),
});

export const transcodeJobs = sqliteTable('transcode_jobs', {
    id: text('id').primaryKey(),
    mediaItemId: text('media_item_id').references(() => mediaItems.id).notNull(),
    status: text('status').notNull(), // 'pending', 'processing', 'completed', 'failed'
    progress: integer('progress').default(0),
    outputDir: text('output_dir'), // Cache path
    masterPlaylist: text('master_playlist'), // Master m3u8 filename
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const images = sqliteTable('images', {
    id: text('id').primaryKey(),
    mediaItemId: text('media_item_id').references(() => mediaItems.id).notNull(),
    type: text('type').notNull(), // 'poster', 'backdrop', 'thumbnail'
    path: text('path').notNull(), // Local cache path
    size: text('size'), // 'original', 'thumb', 'medium'
});

export const watchHistory = sqliteTable('watch_history', {
    userId: text('user_id').references(() => users.id).notNull(),
    mediaItemId: text('media_item_id').references(() => mediaItems.id).notNull(),
    progressSeconds: integer('progress_seconds').default(0),
    completed: integer('completed', { mode: 'boolean' }).default(false),
    lastWatchedAt: integer('last_watched_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
    pk: uniqueIndex('user_media_pk').on(table.userId, table.mediaItemId),
}));
