// @ts-check

import {
    handleExport,
    handleClass,
    handleFunction,
    handleVariable,
    handleBlock,
    handleProperty,
} from './handlers.js';

/**
 * @typedef {import('./context.js').TraverseContext} TraverseContext
 * @typedef {import('../types.js').ExtractionOptions} ExtractionOptions
 * @typedef {import('./entityCollector.js').EntityCollector} EntityCollector
 */

/**
 * Recursively traverses AST and collects entities.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 */
export function traverse(node, ctx, options, collector) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration':
            handleExport(node, ctx, options, collector, traverse);
            break;

        case 'ClassDeclaration':
        case 'MethodDefinition':
            handleClass(node, ctx, options, collector, traverse);
            break;

        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
            handleFunction(node, ctx, options, collector, traverse);
            break;

        case 'VariableDeclaration':
            handleVariable(node, ctx, options, collector, traverse);
            break;

        case 'BlockStatement':
            handleBlock(node, ctx, options, collector, traverse);
            break;

        case 'Property':
            handleProperty(node, ctx, options, collector, traverse);
            break;
        case 'PropertyDefinition':
            handleClass(node, ctx, options, collector, traverse); // так как handleClass теперь обрабатывает и PropertyDefinition
            break;

        default:
            // Default traversal for any other node: go through all enumerable properties
            for (const key in node) {
                if (Object.prototype.hasOwnProperty.call(node, key)) {
                    const child = node[key];
                    if (Array.isArray(child)) {
                        for (const item of child) {
                            traverse(item, ctx, options, collector);
                        }
                    } else {
                        traverse(child, ctx, options, collector);
                    }
                }
            }
    }
}
