// @ts-check
import fg from 'fast-glob';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Collects JavaScript files based on input patterns and options.
 *
 * @param {string[]} patterns - Glob patterns or file/directory paths
 * @param {boolean} recursive - If true, directories are expanded to `dir/**\/*.js`
 * @param {string[]} excludePatterns - Patterns to exclude
 * @returns {Promise<string[]>} - Array of absolute file paths
 */
export async function collectFiles(patterns, recursive, excludePatterns) {
    // Expand directories when recursive is true
    const expandedPatterns = [];
    for (let pattern of patterns) {
        try {
            pattern = pattern.replace(/\\/g, '/');
            const stat = fs.statSync(pattern);
            if (stat.isDirectory()) {
                if (recursive) {
                    expandedPatterns.push(path.join(pattern, '**/*.js'));
                }
                // If recursive is false, skip directories (they won't match any files)
            } else {
                // It's a file, keep as is
                expandedPatterns.push(pattern);
            }
        } catch {
            // Not an existing path, treat as glob pattern
            expandedPatterns.push(pattern);
        }
    }

    if (expandedPatterns.length === 0) {
        return [];
    }

    const files = await fg(expandedPatterns, {
        ignore: excludePatterns,
        absolute: true,
        onlyFiles: true,
        followSymbolicLinks: false,
    });

    // Filter to only .js files (in case a pattern without extension matched something else)
    return files.filter(f => f.endsWith('.js'));
}
