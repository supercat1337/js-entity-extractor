#!/usr/bin/env node

// @ts-check
import minimist from 'minimist';
import { collectFiles } from './fileCollector.js';
import { extractEntities } from './extractor/index.js';
import { writeNdjson, writeSummary, writeDictionary, writeDictionaryMap } from './outputWriter.js';
import fs from 'node:fs/promises';
import { browserGlobalNames } from './globalNames.js';

const helpText = `
Usage: js-entity-extractor [patterns...] [options]

Extract user-defined classes, functions, variables, parameters, methods, and properties from JavaScript files.

Options:
  -o, --output <file>       Write summary JSON to <file> (if omitted and no --ndjson, prints to stdout)
  --ndjson <file>           Write full NDJSON data to <file>
  --dictionary <file>       Write a flat text file with all unique entity names (one per line)
  --dictionary-valid-only   When used with --dictionary, only include names that are valid JavaScript identifiers (filters out symbols like *, +, etc.)
  --dictionary-map <file>   Write a JSON map file with all unique entity names as keys and values
  -r, --recursive           For directory paths, add /**/*.js automatically
  -t, --types <types...>    Types to include: class, function, variable, parameter, method, property (default: all)
  --include-locals          Include local declarations inside functions/blocks (default: true)
  --globals-only            Only include global declarations (equivalent to --no-include-locals)
  --exported-only           Only include exported entities
  --exclude <pattern>       Exclude files/directories matching glob (can be repeated)
  -h, --help                Show this help
`;

async function main() {
    const argv = minimist(process.argv.slice(2), {
        string: ['output', 'ndjson', 'dictionary', 'exclude', 'types', 'dictionaryMap'],
        boolean: ['recursive', 'includeLocals', 'exportedOnly', 'dictionaryValidOnly', 'help'],
        alias: {
            o: 'output',
            r: 'recursive',
            t: 'types',
            h: 'help',
            d: 'dictionary',
            x: 'dictionaryMap',
            'dictionary-map': 'dictionaryMap',
            'include-locals': 'includeLocals',
            'exported-only': 'exportedOnly',
            'dictionary-valid-only': 'dictionaryValidOnly',
            'globals-only': 'globalsOnly',
        },
        default: {
            types: ['class', 'function', 'variable', 'parameter', 'method', 'property'],
            exclude: [],
            includeLocals: true,
            globalsOnly: false,
        },
    });

    if (argv.help || argv._.length === 0) {
        console.log(helpText);
        process.exit(0);
    }

    // Normalize arrays
    const types = Array.isArray(argv.types) ? argv.types : [argv.types];
    const exclude = Array.isArray(argv.exclude) ? argv.exclude : [argv.exclude];

    const includeLocals = argv.globalsOnly ? false : argv.includeLocals;

    const typeSet = new Set(types);
    /** @type {import('./types.js').ExtractionOptions} */
    const extractionOptions = {
        types: typeSet,
        includeLocals: includeLocals,
        exportedOnly: argv.exportedOnly,
    };

    // Collect files
    const files = await collectFiles(argv._, argv.recursive, exclude);
    if (files.length === 0) {
        console.error('No JavaScript files found.');
        process.exit(0);
    }

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
    } else if (!argv.ndjson && !argv.dictionary && !argv.dictionaryMap) {
        // If no output file, no ndjson, and no dictionary, and no dictionary map print summary to stdout
        await writeSummary(summary, null);
    }

    // Write dictionary if requested
    if (argv.dictionary || argv.dictionaryMap) {
        // Collect all unique names from summary (flatten all arrays)
        const allNames = new Set([
            ...summary.classes,
            ...summary.functions,
            ...summary.variables,
            ...summary.parameters,
            ...summary.methods,
            ...summary.properties,
        ]);

        let namesList = [...allNames];
        if (argv.dictionaryValidOnly) {
            const isValidIdentifier = name => /^#?[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
            namesList = namesList.filter(
                name => isValidIdentifier(name) && !browserGlobalNames.has(name)
            );
        }

        if (argv.dictionary) {
            await writeDictionary(namesList, argv.dictionary);
        }

        if (argv.dictionaryMap) {
            await writeDictionaryMap(namesList, argv.dictionaryMap);
        }
    }

    process.exit(hasErrors ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
