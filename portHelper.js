/**
 * portHelper.js — PortKiller GNOME Extension
 * Utility module for scanning open ports and killing processes.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

/**
 * Runs a shell command synchronously and returns stdout as a string.
 * @param {string[]} argv - Command and arguments array
 * @returns {string} stdout output
 */
function runCommandSync(argv) {
    try {
        const proc = Gio.Subprocess.new(
            argv,
            Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
        );
        const [, stdout] = proc.communicate_utf8(null, null);
        proc.wait(null);
        return stdout || '';
    } catch (e) {
        logError(e, `PortKiller: runCommandSync failed for ${argv.join(' ')}`);
        return '';
    }
}

/**
 * Parse `ss -tlnup` output into port info objects.
 * Returns an array of { port, pid, processName }
 *
 * Example ss line:
 * tcp  LISTEN 0  511  127.0.0.1:46173  0.0.0.0:*  users:(("node",pid=12345,fd=20))
 *
 * @returns {{ port: number, pid: number, processName: string }[]}
 */
export function getOpenPorts() {
    const output = runCommandSync(['ss', '-tlnup']);
    const lines = output.split('\n');
    const results = [];
    const seen = new Set();

    for (const line of lines) {
        if (!line.includes('LISTEN')) continue;

        // Extract Local Address column using spaces to support IPv6 flawlessly
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) continue;
        
        const localAddr = parts[4];
        const lastColonIndex = localAddr.lastIndexOf(':');
        if (lastColonIndex === -1) continue;
        
        const port = parseInt(localAddr.substring(lastColonIndex + 1), 10);
        if (!port || port <= 0 || port > 65535) continue;

        // Extract PID and process name from: users:(("name",pid=NNNN,fd=N))
        const pidMatch = line.match(/pid=(\d+)/);
        const nameMatch = line.match(/\(\("([^"]+)"/);

        const pid = pidMatch ? parseInt(pidMatch[1], 10) : null;
        const processName = nameMatch ? nameMatch[1] : 'unknown';

        const key = `${port}-${pid}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({ port, pid, processName });
    }

    // Sort by port number ascending
    results.sort((a, b) => a.port - b.port);
    return results;
}

/**
 * Kill a process by PID. Tries SIGTERM first, then SIGKILL.
 * @param {number} pid
 * @returns {{ success: boolean, message: string }}
 */
export function killProcess(pid) {
    if (!pid) return { success: false, message: 'No PID provided' };

    try {
        const proc = Gio.Subprocess.new(
            ['kill', '-15', String(pid)],
            Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE
        );
        proc.wait(null);
        const exitCode = proc.get_exit_status();

        if (exitCode === 0) {
            return { success: true, message: `Sent SIGTERM to PID ${pid}` };
        }

        // Fallback: force kill without privilege escalation.
        const proc2 = Gio.Subprocess.new(
            ['kill', '-9', String(pid)],
            Gio.SubprocessFlags.STDOUT_SILENCE | Gio.SubprocessFlags.STDERR_SILENCE
        );
        proc2.wait(null);
        const exitCode2 = proc2.get_exit_status();

        if (exitCode2 === 0) {
            return { success: true, message: `Sent SIGKILL to PID ${pid}` };
        }

        return { success: false, message: `Failed to kill PID ${pid}` };
    } catch (e) {
        logError(e, `PortKiller: killProcess(${pid}) error`);
        return { success: false, message: e.message };
    }
}

/**
 * Kill all processes from a list of port info objects.
 * @param {{ port: number, pid: number }[]} ports
 */
export function killAllPorts(ports) {
    for (const { pid } of ports) {
        if (pid) killProcess(pid);
    }
}
