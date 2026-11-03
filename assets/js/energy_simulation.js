import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Energy Exchange Simulation
 *
 * Models agents with varying stores and flows of energy based on
 * "Part II: Population, Savings, and Energy Budgets" from
 * NATURAL_ENERGY_PRINCIPLES_FOR_ECONOMICS.md
 *
 * Key principles modeled:
 * - Available Energy = Captured Energy - Maintenance Costs - Reproduction Costs
 * - Savings as stored potential energy
 * - Energy flows between agents (transactions)
 * - Population dynamics based on energy availability
 */

class Agent {
  constructor(id, x, z, initialEnergy) {
    this.id = id;
    this.energy = initialEnergy;
    this.maxEnergy = 200;
    this.maintenanceCost = 0.5; // Energy consumed per tick just to exist
    this.captureRate = 0.3; // Base rate of energy capture from environment
    this.position = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      0,
      (Math.random() - 0.5) * 0.5
    );
    this.alive = true;
    this.age = 0;
    this.connections = []; // Other agents this one exchanges with
  }

  // Energy budget calculation per tick
  tick(environmentEnergy, allAgents) {
    if (!this.alive) return;

    this.age++;

    // Capture energy from environment (diminishing returns with more agents)
    const capturedEnergy = this.captureRate * environmentEnergy / allAgents.length;

    // Pay maintenance costs (entropy)
    const maintenance = this.maintenanceCost;

    // Net energy change
    this.energy += capturedEnergy - maintenance;

    // Clamp energy
    this.energy = Math.max(0, Math.min(this.maxEnergy, this.energy));

    // Death from energy depletion
    if (this.energy <= 0) {
      this.alive = false;
    }

    // Movement toward energy-rich areas or other agents
    this.move(allAgents);
  }

  move(allAgents) {
    // Simple flocking/seeking behavior
    const bounds = 50;

    // Add some random wandering
    this.velocity.x += (Math.random() - 0.5) * 0.1;
    this.velocity.z += (Math.random() - 0.5) * 0.1;

    // Limit velocity
    const speed = this.velocity.length();
    if (speed > 1) {
      this.velocity.multiplyScalar(1 / speed);
    }

    // Move
    this.position.add(this.velocity);

    // Bounce off boundaries
    if (Math.abs(this.position.x) > bounds) {
      this.velocity.x *= -1;
      this.position.x = Math.sign(this.position.x) * bounds;
    }
    if (Math.abs(this.position.z) > bounds) {
      this.velocity.z *= -1;
      this.position.z = Math.sign(this.position.z) * bounds;
    }
  }

  // Exchange energy with another agent (transaction)
  exchangeWith(other, amount) {
    if (!this.alive || !other.alive) return 0;

    const actualAmount = Math.min(amount, this.energy);
    this.energy -= actualAmount;
    other.energy += actualAmount;
    return actualAmount;
  }

  // Reproduce if enough energy (biological growth)
  canReproduce() {
    return this.alive && this.energy > 150;
  }

  reproduce() {
    if (!this.canReproduce()) return null;

    const reproductionCost = 75;
    this.energy -= reproductionCost;

    // Offspring starts near parent with inherited energy
    return new Agent(
      Date.now() + Math.random(),
      this.position.x + (Math.random() - 0.5) * 10,
      this.position.z + (Math.random() - 0.5) * 10,
      reproductionCost * 0.8 // Some energy lost in transfer
    );
  }
}

export function renderEnergySimulation(selector) {
  let camera, scene, renderer, controls;
  let agents = [];
  let agentMeshes = new Map();
  let connectionLines = [];
  let environmentEnergy = 100;
  let lastSimTime = 0;
  const simInterval = 100; // ms between simulation steps
  let stats = {
    population: 0,
    totalEnergy: 0,
    averageEnergy: 0,
    transactions: 0,
    births: 0,
    deaths: 0
  };

  const container = document.querySelector(selector);
  if (!container) {
    console.error('Container not found:', selector);
    return;
  }

  init();
  animate();

  function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 80, 80);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Ground plane (the environment/energy field)
    const groundGeometry = new THREE.PlaneGeometry(120, 120, 20, 20);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x16213e,
      wireframe: false,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -1;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 20, 0x0f3460, 0x0f3460);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 100, 50);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xe94560, 1, 100);
    pointLight.position.set(0, 30, 0);
    scene.add(pointLight);

    // Initialize agents
    initializeAgents(15);

    // UI
    createUI();

    // Handle resize
    window.addEventListener('resize', onWindowResize);
  }

  function initializeAgents(count) {
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      const energy = 50 + Math.random() * 100;
      const agent = new Agent(i, x, z, energy);
      agents.push(agent);
      createAgentMesh(agent);
    }
  }

  function createAgentMesh(agent) {
    // Sphere size based on energy (savings = stored potential)
    const radius = 1 + (agent.energy / agent.maxEnergy) * 2;
    const geometry = new THREE.SphereGeometry(radius, 16, 16);

    // Color based on energy level (health/viability)
    const color = getEnergyColor(agent.energy, agent.maxEnergy);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(agent.position);
    scene.add(mesh);
    agentMeshes.set(agent.id, mesh);

    return mesh;
  }

  function getEnergyColor(energy, maxEnergy) {
    const ratio = energy / maxEnergy;
    if (ratio > 0.7) return new THREE.Color(0x00ff88); // Thriving - green
    if (ratio > 0.4) return new THREE.Color(0xffcc00); // Stable - yellow
    if (ratio > 0.2) return new THREE.Color(0xff6600); // Stressed - orange
    return new THREE.Color(0xff0044); // Critical - red
  }

  function updateAgentMesh(agent) {
    const mesh = agentMeshes.get(agent.id);
    if (!mesh) return;

    if (!agent.alive) {
      scene.remove(mesh);
      agentMeshes.delete(agent.id);
      return;
    }

    // Update position
    mesh.position.copy(agent.position);
    mesh.position.y = agent.energy / agent.maxEnergy * 5; // Height = prosperity

    // Update size based on energy stores
    const scale = 0.5 + (agent.energy / agent.maxEnergy) * 1.5;
    mesh.scale.setScalar(scale);

    // Update color
    const color = getEnergyColor(agent.energy, agent.maxEnergy);
    mesh.material.color = color;
    mesh.material.emissive = color;
  }

  function simulateStep() {
    const aliveAgents = agents.filter(a => a.alive);

    // Each agent ticks
    for (const agent of aliveAgents) {
      agent.tick(environmentEnergy, aliveAgents);
    }

    // Energy exchanges between nearby agents
    for (let i = 0; i < aliveAgents.length; i++) {
      for (let j = i + 1; j < aliveAgents.length; j++) {
        const a = aliveAgents[i];
        const b = aliveAgents[j];
        const distance = a.position.distanceTo(b.position);

        // Nearby agents exchange energy (trade)
        if (distance < 15) {
          // Energy flows from higher to lower (equalization tendency)
          const diff = a.energy - b.energy;
          if (Math.abs(diff) > 10) {
            const flowRate = 0.1;
            const amount = diff * flowRate;
            if (amount > 0) {
              a.exchangeWith(b, amount);
            } else {
              b.exchangeWith(a, -amount);
            }
            stats.transactions++;

            // Visualize the connection
            drawConnection(a, b, Math.abs(amount));
          }
        }
      }
    }

    // Reproduction
    const newAgents = [];
    for (const agent of aliveAgents) {
      if (agent.canReproduce() && Math.random() < 0.02) {
        const offspring = agent.reproduce();
        if (offspring) {
          newAgents.push(offspring);
          createAgentMesh(offspring);
          stats.births++;
        }
      }
    }
    agents.push(...newAgents);

    // Count deaths
    const previousAlive = aliveAgents.length;
    const nowAlive = agents.filter(a => a.alive).length;
    stats.deaths += previousAlive - nowAlive + newAgents.length - (agents.filter(a => a.alive).length - previousAlive);

    // Update meshes
    for (const agent of agents) {
      updateAgentMesh(agent);
    }

    // Update stats
    const currentAlive = agents.filter(a => a.alive);
    stats.population = currentAlive.length;
    stats.totalEnergy = currentAlive.reduce((sum, a) => sum + a.energy, 0);
    stats.averageEnergy = stats.population > 0 ? stats.totalEnergy / stats.population : 0;

    updateUI();

    // Clear old connection lines
    clearConnections();
  }

  function drawConnection(a, b, intensity) {
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: Math.min(0.8, intensity / 10)
    });

    const points = [
      new THREE.Vector3(a.position.x, a.energy / a.maxEnergy * 5, a.position.z),
      new THREE.Vector3(b.position.x, b.energy / b.maxEnergy * 5, b.position.z)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    connectionLines.push(line);
  }

  function clearConnections() {
    for (const line of connectionLines) {
      scene.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    }
    connectionLines = [];
  }

  function createUI() {
    const ui = document.createElement('div');
    ui.id = 'simulation-ui';
    ui.innerHTML = `
      <div style="position: fixed; top: 20px; left: 20px; background: rgba(0,0,0,0.8);
                  color: #00ff88; padding: 20px; border-radius: 10px; font-family: monospace;
                  border: 1px solid #0f3460;">
        <h3 style="margin: 0 0 15px 0; color: #e94560;">Energy Exchange Simulation</h3>
        <div id="stats-display">
          <div>Population: <span id="stat-population">0</span></div>
          <div>Total Energy: <span id="stat-total">0</span></div>
          <div>Average Energy: <span id="stat-average">0</span></div>
          <div>Transactions: <span id="stat-transactions">0</span></div>
          <div>Births: <span id="stat-births">0</span></div>
          <div>Deaths: <span id="stat-deaths">0</span></div>
        </div>
        <hr style="border-color: #0f3460; margin: 15px 0;">
        <div style="margin-bottom: 10px;">
          <label>Environment Energy: <span id="env-energy-value">${environmentEnergy}</span></label>
          <input type="range" id="env-energy" min="10" max="200" value="${environmentEnergy}"
                 style="width: 100%;">
        </div>
        <div style="font-size: 11px; color: #888; margin-top: 15px;">
          <div style="margin-bottom: 5px;"><span style="color: #00ff88;">●</span> Thriving (>70%)</div>
          <div style="margin-bottom: 5px;"><span style="color: #ffcc00;">●</span> Stable (40-70%)</div>
          <div style="margin-bottom: 5px;"><span style="color: #ff6600;">●</span> Stressed (20-40%)</div>
          <div><span style="color: #ff0044;">●</span> Critical (<20%)</div>
        </div>
      </div>
    `;
    document.body.appendChild(ui);

    // Environment energy slider
    document.getElementById('env-energy').addEventListener('input', (e) => {
      environmentEnergy = parseInt(e.target.value);
      document.getElementById('env-energy-value').textContent = environmentEnergy;
    });
  }

  function updateUI() {
    document.getElementById('stat-population').textContent = stats.population;
    document.getElementById('stat-total').textContent = stats.totalEnergy.toFixed(0);
    document.getElementById('stat-average').textContent = stats.averageEnergy.toFixed(1);
    document.getElementById('stat-transactions').textContent = stats.transactions;
    document.getElementById('stat-births').textContent = stats.births;
    document.getElementById('stat-deaths').textContent = stats.deaths;
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate(time) {
    requestAnimationFrame(animate);

    // Run simulation at fixed interval
    if (time - lastSimTime > simInterval) {
      simulateStep();
      lastSimTime = time;
    }

    controls.update();
    renderer.render(scene, camera);
  }
}
