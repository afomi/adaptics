/**
 * Physics Concepts
 *
 * Each concept has:
 * - id: unique identifier
 * - name: human-readable name
 * - notes: description/explanation
 * - formula: { display: string for UI, fn: executable function }
 * - params: input parameters with defaults and units
 * - returns: output description with unit
 */

export const concepts = {
  kinetic_energy: {
    id: "kinetic_energy",
    name: "Kinetic Energy",
    notes: "Energy of motion. Depends on mass and the square of velocity.",
    formula: {
      display: "KE = ½mv²",
      fn: (p) => 0.5 * p.m * p.v * p.v
    },
    params: [
      { name: "m", label: "mass", unit: "kg", default: 1 },
      { name: "v", label: "velocity", unit: "m/s", default: 1 }
    ],
    returns: { label: "kinetic energy", unit: "J" }
  },

  potential_energy: {
    id: "potential_energy",
    name: "Potential Energy",
    notes: "Stored energy due to position in a gravitational field.",
    formula: {
      display: "PE = mgh",
      fn: (p) => p.m * p.g * p.h
    },
    params: [
      { name: "m", label: "mass", unit: "kg", default: 1 },
      { name: "g", label: "gravitational acceleration", unit: "m/s²", default: 9.81 },
      { name: "h", label: "height", unit: "m", default: 1 }
    ],
    returns: { label: "potential energy", unit: "J" }
  },

  work: {
    id: "work",
    name: "Work",
    notes: "Energy transferred by a force acting over a distance.",
    formula: {
      display: "W = Fd cos(θ)",
      fn: (p) => p.F * p.d * Math.cos(p.theta)
    },
    params: [
      { name: "F", label: "force", unit: "N", default: 1 },
      { name: "d", label: "distance", unit: "m", default: 1 },
      { name: "theta", label: "angle", unit: "rad", default: 0 }
    ],
    returns: { label: "work", unit: "J" }
  },

  power: {
    id: "power",
    name: "Power",
    notes: "Rate of energy transfer or work done per unit time.",
    formula: {
      display: "P = W/t",
      fn: (p) => p.W / p.t
    },
    params: [
      { name: "W", label: "work", unit: "J", default: 1 },
      { name: "t", label: "time", unit: "s", default: 1 }
    ],
    returns: { label: "power", unit: "W" }
  },

  momentum: {
    id: "momentum",
    name: "Momentum",
    notes: "Product of mass and velocity. Conserved in closed systems.",
    formula: {
      display: "p = mv",
      fn: (p) => p.m * p.v
    },
    params: [
      { name: "m", label: "mass", unit: "kg", default: 1 },
      { name: "v", label: "velocity", unit: "m/s", default: 1 }
    ],
    returns: { label: "momentum", unit: "kg·m/s" }
  },

  force: {
    id: "force",
    name: "Force",
    notes: "Newton's second law. Force equals mass times acceleration.",
    formula: {
      display: "F = ma",
      fn: (p) => p.m * p.a
    },
    params: [
      { name: "m", label: "mass", unit: "kg", default: 1 },
      { name: "a", label: "acceleration", unit: "m/s²", default: 1 }
    ],
    returns: { label: "force", unit: "N" }
  },

  radians: {
    id: "radians",
    name: "Radians",
    notes: "Angular measure where the arc length equals the radius. Full circle = 2π rad. Conversion: θ(rad) = θ(deg) × π/180.",
    formula: {
      display: "θ = s/r",
      fn: (p) => p.s / p.r
    },
    params: [
      { name: "s", label: "arc length", unit: "m", default: 1 },
      { name: "r", label: "radius", unit: "m", default: 1 }
    ],
    returns: { label: "angle", unit: "rad" }
  },

  electricity: {
    id: "electricity",
    name: "Electricity (Ohm's Law)",
    notes: "Flow of electric charge. Voltage equals current times resistance. Current is charge per unit time.",
    formula: {
      display: "V = IR",
      fn: (p) => p.I * p.R
    },
    params: [
      { name: "I", label: "current", unit: "A", default: 1 },
      { name: "R", label: "resistance", unit: "Ω", default: 1 }
    ],
    returns: { label: "voltage", unit: "V" }
  },

  magnetism: {
    id: "magnetism",
    name: "Magnetism (Lorentz Force)",
    notes: "Force on a moving charge in a magnetic field. Perpendicular to both velocity and field direction.",
    formula: {
      display: "F = qvB sin(θ)",
      fn: (p) => p.q * p.v * p.B * Math.sin(p.theta)
    },
    params: [
      { name: "q", label: "charge", unit: "C", default: 1 },
      { name: "v", label: "velocity", unit: "m/s", default: 1 },
      { name: "B", label: "magnetic field", unit: "T", default: 1 },
      { name: "theta", label: "angle", unit: "rad", default: Math.PI / 2 }
    ],
    returns: { label: "magnetic force", unit: "N" }
  },

  time: {
    id: "time",
    name: "Time",
    notes: "Fundamental dimension of change and duration. In relativity, time dilates with velocity: t' = t/γ where γ = 1/√(1-v²/c²).",
    formula: {
      display: "Δt = t₂ - t₁",
      fn: (p) => p.t2 - p.t1
    },
    params: [
      { name: "t1", label: "start time", unit: "s", default: 0 },
      { name: "t2", label: "end time", unit: "s", default: 1 }
    ],
    returns: { label: "duration", unit: "s" }
  },

  space: {
    id: "space",
    name: "Space",
    notes: "Three-dimensional extent. Distance in Euclidean space. In relativity, length contracts with velocity.",
    formula: {
      display: "d = √(Δx² + Δy² + Δz²)",
      fn: (p) => Math.sqrt(p.dx * p.dx + p.dy * p.dy + p.dz * p.dz)
    },
    params: [
      { name: "dx", label: "x displacement", unit: "m", default: 1 },
      { name: "dy", label: "y displacement", unit: "m", default: 0 },
      { name: "dz", label: "z displacement", unit: "m", default: 0 }
    ],
    returns: { label: "distance", unit: "m" }
  },

  counterspace: {
    id: "counterspace",
    name: "Counterspace",
    notes: "Projective dual of space. Where space radiates outward from points, counterspace converges inward toward planes. Associated with negative/etheric geometry in Rudolf Steiner's work.",
    formula: {
      display: "1/r (polar reciprocal)",
      fn: (p) => 1 / p.r
    },
    params: [
      { name: "r", label: "radius", unit: "m", default: 1 }
    ],
    returns: { label: "counterspace measure", unit: "1/m" }
  },

  watts: {
    id: "watts",
    name: "Watts (Electrical Power)",
    notes: "Rate of electrical energy transfer. P = IV = I²R = V²/R. One watt = one joule per second.",
    formula: {
      display: "P = IV",
      fn: (p) => p.I * p.V
    },
    params: [
      { name: "I", label: "current", unit: "A", default: 1 },
      { name: "V", label: "voltage", unit: "V", default: 1 }
    ],
    returns: { label: "power", unit: "W" }
  },

  planck: {
    id: "planck",
    name: "Planck Constant",
    notes: "Fundamental quantum of action. E = hf relates energy to frequency. h ≈ 6.626 × 10⁻³⁴ J·s. Defines the scale at which quantum effects dominate.",
    formula: {
      display: "E = hf",
      fn: (p) => p.h * p.f
    },
    params: [
      { name: "h", label: "Planck constant", unit: "J·s", default: 6.62607015e-34 },
      { name: "f", label: "frequency", unit: "Hz", default: 1 }
    ],
    returns: { label: "energy", unit: "J" }
  },

  phi: {
    id: "phi",
    name: "Phi (Golden Ratio)",
    notes: "φ = (1 + √5)/2 ≈ 1.618. Self-similar ratio where a/b = (a+b)/a. Appears in nature, art, and mathematics. φ² = φ + 1.",
    formula: {
      display: "φ = (1 + √5)/2",
      fn: (p) => (p.a + p.b) / p.a
    },
    params: [
      { name: "a", label: "larger segment", unit: "", default: 1.618033988749895 },
      { name: "b", label: "smaller segment", unit: "", default: 1 }
    ],
    returns: { label: "ratio", unit: "" }
  },

  volt: {
    id: "volt",
    name: "Volt (Electric Potential)",
    notes: "Electric potential difference. One volt = one joule per coulomb. Represents the 'pressure' pushing charge through a circuit.",
    formula: {
      display: "V = W/Q",
      fn: (p) => p.W / p.Q
    },
    params: [
      { name: "W", label: "work/energy", unit: "J", default: 1 },
      { name: "Q", label: "charge", unit: "C", default: 1 }
    ],
    returns: { label: "voltage", unit: "V" }
  },

  amp: {
    id: "amp",
    name: "Ampere (Electric Current)",
    notes: "Flow rate of electric charge. One ampere = one coulomb per second. Measures the quantity of electrons passing a point.",
    formula: {
      display: "I = Q/t",
      fn: (p) => p.Q / p.t
    },
    params: [
      { name: "Q", label: "charge", unit: "C", default: 1 },
      { name: "t", label: "time", unit: "s", default: 1 }
    ],
    returns: { label: "current", unit: "A" }
  },

  ohm: {
    id: "ohm",
    name: "Ohm (Resistance)",
    notes: "Opposition to current flow. One ohm = one volt per ampere. Resistance dissipates energy as heat.",
    formula: {
      display: "R = V/I",
      fn: (p) => p.V / p.I
    },
    params: [
      { name: "V", label: "voltage", unit: "V", default: 1 },
      { name: "I", label: "current", unit: "A", default: 1 }
    ],
    returns: { label: "resistance", unit: "Ω" }
  },

  dielectricity: {
    id: "dielectricity",
    name: "Dielectricity",
    notes: "Radial electrostatic field stored in insulating material. Counterspatial to magnetism. Capacitance stores dielectric energy. Related to Tesla and Steinmetz's work on electrical phenomena.",
    formula: {
      display: "C = εA/d",
      fn: (p) => p.epsilon * p.A / p.d
    },
    params: [
      { name: "epsilon", label: "permittivity", unit: "F/m", default: 8.854187817e-12 },
      { name: "A", label: "plate area", unit: "m²", default: 1 },
      { name: "d", label: "separation", unit: "m", default: 0.001 }
    ],
    returns: { label: "capacitance", unit: "F" }
  },

  q: {
    id: "q",
    name: "Q (Electric Charge)",
    notes: "Fundamental property of matter. Quantized in units of electron charge e ≈ 1.602 × 10⁻¹⁹ C. Like charges repel, opposite charges attract.",
    formula: {
      display: "Q = It",
      fn: (p) => p.I * p.t
    },
    params: [
      { name: "I", label: "current", unit: "A", default: 1 },
      { name: "t", label: "time", unit: "s", default: 1 }
    ],
    returns: { label: "charge", unit: "C" }
  },

  psi: {
    id: "psi",
    name: "Ψ (Dielectric Flux)",
    notes: "Total dielectric field lines emanating from a charge. Ψ = Q in Steinmetz notation. Represents the counterspatial pressure field extending radially from charge.",
    formula: {
      display: "Ψ = εE·A",
      fn: (p) => p.epsilon * p.E * p.A
    },
    params: [
      { name: "epsilon", label: "permittivity", unit: "F/m", default: 8.854187817e-12 },
      { name: "E", label: "electric field", unit: "V/m", default: 1 },
      { name: "A", label: "area", unit: "m²", default: 1 }
    ],
    returns: { label: "dielectric flux", unit: "C" }
  },

  siemens: {
    id: "siemens",
    name: "Siemens (Conductance)",
    notes: "Reciprocal of resistance. Measures ease of current flow. One siemens = one ampere per volt. Named after Werner von Siemens.",
    formula: {
      display: "G = 1/R = I/V",
      fn: (p) => p.I / p.V
    },
    params: [
      { name: "I", label: "current", unit: "A", default: 1 },
      { name: "V", label: "voltage", unit: "V", default: 1 }
    ],
    returns: { label: "conductance", unit: "S" }
  },

  coulomb: {
    id: "coulomb",
    name: "Coulomb (Charge Unit)",
    notes: "SI unit of electric charge. One coulomb = charge of ~6.242 × 10¹⁸ electrons. Coulomb's law: F = kQ₁Q₂/r².",
    formula: {
      display: "F = kQ₁Q₂/r²",
      fn: (p) => p.k * p.Q1 * p.Q2 / (p.r * p.r)
    },
    params: [
      { name: "k", label: "Coulomb constant", unit: "N·m²/C²", default: 8.9875517923e9 },
      { name: "Q1", label: "charge 1", unit: "C", default: 1 },
      { name: "Q2", label: "charge 2", unit: "C", default: 1 },
      { name: "r", label: "distance", unit: "m", default: 1 }
    ],
    returns: { label: "force", unit: "N" }
  },

  weber: {
    id: "weber",
    name: "Weber (Magnetic Flux)",
    notes: "SI unit of magnetic flux. One weber = one volt-second. Φ = B·A. Faraday's law: EMF = -dΦ/dt. Named after Wilhelm Weber.",
    formula: {
      display: "Φ = B·A",
      fn: (p) => p.B * p.A * Math.cos(p.theta)
    },
    params: [
      { name: "B", label: "magnetic field", unit: "T", default: 1 },
      { name: "A", label: "area", unit: "m²", default: 1 },
      { name: "theta", label: "angle", unit: "rad", default: 0 }
    ],
    returns: { label: "magnetic flux", unit: "Wb" }
  },

  joule: {
    id: "joule",
    name: "Joule (Energy Unit)",
    notes: "SI unit of energy. One joule = one newton-meter = one watt-second = one kg·m²/s². Equivalent forms: J = N·m = W·s = C·V = kg·m²/s².",
    formula: {
      display: "E = F·d",
      fn: (p) => p.F * p.d
    },
    params: [
      { name: "F", label: "force", unit: "N", default: 1 },
      { name: "d", label: "distance", unit: "m", default: 1 }
    ],
    returns: { label: "energy", unit: "J" }
  }
};

/**
 * Get a concept by ID
 */
export function getConcept(id) {
  return concepts[id] || null;
}

/**
 * List all concept IDs
 */
export function listConceptIds() {
  return Object.keys(concepts);
}

/**
 * Evaluate a concept's formula with given parameters
 */
export function evaluate(id, params) {
  const concept = getConcept(id);
  if (!concept) return null;

  // Merge provided params with defaults
  const fullParams = {};
  for (const p of concept.params) {
    fullParams[p.name] = params[p.name] ?? p.default;
  }

  return concept.formula.fn(fullParams);
}

/**
 * Export concepts as JSON-serializable object (without functions)
 */
export function toJSON() {
  const result = {};
  for (const [id, concept] of Object.entries(concepts)) {
    result[id] = {
      ...concept,
      formula: {
        display: concept.formula.display
      }
    };
  }
  return result;
}
