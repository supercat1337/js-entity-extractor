// @ts-check
import fs from 'node:fs/promises';

/**
 * Writes entities in NDJSON format to a file.
 *
 * @param {import('./types.js').Entity[]} entities
 * @param {string} filePath
 */
export async function writeNdjson(entities, filePath) {
  const lines = entities.map(e => JSON.stringify(e)).join('\n');
  await fs.writeFile(filePath, lines + '\n', 'utf8');
}

/**
 * Writes summary JSON to a file or stdout.
 *
 * @param {import('./types.js').Summary} summary
 * @param {string|null} outputPath - If null, writes to stdout
 */
export async function writeSummary(summary, outputPath) {
  const json = JSON.stringify(summary, null, 2);
  if (outputPath) {
    await fs.writeFile(outputPath, json, 'utf8');
  } else {
    console.log(json);
  }
}

/**
 * Writes a flat list of names to a text file (one per line).
 *
 * @param {string[]} names
 * @param {string} filePath
 */
export async function writeDictionary(names, filePath) {
  const content = names.sort().join('\n') + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}