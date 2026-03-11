// @ts-check

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
            forEachNameInPattern(node.left, callback);
            break;
        default:
        // ignore other types
    }
}

/**
 * Extracts static name from a property key node.
 * @param {any} keyNode - AST node representing a property key
 * @returns {string|null} - Static name or null if computed/dynamic
 */
export function getStaticName(keyNode) {
  if (!keyNode) return null;
  if (keyNode.type === 'Identifier') {
    return keyNode.name;
  }
  if (keyNode.type === 'Literal' && typeof keyNode.value === 'string') {
    return keyNode.value;
  }
  return null; // computed or other
}