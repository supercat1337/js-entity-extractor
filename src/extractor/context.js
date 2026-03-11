// @ts-check

/**
 * @typedef {Object} TraverseContext
 * @property {string} file - текущий файл
 * @property {boolean} inExport - находимся ли внутри экспорта
 * @property {string|null} currentFunction - имя текущей функции (для параметров)
 * @property {number} depth - глубина вложенности (0 = глобальный уровень)
 * @property {Set<string>} exportedNamesSet - имена, экспортированные через specifiers
 */

/**
 * Creates a new context with updated properties.
 * @param {TraverseContext} ctx - исходный контекст
 * @param {Partial<TraverseContext>} updates - поля для обновления
 * @returns {TraverseContext} новый контекст
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
