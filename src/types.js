// @ts-check

/**
 * @typedef {Object} Entity
 * @property {string} file
 * * @property {string} name
 * @property {'class'|'function'|'variable'|'parameter'|'method'|'property'} type
 * @property {number} line
 * @property {boolean} exported
 * @property {string|null} [functionName] // только для parameter
 */

/**
 * @typedef {Object} Summary
 * @property {string[]} classes
 * @property {string[]} functions
 * @property {string[]} variables
 * @property {string[]} parameters
 * @property {string[]} methods
 * @property {string[]} properties
 */

/**
 * @typedef {Object} ExtractionOptions
 * @property {Set<'class'|'function'|'variable'|'parameter'|'method'|'property'>} types
 * @property {boolean} includeLocals
 * @property {boolean} exportedOnly
 */

export default {};
