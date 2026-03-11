// @ts-check

import { enterBlock, enterFunction } from './context.js';
import { forEachNameInPattern, getStaticName } from './patternUtils.js';
/**
 * @typedef {import('./context.js').TraverseContext} TraverseContext
 * @typedef {import('../types.js').ExtractionOptions} ExtractionOptions
 * @typedef {import('./entityCollector.js').EntityCollector} EntityCollector
 */

/**
 * Process ExportNamedDeclaration and ExportDefaultDeclaration.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse - ссылка на функцию обхода
 */
export function handleExport(node, ctx, options, collector, traverse) {
    switch (node.type) {
        case 'ExportNamedDeclaration':
            if (node.declaration) {
                traverse(node.declaration, { ...ctx, inExport: true }, options, collector);
            }
            if (node.specifiers) {
                for (const spec of node.specifiers) {
                    if (spec.type === 'ExportSpecifier' && spec.local.type === 'Identifier') {
                        ctx.exportedNamesSet.add(spec.local.name);
                    }
                }
            }
            break;
        case 'ExportDefaultDeclaration':
            if (node.declaration) {
                traverse(node.declaration, { ...ctx, inExport: true }, options, collector);
            }
            break;
    }
}

/**
 * Process ClassDeclaration and MethodDefinition.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleClass(node, ctx, options, collector, traverse) {
    switch (node.type) {
        case 'ClassDeclaration':
            if (options.types.has('class') && node.id?.type === 'Identifier') {
                if (options.includeLocals || ctx.depth === 0) {
                    collector.add({
                        file: ctx.file,
                        name: node.id.name,
                        type: 'class',
                        line: node.loc.start.line,
                        exported: ctx.inExport,
                    });
                }
            }
            if (node.body) traverse(node.body, ctx, options, collector);
            break;

        case 'MethodDefinition':
            const methodName = getStaticName(node.key);
            if (!methodName) break; // skip computed

            // Determine if it's a getter/setter or regular method
            if (node.kind === 'get' || node.kind === 'set') {
                if (options.types.has('property') && (options.includeLocals || ctx.depth === 0)) {
                    collector.add({
                        file: ctx.file,
                        name: methodName,
                        type: 'property',
                        line: node.loc.start.line,
                        exported: ctx.inExport,
                    });
                }
            } else {
                // regular method (including constructor? constructor is kind='constructor'? In estree, constructor is MethodDefinition with kind='constructor'? Actually in ESTree, constructor is MethodDefinition with kind='constructor' and method=true. We should treat it as method (or maybe as constructor separately, but for now as method). Let's include it.
                if (options.types.has('method') && (options.includeLocals || ctx.depth === 0)) {
                    collector.add({
                        file: ctx.file,
                        name: methodName,
                        type: 'method',
                        line: node.loc.start.line,
                        exported: ctx.inExport,
                    });
                }
            }
            // Traverse the function value (parameters, body)
            if (node.value) traverse(node.value, ctx, options, collector);
            break;

        case 'PropertyDefinition':
            const propName = getStaticName(node.key);
            if (!propName) break; // skip computed
            if (options.types.has('property') && (options.includeLocals || ctx.depth === 0)) {
                collector.add({
                    file: ctx.file,
                    name: propName,
                    type: 'property',
                    line: node.loc.start.line,
                    exported: ctx.inExport,
                });
            }
            // traverse value (initializer) if any
            if (node.value) traverse(node.value, ctx, options, collector);
            break;
    }
}

/**
 * Process FunctionDeclaration, FunctionExpression, ArrowFunctionExpression.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleFunction(node, ctx, options, collector, traverse) {
    const functionName = node.id?.type === 'Identifier' ? node.id.name : null;

    // Add function entity if it's a declaration and we want functions
    if (node.type === 'FunctionDeclaration' && options.types.has('function') && functionName) {
        if (options.includeLocals || ctx.depth === 0) {
            collector.add({
                file: ctx.file,
                name: functionName,
                type: 'function',
                line: node.loc.start.line,
                exported: ctx.inExport,
            });
        }
    }

    // Process parameters (if parameter type requested and includeLocals)
    if (options.types.has('parameter') && options.includeLocals) {
        const paramCtx = { ...ctx, depth: ctx.depth + 1, currentFunction: functionName };
        for (const param of node.params) {
            forEachNameInPattern(param, (name, loc) => {
                collector.add({
                    file: ctx.file,
                    name,
                    type: 'parameter',
                    line: loc.start.line,
                    exported: false,
                    functionName: paramCtx.currentFunction,
                });
            });
        }
    }

    // Traverse function body with increased depth
    if (node.body) {
        traverse(node.body, enterFunction(ctx, functionName), options, collector);
    }
}

/**
 * Process VariableDeclaration.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleVariable(node, ctx, options, collector, traverse) {
    if (!options.types.has('variable')) return;
    for (const decl of node.declarations) {
        const shouldInclude = options.includeLocals || ctx.depth === 0;
        if (!shouldInclude) continue;

        forEachNameInPattern(decl.id, (name, loc) => {
            collector.add({
                file: ctx.file,
                name,
                type: 'variable',
                line: loc.start.line,
                exported: ctx.inExport,
            });
        });
    }
}

/**
 * Process BlockStatement (increase depth).
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleBlock(node, ctx, options, collector, traverse) {
    if (node.body) {
        const blockCtx = enterBlock(ctx);
        for (const stmt of node.body) {
            traverse(stmt, blockCtx, options, collector);
        }
    }
}

/**
 * Process Property (object method).
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleProperty(node, ctx, options, collector, traverse) {
    // Get property name if static
    const name = getStaticName(node.key);
    if (!name) {
        // For computed property, we still need to traverse its value (if any)
        if (node.value) traverse(node.value, ctx, options, collector);
        return;
    }

    // Determine if it's a method, getter/setter, or data property
    if (node.method) {
        // Method (e.g., { foo() {} })
        if (options.types.has('method') && (options.includeLocals || ctx.depth === 0)) {
            collector.add({
                file: ctx.file,
                name,
                type: 'method',
                line: node.loc.start.line,
                exported: ctx.inExport,
            });
        }
        // Traverse the function body (parameters, etc.)
        if (node.value) traverse(node.value, ctx, options, collector);
    } else if (node.kind === 'get' || node.kind === 'set') {
        // Getter/setter
        if (options.types.has('property') && (options.includeLocals || ctx.depth === 0)) {
            collector.add({
                file: ctx.file,
                name,
                type: 'property',
                line: node.loc.start.line,
                exported: ctx.inExport,
            });
        }
        // Traverse the function body (parameters, etc.) — getter/setter have a function value
        if (node.value) traverse(node.value, ctx, options, collector);
    } else {
        // Data property (including shorthand)
        if (options.types.has('property') && (options.includeLocals || ctx.depth === 0)) {
            collector.add({
                file: ctx.file,
                name,
                type: 'property',
                line: node.loc.start.line,
                exported: ctx.inExport,
            });
        }
        // Traverse the value (could be any expression)
        if (node.value) traverse(node.value, ctx, options, collector);
    }

    // Also traverse key if it's complex (though we already handled static name)
    // Not needed for computed, but if key is an expression, we traversed earlier via the default case? Actually we only traverse if we returned early. We'll rely on the default traversal in traverse.js to handle any remaining properties.
}
