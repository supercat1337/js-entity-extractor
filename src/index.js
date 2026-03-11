#!/usr/bin/env node

// @ts-check
import minimist from 'minimist';
import { collectFiles } from './fileCollector.js';
import { extractEntities } from './extractor/index.js';
import { writeNdjson, writeSummary } from './outputWriter.js';
import fs from 'node:fs/promises';

const helpText = `
Usage: js-entity-extractor [patterns...] [options]

Extract user-defined classes, functions, variables, and parameters from JavaScript files.

Options:
  -o, --output <file>       Write summary JSON to <file> (if omitted and no --ndjson, prints to stdout)
  --ndjson <file>           Write full NDJSON data to <file>
  -r, --recursive           For directory paths, add /**/*.js automatically
  -t, --types <types...>    Types to include: class, function, variable, parameter (default: all)
  --include-locals          Include local declarations inside functions/blocks
  --exported-only           Only include exported entities
  --exclude <pattern>       Exclude files/directories matching glob (can be repeated)
  -h, --help                Show this help
`;

async function main() {
    const argv = minimist(process.argv.slice(2), {
        string: ['output', 'ndjson', 'exclude', 'types'],
        boolean: ['recursive', 'includeLocals', 'exportedOnly', 'help'],
        alias: {
            o: 'output',
            r: 'recursive',
            t: 'types',
            h: 'help',
            'include-locals': 'includeLocals',
            'exported-only': 'exportedOnly',
        },
        default: {
            types: ['class', 'function', 'variable', 'parameter', 'method', 'property'],
            exclude: [],
        },
    });

    if (argv.help || argv._.length === 0) {
        console.log(helpText);
        process.exit(0);
    }

    // Normalize types to array
    const types = Array.isArray(argv.types) ? argv.types : [argv.types];
    const exclude = Array.isArray(argv.exclude) ? argv.exclude : [argv.exclude];

    // Prepare extraction options
    const typeSet = new Set(types);
    /** @type {import('./types.js').ExtractionOptions} */
    const extractionOptions = {
        types: typeSet,
        includeLocals: argv.includeLocals,
        exportedOnly: argv.exportedOnly,
    };

    // Collect files
    const files = await collectFiles(argv._, argv.recursive, exclude);
    if (files.length === 0) {
        console.error('No JavaScript files found.');
        process.exit(0);
    }

    // Process each file
    /** @type {import('./types.js').Entity[]} */
    const allEntities = [];
    let hasErrors = false;

    for (const file of files) {
        try {
            const code = await fs.readFile(file, 'utf8');
            const entities = extractEntities(file, code, extractionOptions);
            allEntities.push(...entities);
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
            hasErrors = true;
        }
    }

    // Apply exportedOnly filter if needed
    let filteredEntities = allEntities;
    if (argv.exportedOnly) {
        filteredEntities = allEntities.filter(e => e.exported);
    }

    // Write NDJSON if requested
    if (argv.ndjson) {
        await writeNdjson(filteredEntities, argv.ndjson);
    }

    // Generate summary (unique names per type)
    /** @type {import('./types.js').Summary} */
    const summary = {
        classes: [...new Set(filteredEntities.filter(e => e.type === 'class').map(e => e.name))],
        functions: [
            ...new Set(filteredEntities.filter(e => e.type === 'function').map(e => e.name)),
        ],
        variables: [
            ...new Set(filteredEntities.filter(e => e.type === 'variable').map(e => e.name)),
        ],
        parameters: [
            ...new Set(filteredEntities.filter(e => e.type === 'parameter').map(e => e.name)),
        ],
        methods: [...new Set(filteredEntities.filter(e => e.type === 'method').map(e => e.name))],
        properties: [
            ...new Set(filteredEntities.filter(e => e.type === 'property').map(e => e.name)),
        ],
    };

    // Write summary to file or stdout
    if (argv.output) {
        await writeSummary(summary, argv.output);
    } else if (!argv.ndjson) {
        // If no output file and no ndjson, print summary to stdout
        await writeSummary(summary, null);
    }

    process.exit(hasErrors ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
