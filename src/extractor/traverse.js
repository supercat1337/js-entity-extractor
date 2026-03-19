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

    // For debugging, you can uncomment the following line:
    // console.log(`Traversing node type: ${node.type}`);

    switch (node.type) {
        // Exports
        case 'ExportNamedDeclaration':
        case 'ExportDefaultDeclaration':
            handleExport(node, ctx, options, collector, traverse);
            break;

        // Classes and their parts
        case 'ClassDeclaration':
        case 'ClassExpression': // added handling for class expressions
        case 'MethodDefinition':
        case 'PropertyDefinition':
            handleClass(node, ctx, options, collector, traverse);
            break;

        // Functions
        case 'FunctionDeclaration':
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
            handleFunction(node, ctx, options, collector, traverse);
            break;

        // Variables
        case 'VariableDeclaration':
            handleVariable(node, ctx, options, collector, traverse);
            break;

        // Blocks
        case 'BlockStatement':
            handleBlock(node, ctx, options, collector, traverse);
            break;

        // Object and pattern properties
        case 'Property':
            handleProperty(node, ctx, options, collector, traverse);
            break;

        // For NewExpression and CallExpression, traverse arguments (may contain objects)
        case 'NewExpression':
        case 'CallExpression':
            if (node.callee) traverse(node.callee, ctx, options, collector);
            if (Array.isArray(node.arguments)) {
                for (const arg of node.arguments) {
                    traverse(arg, ctx, options, collector);
                }
            }
            break;

        // Traverse remaining nodes recursively through all enumerable properties
        default:
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
