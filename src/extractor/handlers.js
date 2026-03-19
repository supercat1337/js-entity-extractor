// @ts-check
import { forEachNameInPattern, getStaticName } from './patternUtils.js';
import { enterBlock, enterFunction } from './context.js';

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
 * @param {Function} traverse
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
 * Process ClassDeclaration, MethodDefinition, PropertyDefinition.
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleClass(node, ctx, options, collector, traverse) {
    switch (node.type) {
        case 'ClassDeclaration':
        case 'ClassExpression':
            // Add class if it has a name
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
            // Traverse class body
            if (node.body) traverse(node.body, ctx, options, collector);
            break;

        case 'MethodDefinition':
            // Methods (including constructor) — add as method or property (get/set)
            const methodName = getStaticName(node.key);
            if (methodName) {
                if (node.kind === 'constructor') {
                    // Constructor is not added as a separate method; typically it's not considered a class method.
                    // Can either ignore or add as method. Leave out for now.
                } else if (options.types.has('method') && node.kind === 'method') {
                    collector.add({
                        file: ctx.file,
                        name: methodName,
                        type: 'method',
                        line: node.loc.start.line,
                        exported: ctx.inExport,
                    });
                } else if (
                    options.types.has('property') &&
                    (node.kind === 'get' || node.kind === 'set')
                ) {
                    // Getters/setters are considered properties
                    collector.add({
                        file: ctx.file,
                        name: methodName,
                        type: 'property',
                        line: node.loc.start.line,
                        exported: ctx.inExport,
                    });
                }
            }
            // Traverse method body (function)
            if (node.value) traverse(node.value, ctx, options, collector);
            break;

        case 'PropertyDefinition':
            // Class fields (including private)
            const fieldName = getStaticName(node.key);
            if (fieldName && options.types.has('property')) {
                collector.add({
                    file: ctx.file,
                    name: fieldName,
                    type: 'property',
                    line: node.loc.start.line,
                    exported: ctx.inExport,
                });
            }
            // If there is an initializer, traverse it
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

    // Add function if it's a FunctionDeclaration and the 'function' type is requested
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

    // Process parameters if parameter type is requested and includeLocals is true
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

        // Traverse initializer if present (may contain functions, etc.)
        if (decl.init) traverse(decl.init, ctx, options, collector);
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
 * Process Property (object property or object pattern property).
 * @param {any} node
 * @param {TraverseContext} ctx
 * @param {ExtractionOptions} options
 * @param {EntityCollector} collector
 * @param {Function} traverse
 */
export function handleProperty(node, ctx, options, collector, traverse) {
    const name = getStaticName(node.key);
    if (!name) return;

    // For properties in object literals (method = true means method)
    if (options.types.has('method') && node.method) {
        collector.add({
            file: ctx.file,
            name,
            type: 'method',
            line: node.loc.start.line,
            exported: ctx.inExport,
        });
    } else if (options.types.has('property') && node.kind !== 'method') {
        // Regular property or getter/setter (kind = 'get'/'set')
        collector.add({
            file: ctx.file,
            name,
            type: 'property',
            line: node.loc.start.line,
            exported: ctx.inExport,
        });
    }

    // Traverse property value (may be a function, object, etc.)
    if (node.value) {
        traverse(node.value, ctx, options, collector);
    }
}
