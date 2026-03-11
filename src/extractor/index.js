// @ts-check

import * as espree from 'espree';
import { traverse } from './traverse.js';
import { EntityCollector } from './entityCollector.js';

/**
 * @typedef {import('../types.js').Entity} Entity
 * @typedef {import('../types.js').ExtractionOptions} ExtractionOptions
 */

/**
 * Extracts entities from a single JavaScript file.
 *
 * @param {string} filePath - Path to the file
 * @param {string} code - File content
 * @param {ExtractionOptions} options
 * @returns {Entity[]}
 */
export function extractEntities(filePath, code, options) {
    // Remove shebang
    code = code.replace(/^#!.*\n/, '');

    const collector = new EntityCollector();
    /** @type {Set<string>} */
    const exportedNamesSet = new Set();

    let ast;
    try {
        ast = espree.parse(code, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            loc: true,
            // @ts-ignore
            tolerant: true,
        });
    } catch (err) {
        console.error(`Failed to parse ${filePath}:`, err.message);
        return [];
    }

    // Initial context
    const ctx = {
        file: filePath,
        inExport: false,
        currentFunction: null,
        depth: 0,
        exportedNamesSet,
    };

    traverse(ast, ctx, options, collector);

    // Apply exports from specifiers
    collector.applyExports(exportedNamesSet);

    return collector.getAll();
}
