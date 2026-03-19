// @ts-check

/**
 * Extracts static name from a key node (Identifier, PrivateIdentifier, or string Literal).
 * Returns null for computed or other dynamic keys.
 *
 * @param {any} keyNode - AST node representing a property key
 * @returns {string|null}
 */
export function getStaticName(keyNode) {
    if (!keyNode) return null;
    if (keyNode.type === 'Identifier') {
        return keyNode.name;
    }

    if (keyNode.type === 'PrivateIdentifier') {
        // Private fields include the '#' prefix to distinguish them
        return '#' + keyNode.name;
    }

    if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') {
        return keyNode.value;
    }
    return null; // computed or other
}

/**
 * Recursively walks a pattern (Identifier, ObjectPattern, ArrayPattern, RestElement, AssignmentPattern)
 * and calls the callback for each found identifier.
 *
 * @param {any} node - AST node (pattern)
 * @param {function(string, any): void} callback - receives name and location object
 */
export function forEachNameInPattern(node, callback) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
        case 'Identifier':
            callback(node.name, node.loc);
            break;
        case 'ObjectPattern':
            if (Array.isArray(node.properties)) {
                for (const prop of node.properties) {
                    // prop.value is the pattern (could be Identifier, AssignmentPattern, etc.)
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
            // For AssignmentPattern, the left part is the pattern, right is the default value (not a name)
            forEachNameInPattern(node.left, callback);
            break;
        default:
        // ignore other types
    }
}
