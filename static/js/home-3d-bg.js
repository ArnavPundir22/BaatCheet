// home-3d-bg.js

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('home-3d-canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    // Phase 1: Initialize Scene
    const scene = new THREE.Scene();
    // Add some fog for depth
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;
    camera.position.y = 20;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize performance
    container.appendChild(renderer.domElement);

    // Create a group to hold everything and rotate it together
    const group = new THREE.Group();
    scene.add(group);

    // Create Abstract Geometries (Floating Data Orbs)
    const orbsCount = 3;
    const orbs = [];
    
    for (let i = 0; i < orbsCount; i++) {
        const geometry = new THREE.IcosahedronGeometry(Math.random() * 15 + 10, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x10b981, // Primary green
            wireframe: true,
            transparent: true,
            opacity: 0.15 + (Math.random() * 0.1),
            blending: THREE.AdditiveBlending
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Random positions
        mesh.position.set(
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 150
        );
        
        // Random rotation speeds
        mesh.userData = {
            rx: (Math.random() - 0.5) * 0.01,
            ry: (Math.random() - 0.5) * 0.01,
            rz: (Math.random() - 0.5) * 0.01,
        };
        
        group.add(mesh);
        orbs.push(mesh);
    }

    // Plexus Effect (Particles and Lines)
    const particleCount = 200; // Reduced for performance
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    // Colors: mix of primary and secondary
    const colors = [new THREE.Color(0x10b981), new THREE.Color(0x34d399), new THREE.Color(0x059669)];
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Position
        particlePositions[i3] = (Math.random() - 0.5) * 300;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 300;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 300;
        
        // Velocity
        particleVelocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        });

        // Color
        const color = colors[Math.floor(Math.random() * colors.length)];
        particleColors[i3] = color.r;
        particleColors[i3 + 1] = color.g;
        particleColors[i3 + 2] = color.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    group.add(particles);

    // Lines for plexus
    const linesGeometry = new THREE.BufferGeometry();
    const linesMaterial = new THREE.LineBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending
    });
    
    // Create lines mesh but we'll update its geometry every frame
    const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
    group.add(linesMesh);

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    const clock = new THREE.Clock();

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    function animate() {
        requestAnimationFrame(animate);
        
        const time = clock.getElapsedTime();

        // Smooth camera movement based on mouse
        targetX = mouseX * 0.05;
        targetY = mouseY * 0.05;
        
        camera.position.x += (targetX - camera.position.x) * 0.02;
        camera.position.y += (-targetY - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        // Rotate the entire group slowly
        group.rotation.y = time * 0.05;
        group.rotation.x = time * 0.02;

        // Animate orbs
        orbs.forEach(orb => {
            orb.rotation.x += orb.userData.rx;
            orb.rotation.y += orb.userData.ry;
            orb.rotation.z += orb.userData.rz;
        });

        // Update particle positions and draw lines
        const positions = particles.geometry.attributes.position.array;
        
        // Update positions based on velocity
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] += particleVelocities[i].x;
            positions[i3 + 1] += particleVelocities[i].y;
            positions[i3 + 2] += particleVelocities[i].z;

            // Bounce off boundaries
            if (positions[i3] < -150 || positions[i3] > 150) particleVelocities[i].x *= -1;
            if (positions[i3 + 1] < -150 || positions[i3 + 1] > 150) particleVelocities[i].y *= -1;
            if (positions[i3 + 2] < -150 || positions[i3 + 2] > 150) particleVelocities[i].z *= -1;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;

        // Update lines connecting close particles
        const linePositions = [];
        const connectDistance = 45; // Maximum distance to connect
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            for (let j = i + 1; j < particleCount; j++) {
                const j3 = j * 3;
                
                const dx = positions[i3] - positions[j3];
                const dy = positions[i3 + 1] - positions[j3 + 1];
                const dz = positions[i3 + 2] - positions[j3 + 2];
                const distSq = dx*dx + dy*dy + dz*dz;
                
                if (distSq < connectDistance * connectDistance) {
                    linePositions.push(
                        positions[i3], positions[i3 + 1], positions[i3 + 2],
                        positions[j3], positions[j3 + 1], positions[j3 + 2]
                    );
                }
            }
        }

        linesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

        renderer.render(scene, camera);
    }

    // Start animation
    animate();
});
