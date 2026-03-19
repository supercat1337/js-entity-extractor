// @ts-check

/**
 * @typedef {Object} TraverseContext
 * @property {string} file - current file path
 * @property {boolean} inExport - whether we are inside an export declaration
 * @property {string|null} currentFunction - name of the current function (for parameters)
 * @property {number} depth - nesting depth (0 = global scope)
 * @property {Set<string>} exportedNamesSet - names exported via specifiers
 */

/**
 * Creates a new context with updated properties.
 * @param {TraverseContext} ctx - original context
 * @param {Partial<TraverseContext>} updates - fields to update
 * @returns {TraverseContext} new context
 */
export function updateContext(ctx, updates) {
    return { ...ctx, ...updates };
}

/**
 * Creates a context for a child block (depth + 1).
 * @param {TraverseContext} ctx
 * @returns {TraverseContext}
 */
export function enterBlock(ctx) {
    return { ...ctx, depth: ctx.depth + 1 };
}

/**
 * Creates a context for a function body.
 * @param {TraverseContext} ctx
 * @param {string|null} functionName
 * @returns {TraverseContext}
 */
export function enterFunction(ctx, functionName) {
    return {
        ...ctx,
        depth: ctx.depth + 1,
        currentFunction: functionName,
    };
}
