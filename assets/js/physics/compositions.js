/**
 * Physics Compositions
 *
 * Compositions combine multiple concepts into related groups.
 * Each composition has:
 * - id: unique identifier
 * - name: human-readable name
 * - notes: description of the composition
 * - concepts: array of concept IDs included
 * - connections: relationships between concepts
 */

export const compositions = {
  energy_conservation: {
    id: "energy_conservation",
    name: "Energy Conservation",
    notes: "In a closed system, total mechanical energy is conserved. KE + PE = constant.",
    concepts: ["kinetic_energy", "potential_energy"],
    connections: [
      {
        from: "kinetic_energy",
        to: "potential_energy",
        relationship: "converts_to",
        notes: "As an object rises, KE converts to PE"
      },
      {
        from: "potential_energy",
        to: "kinetic_energy",
        relationship: "converts_to",
        notes: "As an object falls, PE converts to KE"
      }
    ]
  },

  work_energy_theorem: {
    id: "work_energy_theorem",
    name: "Work-Energy Theorem",
    notes: "Net work done on an object equals change in kinetic energy.",
    concepts: ["work", "kinetic_energy", "force"],
    connections: [
      {
        from: "force",
        to: "work",
        relationship: "produces",
        notes: "Force applied over distance produces work"
      },
      {
        from: "work",
        to: "kinetic_energy",
        relationship: "changes",
        notes: "Work changes kinetic energy"
      }
    ]
  },

  power_work_relation: {
    id: "power_work_relation",
    name: "Power-Work Relation",
    notes: "Power is the rate at which work is done.",
    concepts: ["power", "work"],
    connections: [
      {
        from: "work",
        to: "power",
        relationship: "rate_of",
        notes: "Power is work per unit time"
      }
    ]
  },

  impulse_momentum: {
    id: "impulse_momentum",
    name: "Impulse-Momentum",
    notes: "Impulse equals change in momentum. Force × time = Δp",
    concepts: ["force", "momentum"],
    connections: [
      {
        from: "force",
        to: "momentum",
        relationship: "changes",
        notes: "Force applied over time changes momentum"
      }
    ]
  },

  newtons_laws: {
    id: "newtons_laws",
    name: "Newton's Laws of Motion",
    notes: "Fundamental relationships between force, mass, and motion.",
    concepts: ["force", "momentum", "kinetic_energy"],
    connections: [
      {
        from: "force",
        to: "momentum",
        relationship: "rate_of_change",
        notes: "F = dp/dt (force is rate of change of momentum)"
      }
    ]
  }
};

/**
 * Get a composition by ID
 */
export function getComposition(id) {
  return compositions[id] || null;
}

/**
 * List all composition IDs
 */
export function listCompositionIds() {
  return Object.keys(compositions);
}

/**
 * Get all concepts used in a composition
 */
export function getConceptsInComposition(id) {
  const composition = getComposition(id);
  return composition ? composition.concepts : [];
}

/**
 * Find compositions that include a specific concept
 */
export function findCompositionsWithConcept(conceptId) {
  return Object.values(compositions).filter(
    comp => comp.concepts.includes(conceptId)
  );
}

/**
 * Export compositions as JSON
 */
export function toJSON() {
  return { ...compositions };
}
