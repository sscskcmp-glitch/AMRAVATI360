(function(){
  const canvas = document.getElementById('globeCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 4.6;

  // Outer wireframe globe
  const globeGeo = new THREE.SphereGeometry(1.75, 32, 32);
  const globeMat = new THREE.MeshBasicMaterial({ color:0x6ea8fe, wireframe:true, transparent:true, opacity:0.32 });
  const globe = new THREE.Mesh(globeGeo, globeMat);
  scene.add(globe);

  // Soft glow sphere behind
  const glowGeo = new THREE.SphereGeometry(1.9, 24, 24);
  const glowMat = new THREE.MeshBasicMaterial({ color:0xa685ff, transparent:true, opacity:0.05 });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

  // Inner solid sphere for depth
  const innerGeo = new THREE.SphereGeometry(1.72, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({ color:0x10192e, transparent:true, opacity:0.65 });
  scene.add(new THREE.Mesh(innerGeo, innerMat));

  // Multiple glowing markers representing mapped cities/points
  const markerColors = [0xa685ff, 0x6ea8fe, 0xffb020];
  const markers = [];
  for (let i = 0; i < 3; i++) {
    const mGeo = new THREE.SphereGeometry(0.032, 12, 12);
    const mMat = new THREE.MeshBasicMaterial({ color: markerColors[i] });
    const m = new THREE.Mesh(mGeo, mMat);
    const theta = (i / 3) * Math.PI * 2;
    const phi = 0.4 + i * 0.35;
    m.userData = { theta, phi, radius: 1.28 };
    scene.add(m);
    markers.push(m);
  }

  // Starfield
  const starGeo = new THREE.BufferGeometry();
  const starCount = 900;
  const positions = new Float32Array(starCount * 3);
  for(let i=0;i<starCount*3;i++){ positions[i] = (Math.random()-0.5) * 24; }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color:0xffffff, size:0.018, transparent:true, opacity:0.55 });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  let t = 0;
  function animate(){
    requestAnimationFrame(animate);
    t += 0.008;
    globe.rotation.y += 0.0018;
    stars.rotation.y += 0.0002;

    markers.forEach(function (m, i) {
      const angle = globe.rotation.y + m.userData.theta;
      m.position.x = m.userData.radius * Math.cos(angle) * Math.cos(m.userData.phi);
      m.position.y = m.userData.radius * Math.sin(m.userData.phi) * 0.6;
      m.position.z = m.userData.radius * Math.sin(angle) * Math.cos(m.userData.phi);
      const pulse = 1 + Math.sin(t * 2.5 + i) * 0.25;
      m.scale.set(pulse, pulse, pulse);
    });

    renderer.render(scene, camera);
  }
  animate();

  // Subtle parallax: hero content shifts slightly with mouse movement
  const heroContent = document.querySelector('.hero-content');
  window.addEventListener('mousemove', function (e) {
    if (!heroContent) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 10;
    const y = (e.clientY / window.innerHeight - 0.5) * 6;
    heroContent.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();