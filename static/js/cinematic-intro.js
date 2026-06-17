// cinematic-intro.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if cinematic has already been shown this session
    if (sessionStorage.getItem('baatcheet_intro_played')) {
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) overlay.remove();
        return;
    }

    const overlay = document.getElementById('cinematic-overlay');
    if (!overlay) return;

    // Phase 1: Initialize Three.js Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.03);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('cinematic-canvas-container').appendChild(renderer.domElement);

    // Create Cyber Tunnel (Points/Particles)
    const geometry = new THREE.BufferGeometry();
    const particlesCount = 3000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i+=3) {
        // Create a tunnel shape
        const radius = 3 + Math.random() * 2;
        const theta = Math.random() * Math.PI * 2;
        const z = (Math.random() - 0.5) * 100;

        posArray[i] = Math.cos(theta) * radius; // x
        posArray[i+1] = Math.sin(theta) * radius; // y
        posArray[i+2] = z; // z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        color: 0x10b981, // Primary green
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);

    // Create a wireframe grid at the bottom
    const gridGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const gridMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x059669, 
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = Math.PI / 2;
    grid.position.y = -4;
    scene.add(grid);

    // Animation Loop Variables
    let speed = 0.1;
    let isSpeedingUp = false;
    let isFadingOut = false;

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();

        // Move particles forward
        particlesMesh.position.z += speed;
        grid.position.z += speed * 0.5;

        // Rotate particles slightly
        particlesMesh.rotation.z = elapsedTime * 0.1;

        // Reset positions to create infinite loop
        if (particlesMesh.position.z > 50) {
            particlesMesh.position.z = 0;
        }
        if (grid.position.z > 10) {
            grid.position.z = 0;
        }

        // Speed up phase
        if (isSpeedingUp) {
            speed += 0.01;
            if (speed > 2.0) speed = 2.0;
            camera.fov += 0.5; // Cinematic zoom out effect
            if (camera.fov > 100) camera.fov = 100;
            camera.updateProjectionMatrix();
        }

        // Fade out phase
        if (isFadingOut) {
            material.opacity -= 0.02;
            gridMaterial.opacity -= 0.01;
        }

        renderer.render(scene, camera);
    }

    animate();

    // Cinematic Sequence Logic
    const hudBooting = document.getElementById('cinematic-hud-booting');
    const hudWelcome = document.getElementById('cinematic-hud-welcome');

    // Phase 1: Booting (already visible via CSS)
    
    // Phase 2: Transition to Welcome
    setTimeout(() => {
        hudBooting.style.opacity = '0';
        hudBooting.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            hudBooting.style.display = 'none';
            hudWelcome.style.display = 'flex';
            
            // Force reflow
            void hudWelcome.offsetWidth;
            
            hudWelcome.style.opacity = '1';
            hudWelcome.style.transform = 'scale(1)';
            isSpeedingUp = true;
            
            // Phase 3: Fade out entire overlay
            setTimeout(() => {
                isFadingOut = true;
                overlay.style.opacity = '0';
                hudWelcome.style.transform = 'scale(1.5)';
                hudWelcome.style.opacity = '0';
                
                setTimeout(() => {
                    overlay.remove();
                    sessionStorage.setItem('baatcheet_intro_played', 'true');
                }, 1000); // Wait for CSS transition
                
            }, 2500); // Duration of Welcome text
            
        }, 500); // Wait for booting text to fade
        
    }, 3000); // Duration of Booting text
});
