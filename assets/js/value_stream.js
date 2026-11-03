// assets/js/hooks/value_stream_hook.js
import * as THREE from 'three';

export const ValueStreamVisualization = {
    mounted() {
        this.initialized = false;
        this.lastDataHash = null;

        // Use requestAnimationFrame to ensure DOM is laid out before measuring
        requestAnimationFrame(() => {
            this.initThreeJS();
            this.setupEventListeners();
            this.loadData();
            this.lastDataHash = this.getDataHash();
            this.initialized = true;
        });
    },

    updated() {
        // Always reload when updated is called - LiveView has detected a change
        if (this.initialized && this.scene) {
            const newHash = this.getDataHash();
            if (newHash !== this.lastDataHash) {
                console.log('Data changed, reloading visualization');
                this.lastDataHash = newHash;
                this.loadData();
            }
        }
    },

    getDataHash() {
        // Simple hash of the data to detect changes
        return this.el.dataset.nodes + this.el.dataset.connections + this.el.dataset.viewMode;
    },

    initThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Use container dimensions instead of window
        const width = this.el.clientWidth || window.innerWidth;
        const height = this.el.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x1f2937); // gray-900 background
        this.el.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);

        // Camera position
        this.camera.position.set(100, 50, 100);
        this.camera.lookAt(0, 0, 0);

        // Groups for organization
        this.valueStreamGroup = new THREE.Group();
        this.wardleyGroup = new THREE.Group();
        this.scene.add(this.valueStreamGroup);
        this.scene.add(this.wardleyGroup);

        // Raycaster for mouse interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.nodes = [];
        this.connections = [];
        this.fibers = [];

        // Animation variables
        this.time = 0;
        this.isTransitioning = false;
        this.userControlling = false;

        this.animate();
    },

    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('click', (event) => {
            this.onMouseClick(event);
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.onMouseMove(event);
        });

        // Resize
        window.addEventListener('resize', () => {
            const width = this.el.clientWidth || window.innerWidth;
            const height = this.el.clientHeight || window.innerHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    },

    loadData() {
        const viewMode = this.el.dataset.viewMode;
        let nodesData, connectionsData;

        try {
            nodesData = JSON.parse(this.el.dataset.nodes || '[]');
            connectionsData = JSON.parse(this.el.dataset.connections || '[]');
        } catch (e) {
            console.error('Error parsing data:', e);
            return;
        }

        console.log('Loading data:', { viewMode, nodeCount: nodesData.length, connectionCount: connectionsData.length });

        this.clearScene();

        if (viewMode === 'value_stream' || viewMode === '3d') {
            this.createValueStreamVisualization(nodesData, connectionsData);
            this.renderer.setClearColor(0x1f2937); // gray-900
            document.body.style.backgroundColor = '#1f2937';
            const title = document.querySelector('.main-title');
            if (title) title.classList.remove('wardley-mode');

            // Reset camera for 3D view
            this.camera.position.set(100, 50, 100);
            this.camera.lookAt(0, 0, 0);
        } else {
            this.createWardleyMapVisualization(nodesData, connectionsData);
            this.renderer.setClearColor(0xffffff);
            document.body.style.backgroundColor = '#ffffff';
            const title = document.querySelector('.main-title');
            if (title) title.classList.add('wardley-mode');
        }
    },

    clearScene() {
        // Dispose of existing objects properly to prevent memory leaks
        const disposeObject = (obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        };

        // Clear value stream group
        this.valueStreamGroup.traverse(disposeObject);
        while (this.valueStreamGroup.children.length > 0) {
            this.valueStreamGroup.remove(this.valueStreamGroup.children[0]);
        }

        // Clear wardley group
        this.wardleyGroup.traverse(disposeObject);
        while (this.wardleyGroup.children.length > 0) {
            this.wardleyGroup.remove(this.wardleyGroup.children[0]);
        }

        this.nodes = [];
        this.connections = [];
        this.fibers = [];

        // Clear labels
        const labels = this.el.querySelectorAll('.node-label');
        labels.forEach(label => label.remove());
    },

    createValueStreamVisualization(nodesData, connectionsData) {
        this.valueStreamGroup.visible = true;
        this.wardleyGroup.visible = false;

        // Create nodes with vibrant colors
        nodesData.forEach((nodeData, index) => {
            const node = this.createValueStreamNode(nodeData, index);
            this.valueStreamGroup.add(node.mesh);
            this.nodes.push({ ...node, data: nodeData });
            this.createNodeLabel(nodeData, false);
        });

        // Create flowing fiber connections
        connectionsData.forEach(conn => {
            const fiber = this.createFiberConnection(conn, nodesData);
            if (fiber) {
                this.valueStreamGroup.add(fiber);
                this.fibers.push(fiber);
            }
        });
    },

    createValueStreamNode(nodeData, index) {
        const colors = {
            // Original types
            anchor: 0xff6b6b,      // Vibrant red
            capability: 0x4ecdc4,  // Vibrant teal
            component: 0x45b7d1,   // Vibrant blue
            // Economic model types
            agent: 0x00b894,       // Green - actors in the system
            resource: 0xfdcb6e,    // Yellow - goods/resources
            medium: 0xf39c12,      // Orange - money/medium of exchange
            force: 0x9b59b6,       // Purple - market forces
            equilibrium: 0xe74c3c, // Red - equilibrium points
            sector: 0x3498db,      // Blue - economic sectors
            market: 0x1abc9c,      // Teal - markets
            flow: 0x00cec9,        // Cyan - flows of value
            source: 0xf1c40f,      // Bright yellow - energy sources
            stock: 0xe67e22,       // Dark orange - accumulated stocks
            sink: 0x95a5a6,        // Gray - waste/entropy sinks
            measure: 0xdfe6e9,     // Light gray - measurements
            constraint: 0xd63031,  // Dark red - constraints/limits
            system: 0x6c5ce7,      // Violet - complex systems
            dissipative: 0xa29bfe, // Light purple - dissipative structures
            emergent: 0xfd79a8,    // Pink - emergent phenomena
            phenomenon: 0xe84393,  // Magenta - observable phenomena
            process: 0x74b9ff,     // Light blue - processes
            loop: 0x55efc4,        // Mint - feedback loops
            population: 0x81ecec,  // Light cyan - populations
            limit: 0xff7675,       // Coral - limits
            // City model node types
            actor: 0xe17055,       // Coral - human agents
            organization: 0x0984e3, // Blue - organizations
            contract: 0x00b894,    // Green - contracts/agreements
            revenue: 0xf1c40f,     // Gold - revenue flows
            infrastructure: 0x6c5ce7, // Purple - infrastructure
            property_right: 0xfd79a8, // Pink - property rights
            externality: 0xff7675, // Light red - externalities
            institution: 0x636e72  // Gray - institutions
        };

        // Scale node size based on value - minimum size of 3, scaled by sqrt of value
        const baseSize = 3;
        const scaledSize = baseSize + Math.sqrt(nodeData.value) * 0.5;
        const geometry = new THREE.SphereGeometry(scaledSize, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: colors[nodeData.type] || 0x96ceb4,
            shininess: 100,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(nodeData.x, nodeData.y, nodeData.z);
        mesh.userData = { id: nodeData.id, type: 'node' };

        // Add pulsing animation
        mesh.scale.set(1, 1, 1);
        mesh.userData.baseScale = 1;
        mesh.userData.pulsePhase = index * 0.5;

        return { mesh, material };
    },

    createFiberConnection(connection, nodesData) {
        const fromNode = nodesData.find(n => n.id === connection.from);
        const toNode = nodesData.find(n => n.id === connection.to);

        if (!fromNode || !toNode) return null;

        const start = new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z);
        const end = new THREE.Vector3(toNode.x, toNode.y, toNode.z);

        // Create curved fiber path
        const curve = new THREE.CatmullRomCurve3([
            start,
            new THREE.Vector3(
                (start.x + end.x) / 2 + (Math.random() - 0.5) * 30,
                (start.y + end.y) / 2 + 20,
                (start.z + end.z) / 2 + (Math.random() - 0.5) * 30
            ),
            end
        ]);

        // Create flowing particles along the curve
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const fiberColors = {
            // Original types
            primary: 0xff9f43,       // Vibrant orange
            dependency: 0x6c5ce7,    // Vibrant purple
            enhancement: 0xa29bfe,   // Light purple
            input: 0x00b894,         // Vibrant green
            output: 0xe84393,        // Vibrant pink
            // Economic model connection types
            produces: 0x2ecc71,      // Green - production
            exchange: 0xf1c40f,      // Yellow - exchange
            purchase: 0x3498db,      // Blue - purchasing
            pays: 0xe74c3c,          // Red - payment
            receives: 0x9b59b6,      // Purple - receiving
            determines: 0x1abc9c,    // Teal - determination
            influences: 0xe67e22,    // Orange - influence
            clears: 0x00cec9,        // Cyan - market clearing
            supplies_labor: 0x74b9ff, // Light blue
            supplies_goods: 0x55efc4, // Mint
            employs: 0xfd79a8,       // Pink
            income: 0xffeaa7,        // Light yellow
            consumes: 0xdfe6e9,      // Light gray
            purchases: 0x81ecec,     // Light cyan
            powers: 0xf39c12,        // Orange - energy powering
            ancient_capture: 0x636e72, // Dark gray - fossil fuels
            current_capture: 0xfdcb6e, // Yellow - renewables
            dissipates: 0x95a5a6,    // Gray - entropy
            measured_as: 0xb2bec3,   // Silver
            constrains: 0xd63031,    // Dark red - constraints
            throughput: 0x00b894,    // Green - throughput
            dissipation: 0x636e72,   // Dark gray
            generates: 0xa29bfe,     // Light purple
            enables: 0x6c5ce7,       // Purple
            directs: 0x0984e3,       // Blue
            demands: 0xe17055,       // Coral
            degrades: 0xd63031,      // Red - degradation
            engage_in: 0x74b9ff,     // Light blue
            produce: 0x55efc4,       // Mint
            triggers: 0xffeaa7,      // Light yellow
            amplifies: 0xff7675,     // Coral
            stabilizes: 0x81ecec,    // Light cyan
            undergo: 0xdfe6e9,       // Light gray
            // City model connection types
            contractual: 0x00b894,   // Green - contract-based
            coercive: 0xd63031,      // Red - coercion-based
            tax_flow: 0xf1c40f,      // Gold - tax revenue flows
            rent_flow: 0xe67e22,     // Orange - rental payments
            authority: 0x6c5ce7,     // Purple - authority/rights
            incentive: 0x55efc4,     // Mint - incentive alignment
            externality_link: 0xff7675, // Coral - spillovers
            democratic: 0x74b9ff     // Light blue - democratic accountability
        };

        const material = new THREE.LineBasicMaterial({
            color: fiberColors[connection.type] || 0xffffff,
            transparent: true,
            opacity: connection.strength,
            linewidth: 3
        });

        const fiber = new THREE.Line(geometry, material);
        fiber.userData = {
            curve,
            connection,
            particles: [],
            type: 'fiber'
        };

        // Create flowing particles
        for (let i = 0; i < 5; i++) {
            const particleGeom = new THREE.SphereGeometry(0.5, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: fiberColors[connection.type] || 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeom, particleMat);
            particle.userData = { t: i / 5, speed: 0.01 + Math.random() * 0.02 };
            fiber.add(particle);
            fiber.userData.particles.push(particle);
        }

        return fiber;
    },

    createWardleyMapVisualization(nodesData, connectionsData) {
        this.valueStreamGroup.visible = false;
        this.wardleyGroup.visible = true;

        // Filter nodes with wardley tag
        const wardleyNodes = nodesData.filter(node => node.tags && node.tags.includes('wardley'));

        // Create Wardley map layout
        wardleyNodes.forEach(nodeData => {
            const node = this.createWardleyNode(nodeData);
            this.wardleyGroup.add(node.mesh);
            this.nodes.push({ ...node, data: nodeData });
            this.createNodeLabel(nodeData, true);
        });

        // Create simple connections for Wardley map
        const wardleyConnections = connectionsData.filter(conn =>
            wardleyNodes.some(n => n.id === conn.from) && wardleyNodes.some(n => n.id === conn.to)
        );

        wardleyConnections.forEach(conn => {
            const line = this.createWardleyConnection(conn, wardleyNodes);
            if (line) this.wardleyGroup.add(line);
        });

        // Adjust camera for Wardley map
        this.camera.position.set(0, 0, 150);
        this.camera.lookAt(0, 0, 0);
    },

    createWardleyNode(nodeData) {
        // Position based on evolution (x) and visibility (y)
        const x = (nodeData.evolution - 0.5) * 100;
        const y = (nodeData.visibility - 0.5) * 60;
        const z = 0;

        const geometry = new THREE.BoxGeometry(8, 8, 2);
        const material = new THREE.MeshPhongMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.userData = { id: nodeData.id, type: 'wardley-node' };

        return { mesh, material };
    },

    createWardleyConnection(connection, nodesData) {
        const fromNode = nodesData.find(n => n.id === connection.from);
        const toNode = nodesData.find(n => n.id === connection.to);

        if (!fromNode || !toNode) return null;

        const start = new THREE.Vector3(
            (fromNode.evolution - 0.5) * 100,
            (fromNode.visibility - 0.5) * 60,
            0
        );
        const end = new THREE.Vector3(
            (toNode.evolution - 0.5) * 100,
            (toNode.visibility - 0.5) * 60,
            0
        );

        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.6
        });

        return new THREE.Line(geometry, material);
    },

    createNodeLabel(nodeData, isWardley) {
        const label = document.createElement('div');
        label.className = `node-label ${isWardley ? 'wardley-label' : ''}`;
        label.textContent = nodeData.name;
        label.id = `label-${nodeData.id}`;
        label.style.display = 'block';
        this.el.appendChild(label);

        // Force initial position update
        setTimeout(() => this.updateLabels(), 100);
    },

    updateLabels() {
        this.nodes.forEach(node => {
            const label = document.getElementById(`label-${node.data.id}`);
            if (label && node.mesh.visible) {
                const vector = node.mesh.position.clone();
                vector.project(this.camera);

                const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
                const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

                label.style.left = x + 'px';
                label.style.top = y + 'px';
                label.style.display = vector.z < 1 ? 'block' : 'none';
            }
        });
    },

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const allMeshes = [...this.valueStreamGroup.children, ...this.wardleyGroup.children]
            .filter(child => child.isMesh);

        const intersects = this.raycaster.intersectObjects(allMeshes);

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            if (selectedObject.userData.id) {
                this.pushEvent("select_node", { id: selectedObject.userData.id });
            }
        }
    },

    onMouseMove(event) {
        // Add hover effects here if needed
    },

    animate() {
        // Stop if destroyed
        if (this.isDestroyed) return;

        requestAnimationFrame(() => this.animate());

        this.time += 0.016;

        // Animate value stream nodes (pulsing)
        if (this.valueStreamGroup.visible) {
            this.nodes.forEach(node => {
                if (node.mesh.parent === this.valueStreamGroup) {
                    const pulse = 1 + Math.sin(this.time * 2 + node.mesh.userData.pulsePhase) * 0.1;
                    node.mesh.scale.setScalar(node.mesh.userData.baseScale * pulse);
                }
            });

            // Animate fiber particles
            this.fibers.forEach(fiber => {
                fiber.userData.particles.forEach(particle => {
                    particle.userData.t += particle.userData.speed;
                    if (particle.userData.t > 1) particle.userData.t = 0;

                    const point = fiber.userData.curve.getPoint(particle.userData.t);
                    particle.position.copy(point);
                });
            });

            // Auto-rotate camera for value stream
            if (!this.userControlling) {
                const radius = 120;
                this.camera.position.x = Math.cos(this.time * 0.1) * radius;
                this.camera.position.z = Math.sin(this.time * 0.1) * radius;
                this.camera.position.y = 50;
                this.camera.lookAt(0, 0, 0);
            }
        }

        // Always update labels and render
        this.updateLabels();
        this.renderer.render(this.scene, this.camera);
    },

    destroyed() {
        // Stop animation loop
        this.isDestroyed = true;

        // Clear labels
        const labels = this.el.querySelectorAll('.node-label');
        labels.forEach(label => label.remove());

        // Dispose of renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Clear scene
        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            this.scene.clear();
        }
    }
};