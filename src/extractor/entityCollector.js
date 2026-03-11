// @ts-check

/** @typedef {import('../types.js').Entity} Entity */

export class EntityCollector {
    constructor() {
        /** @type {Entity[]} */
        this.entities = [];
    }

    /**
     * @param {Entity} entity
     */
    add(entity) {
        this.entities.push(entity);
    }

    /**
     * Returns all collected entities.
     * @returns {Entity[]}
     */
    getAll() {
        return this.entities;
    }

    /**
     * Marks entities as exported if their names are in the exportedNamesSet.
     * @param {Set<string>} exportedNamesSet
     */
    applyExports(exportedNamesSet) {
        for (const entity of this.entities) {
            if (exportedNamesSet.has(entity.name)) {
                entity.exported = true;
            }
        }
    }
}
