/**
 * Physics Registry
 *
 * Central registry for concepts and compositions.
 * Provides unified access and persistence utilities.
 */

import {
  concepts,
  getConcept,
  listConceptIds,
  evaluate,
  toJSON as conceptsToJSON
} from './concepts.js';

import {
  compositions,
  getComposition,
  listCompositionIds,
  getConceptsInComposition,
  findCompositionsWithConcept,
  toJSON as compositionsToJSON
} from './compositions.js';

/**
 * Registry object with all accessors
 */
export const registry = {
  // Concepts
  concepts,
  getConcept,
  listConceptIds,
  evaluate,

  // Compositions
  compositions,
  getComposition,
  listCompositionIds,
  getConceptsInComposition,
  findCompositionsWithConcept,

  /**
   * Get full data for a composition with resolved concepts
   */
  resolveComposition(compositionId) {
    const composition = getComposition(compositionId);
    if (!composition) return null;

    return {
      ...composition,
      resolvedConcepts: composition.concepts.map(id => getConcept(id)).filter(Boolean)
    };
  },

  /**
   * Evaluate all concepts in a composition with given params
   */
  evaluateComposition(compositionId, paramsByConceptId = {}) {
    const composition = getComposition(compositionId);
    if (!composition) return null;

    const results = {};
    for (const conceptId of composition.concepts) {
      const params = paramsByConceptId[conceptId] || {};
      results[conceptId] = evaluate(conceptId, params);
    }
    return results;
  },

  /**
   * Export all data as JSON (for persistence)
   */
  toJSON() {
    return {
      concepts: conceptsToJSON(),
      compositions: compositionsToJSON()
    };
  },

  /**
   * Download registry as JSON file
   */
  downloadJSON(filename = 'physics-registry.json') {
    const data = this.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get a summary of all registered items
   */
  summary() {
    return {
      conceptCount: listConceptIds().length,
      compositionCount: listCompositionIds().length,
      concepts: listConceptIds().map(id => {
        const c = getConcept(id);
        return { id, name: c.name, formula: c.formula.display };
      }),
      compositions: listCompositionIds().map(id => {
        const c = getComposition(id);
        return { id, name: c.name, conceptCount: c.concepts.length };
      })
    };
  }
};

// Re-export for convenience
export {
  concepts,
  compositions,
  getConcept,
  getComposition,
  evaluate
};

export default registry;
