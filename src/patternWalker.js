// @ts-check

/**
 * Recursively walks a pattern (Identifier, ObjectPattern, ArrayPattern, RestElement, AssignmentPattern)
 * and calls the callback for each found identifier.
 *
 * @param {Object} node - AST node (pattern)
 * @param {function(string, Object): void} callback - Receives name and location object
 */
export function forEachNameInPattern(node, callback) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
        case 'Identifier':
        case 'Property':
            callback(node.name, node.loc);
            break;
        case 'ObjectPattern':
            if (Array.isArray(node.properties)) {
                for (const prop of node.properties) {
                    // prop.value is the pattern (may be identifier or nested pattern)
                    forEachNameInPattern(prop.value, callback);
                }
            }
            break;
        case 'ArrayPattern':
            if (Array.isArray(node.elements)) {
                for (const elem of node.elements) {
                    forEachNameInPattern(elem, callback);
                }
            }
            break;
        case 'RestElement':
            forEachNameInPattern(node.argument, callback);
            break;
        case 'AssignmentPattern':
            // e.g., { a = 1 } => left is the pattern, right is default
            forEachNameInPattern(node.left, callback);
            break;
        default:
        // ignore other types
    }
}
