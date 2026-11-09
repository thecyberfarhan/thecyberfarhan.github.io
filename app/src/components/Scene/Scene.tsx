import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSiteStore } from '../../state/useSiteStore';
import { ambientDensity, motionScale } from '../../lib/motion';
import styles from './Scene.module.css';

function tokenColor(name: string, fallback: string): THREE.Color {
  if (typeof window === 'undefined') return new THREE.Color(fallback);
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

/**
 * Raw Three.js background scene — not react-three-fiber, matching the reference
 * site's own approach (a plain renderer owned by a useRef/useEffect, not the R3F
 * ecosystem). A field of drifting wireframe polyhedra with mouse parallax.
 * Degrades to nothing (not a crash) if WebGL can't be created — this sandbox's own
 * browser pane can't create a WebGL context, so that fallback path matters.
 */
export default function Scene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);
  const motionLevel = useSiteStore((s) => s.motionLevel);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setSupported(false);
      return;
    }
    if (!renderer.getContext()) {
      setSupported(false);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 100);
    camera.position.z = 14;

    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    mount.appendChild(renderer.domElement);

    const steel = tokenColor('--steel', '#7FA8CC');
    const bronze = tokenColor('--bronze', '#C79A66');
    const accent = tokenColor('--accent', '#B4232C');
    const palette = [steel, bronze, accent];

    const group = new THREE.Group();
    scene.add(group);

    const geometries = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.BoxGeometry(1.3, 1.3, 1.3),
    ];

    function buildField(count: number) {
      group.clear();
      for (let i = 0; i < count; i++) {
        const geo = geometries[i % geometries.length];
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({
          color: palette[i % palette.length],
          transparent: true,
          opacity: .35,
        });
        const mesh = new THREE.LineSegments(edges, mat);
        const scale = .5 + Math.random() * 1.1;
        mesh.scale.setScalar(scale);
        mesh.position.set((Math.random() - .5) * 20, (Math.random() - .5) * 12, (Math.random() - .5) * 10 - 4);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        mesh.userData.spin = (Math.random() - .5) * .003 + .001;
        group.add(mesh);
      }
    }

    buildField(Math.max(4, ambientDensity(10)));

    let mx = 0, my = 0;
    function onMove(e: PointerEvent) {
      mx = e.clientX / innerWidth - .5;
      my = e.clientY / innerHeight - .5;
    }
    window.addEventListener('pointermove', onMove, { passive: true });

    function onResize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    }
    window.addEventListener('resize', onResize);

    let raf = 0;
    let running = true;
    function loop() {
      if (!running) return;
      const scale = motionScale();
      group.children.forEach((child) => {
        child.rotation.x += (child.userData.spin as number) * scale;
        child.rotation.y += (child.userData.spin as number) * 1.4 * scale;
      });
      camera.position.x += (mx * 2 - camera.position.x) * .03;
      camera.position.y += (-my * 1.4 - camera.position.y) * .03;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    loop();

    function onVisibility() {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; loop(); }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      geometries.forEach((g) => g.dispose());
      group.children.forEach((c) => {
        const mesh = c as THREE.LineSegments;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // Rebuild the whole scene when the motion-level tier changes (density differs
    // enough per tier that a partial update isn't worth it).
  }, [motionLevel]);

  if (!supported) return null;
  return <div ref={mountRef} className={styles.canvasWrap} aria-hidden="true" />;
}
