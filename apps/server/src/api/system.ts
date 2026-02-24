import { Request, Response } from 'express';
import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import net from 'net';
import os from 'os';
import { db } from '../db';
import { libraries, networkCredentials } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { scanner } from '../core/scanner';
import { eq } from 'drizzle-orm';

const execAsync = promisify(exec);
const MOUNT_ROOT = path.join(process.cwd(), 'mnt');

// Check if host is reachable on Port 445 (SMB)
const checkSmbReachability = (host: string, timeout = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            console.log(`[System] Successfully connected to ${host}:445`);
            status = true;
            socket.destroy();
        });

        socket.on('timeout', () => {
            console.warn(`[System] Timeout connecting to ${host}:445 after ${timeout}ms`);
            status = false;
            socket.destroy();
        });

        socket.on('error', (err) => {
            console.warn(`[System] Error connecting to ${host}:445 - ${err.message}`);
            status = false;
            socket.destroy();
        });

        socket.on('close', () => {
            resolve(status);
        });

        // Attempt connection
        try {
            socket.connect(445, host);
        } catch (e) {
            console.error(`[System] Exception checking ${host}:`, e);
            resolve(false);
        }
    });
};

const getLocalIPs = () => {
    const nets = os.networkInterfaces();
    const results: string[] = ['localhost', '127.0.0.1'];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
};

// Ensure mount root exists
fs.ensureDirSync(MOUNT_ROOT);

export const handleMountShare = async (req: any, res: Response) => {
    try {
        let { host, share, username, password, category, path: rawPath } = req.body;

        // Smart Path Parsing
        if (rawPath && !host && !share) {
            // Try to parse \\HOST\Share or smb://HOST/Share
            let cleanPath = rawPath.trim();

            // Handle SMB URI
            if (cleanPath.startsWith('smb://')) {
                cleanPath = cleanPath.substring(6);
            }
            // Handle UNC Backslashes
            cleanPath = cleanPath.replace(/\\/g, '/');
            if (cleanPath.startsWith('//')) {
                cleanPath = cleanPath.substring(2);
            }

            const parts = cleanPath.split('/');
            if (parts.length >= 2) {
                host = parts[0];
                share = parts[1]; // We take the first folder as share. Subfolders? MVP: assume share root.
            }
        }

        if (!host || !share || !category) {
            return res.status(400).json({ error: 'Could not determine Host, Share, or Category from input.' });
        }

        const cleanHost = host.replace(/[^a-zA-Z0-9\.\-_]/g, '');
        const cleanShare = share.replace(/[^a-zA-Z0-9\.\-_\s]/g, '');

        // Check if trying to mount itself
        const localIPs = getLocalIPs();
        if (localIPs.includes(cleanHost)) {
            return res.status(400).json({
                error: `You are trying to connect to THIS computer (${cleanHost}).\nUse the "Local Path" tab instead to add folders directly.`
            });
        }

        // Pre-flight check: Is SMB port open?
        // This avoids waiting 60s for mount_smbfs to timeout
        console.log(`[System] Checking connectivity to ${cleanHost}:445...`);
        const isReachable = await checkSmbReachability(cleanHost);

        // WARN but DO NOT FAIL immediately. Some firewalls drop the probe but allow the mount,
        // or the user might be using a non-standard port (though we hardcode 445 currently).
        if (!isReachable) {
            console.warn(`[System] Warning: ${cleanHost}:445 was not reachable via TCP probe. Attempting mount anyway...`);
            // We could return a warning here, but let's try to mount. 
            // If mount fails, it will likely be because of this.
        }

        // Credential Resolution
        if (!username || !password) {
            // Try to find in DB
            const savedCreds = await db.select().from(networkCredentials).where(eq(networkCredentials.host, cleanHost)).get();
            if (savedCreds) {
                console.log(`Using saved credentials for ${cleanHost}`);
                username = savedCreds.username;
                password = savedCreds.password;
            }
        }

        const mountPointName = `${cleanHost}_${cleanShare.replace(/\s/g, '_')}`;
        const mountPointPath = path.join(MOUNT_ROOT, mountPointName);

        // Check/Create Mount Point
        if (fs.existsSync(mountPointPath)) {
            const files = await fs.readdir(mountPointPath);
            if (files.length > 0) {
                console.log(`Mount point ${mountPointPath} seems active.`);
                // Proceed to adding library
            }
        } else {
            await fs.ensureDir(mountPointPath);
        }

        // Construct URL
        // We must be careful. mount_smbfs expects URL-encoded values for user/pass,
        // BUT it has quirks. Standard encodeURIComponent is usually safe.
        // However, we should ensure we don't double-encode or miss special chars.

        const safeUser = encodeURIComponent(username || 'guest');
        const safePass = password ? encodeURIComponent(password) : '';

        // Note: For Guest (no password), syntaxes vary. 
        // //guest@host/share or //guest:@host/share are common.
        // If password exists, use :password@
        const authPart = password ? `${safeUser}:${safePass}@` : `${safeUser}@`;

        const smbUrl = `//${authPart}${cleanHost}/${cleanShare}`;

        try {
            console.log(`[System] Mounting ${cleanHost}/${cleanShare} to ${mountPointPath}`);
            // Log masked command for security
            console.log(`[System] Command: mount_smbfs "//${safeUser}:***@${cleanHost}/${cleanShare}" "${mountPointPath}"`);

            // macOS specific
            // Flags like '-o nounix' or '-o sec=ntlmssp' are failing on user's system.
            // Reverting to standard mount_smbfs URL-only syntax.
            await execAsync(`mount_smbfs "${smbUrl}" "${mountPointPath}"`);

            // If successful and we have new creds, save them
            if (username && password) {
                await db.insert(networkCredentials).values({
                    id: uuidv4(),
                    host: cleanHost,
                    username,
                    password,
                }).onConflictDoUpdate({
                    target: networkCredentials.host,
                    set: { username, password, updatedAt: new Date() }
                });
            }

        } catch (err: any) {
            console.error('[System] Mount Error Details:', err);

            // FALLBACK: Try pre-pending "MicrosoftAccount\" if it failed and looks like an email
            if (err.message.includes('Authentication error') && username.includes('@') && !username.startsWith('MicrosoftAccount')) {
                console.log('[System] Auth failed with email. Retrying with "MicrosoftAccount\\" prefix...');
                try {
                    const msUser = `MicrosoftAccount\\${username}`;
                    const safeMsUser = encodeURIComponent(msUser);
                    // password already encoded above in safePass if needed, but we need to reconstruct authPart
                    const safePass = password ? encodeURIComponent(password) : '';
                    const authPart = password ? `${safeMsUser}:${safePass}@` : `${safeMsUser}@`;
                    const msSmbUrl = `//${authPart}${cleanHost}/${cleanShare}`;

                    // Also use standard syntax here
                    await execAsync(`mount_smbfs "${msSmbUrl}" "${mountPointPath}"`);
                    console.log('[System] Fallback success!');

                    // Save the WORKING username (with prefix)
                    username = msUser;
                    if (username && password) {
                        await db.insert(networkCredentials).values({
                            id: uuidv4(),
                            host: cleanHost,
                            username, // Save the prefixed one
                            password,
                        }).onConflictDoUpdate({
                            target: networkCredentials.host,
                            set: { username, password, updatedAt: new Date() }
                        });
                    }

                    // Proceed to library creation (break out of catch)
                } catch (retryErr: any) {
                    console.error('[System] Fallback also failed:', retryErr);
                    // Fall through to error reporting below, using original error or retry error
                }
            }

            if (err.message.includes('File exists') || err.message.includes('Resource busy')) {
                // Already mounted, ignore
                console.log('[System] Mount point busy, assuming already mounted.');
            } else {
                // Determine user friendly error
                let userMsg = err.message;
                if (err.stderr) userMsg += ` (Stderr: ${err.stderr})`;

                // Common mount_smbfs errors:
                if (userMsg.includes('Authentication error')) {
                    userMsg = 'Authentication failed. Please check your username and password.';
                }
                if (userMsg.includes('Connection refused')) {
                    userMsg = `Connection refused by ${cleanHost}. Ensure SMB sharing is enabled on the target machine.`;
                }
                if (userMsg.includes('unknown host')) {
                    userMsg = `Unknown Host "${cleanHost}". Please check the IP address or hostname.`;
                }
                if (userMsg.includes('Operation timed out')) {
                    userMsg = `Connection to "${cleanHost}" timed out. \nPossible causes:\n1. The IP or Hostname "${cleanHost}" is incorrect.\n2. Firewalls are blocking the connection.\n3. The computer is offline.`;

                    if (cleanHost.length <= 2 && !cleanHost.includes('.')) {
                        userMsg += `\n\nNOTE: "${cleanHost}" looks like a Drive Letter or short name. You must use the actual Computer Name or IP Address (e.g. 192.168.1.10).`;
                    }
                }

                throw new Error(userMsg);
            }
        }

        // Create Library Entry
        const libId = uuidv4();
        // Map category to type
        let libType = 'movie';
        if (category === 'tv') libType = 'show';
        else if (category === 'music') libType = 'music';
        else if (category === 'photos') libType = 'photo';

        // Avoid duplicate library entries
        const existingLib = await db.query.libraries.findFirst({
            where: eq(libraries.path, mountPointPath)
        });

        if (!existingLib) {
            await db.insert(libraries).values({
                id: libId,
                name: `${category.charAt(0).toUpperCase() + category.slice(1)} (${cleanHost})`,
                type: libType,
                path: mountPointPath
            });
            scanner.scanLibrary(libId).catch(console.error);
            res.json({ success: true, libraryId: libId, path: mountPointPath, message: 'Mounted and added.' });
        } else {
            res.json({ success: true, libraryId: existingLib.id, path: mountPointPath, message: 'Already connected.' });
        }

    } catch (err: any) {
        console.error('Mount failed:', err);
        res.status(500).json({ error: 'Mount failed: ' + err.message });
    }
};
