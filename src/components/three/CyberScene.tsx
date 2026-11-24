import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type SceneProps = { subtle?: boolean | undefined; reduced?: boolean | undefined; mobile?: boolean | undefined };

// Scroll progress 0..1 is read from the window each frame (no React state).
function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const BLUE = new THREE.Color("#8a0f1c"), CYAN = new THREE.Color("#ff2a3c"), RED = new THREE.Color("#ff1a1a"), GREEN = new THREE.Color("#e8e8e8");

function fibonacci(n: number, r: number) {
  const pts: THREE.Vector3[] = []; const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = g * i; pts.push(new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r)); }
  return pts;
}

function Globe({ count, reduced }: { count: number; reduced: boolean | undefined }) {
  const group = useRef<THREE.Group>(null!);
  const { nodes, lines, arcs } = useMemo(() => {
    const pts = fibonacci(count, 2.2);
    const pos = new Float32Array(pts.length * 3); pts.forEach((p, i) => p.toArray(pos, i * 3));
    const seg: number[] = [];
    pts.forEach((p, i) => { let k = 0; for (let j = i + 1; j < pts.length && k < 2; j++) if (p.distanceTo(pts[j]!) < 0.55) { seg.push(...p.toArray(), ...pts[j]!.toArray()); k++; } });
    // Great-circle arcs that data packets travel along
    const arcs = Array.from({ length: 14 }, (_, i) => {
      const a = pts[(i * 37) % pts.length]!, b = pts[(i * 91 + 13) % pts.length]!;
      const mid = a.clone().add(b).normalize().multiplyScalar(3.2);
      return new THREE.QuadraticBezierCurve3(a, mid, b);
    });
    return { nodes: pos, lines: new Float32Array(seg), arcs };
  }, [count]);
  const packets = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, d) => {
    const p = scrollProgress(), t = clock.elapsedTime, dt = Math.min(d, 0.05);
    const dir = p < 0.15 ? 1 : -1;
    if (!reduced) group.current.rotation.y += dt * 0.12 * dir;
    // Hero: centered large. Then slides left and shrinks; finale pulls far back.
    const left = smooth(0.05, 0.3, p), out = smooth(0.8, 1, p);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, 2.6 - 5.8 * left + 3.2 * out, 0.06);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, -left * 1.5 - out * 2, 0.06);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.3 + left * 0.4 - out * 0.5, 0.05);
    arcs.forEach((c, i) => { const u = (t * 0.25 + i / arcs.length) % 1; c.getPoint(u, dummy.position); dummy.scale.setScalar(Math.sin(u * Math.PI) * 1.2); dummy.updateMatrix(); packets.current.setMatrixAt(i, dummy.matrix); });
    packets.current.instanceMatrix.needsUpdate = true;
  });
  return <group ref={group} position={[2.6, 0, 0]}>
    <mesh><sphereGeometry args={[2.15, 48, 48]} /><meshStandardMaterial color="#070505" emissive="#1a0306" roughness={0.6} metalness={0.4} transparent opacity={0.85} /></mesh>
    <mesh><sphereGeometry args={[2.2, 24, 16]} /><meshBasicMaterial color={BLUE} wireframe transparent opacity={0.08} /></mesh>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[nodes, 3]} /></bufferGeometry><pointsMaterial color={CYAN} size={0.045} toneMapped={false} /></points>
    <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[lines, 3]} /></bufferGeometry><lineBasicMaterial color={BLUE} transparent opacity={0.35} toneMapped={false} /></lineSegments>
    {arcs.map((c, i) => <line key={i}><bufferGeometry onUpdate={(g) => g.setFromPoints(c.getPoints(40))} /><lineBasicMaterial color={i % 5 === 0 ? RED : CYAN} transparent opacity={0.4} toneMapped={false} /></line>)}
    <instancedMesh ref={packets} args={[undefined, undefined, arcs.length]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color={[3, 1.2, 0.4]} toneMapped={false} /></instancedMesh>
    <mesh scale={2.6}><sphereGeometry args={[1, 32, 32]} /><meshBasicMaterial color={BLUE} transparent opacity={0.05} side={THREE.BackSide} /></mesh>
  </group>;
}

// Network topology that forms with scroll; threats turn into protected nodes near the mitigation section.
function Topology({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const linesRef = useRef<THREE.LineSegments>(null!);
  const packets = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const target = Array.from({ length: count }, (_, i) => { const ring = i % 3; const a = (i / count) * Math.PI * 2 * 3; const r = 1.4 + ring * 1.1; return new THREE.Vector3(Math.cos(a) * r + 3, Math.sin(a) * r * 0.6 + (rnd() - 0.5), (rnd() - 0.5) * 2 - 1); });
    const start = target.map(() => new THREE.Vector3((rnd() - 0.5) * 24, (rnd() - 0.5) * 16, -8 - rnd() * 8));
    const threat = target.map(() => rnd() < 0.25);
    const edges: [number, number][] = []; target.forEach((p, i) => { const near = target.map((q, j) => [j, p.distanceTo(q)] as const).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 2); near.forEach(([j]) => i < j && edges.push([i, j])); });
    return { target, start, threat, edges, cur: target.map(() => new THREE.Vector3()) };
  }, [count]);
  const linePos = useMemo(() => new Float32Array(data.edges.length * 6), [data]);
  const dummy = useMemo(() => new THREE.Object3D(), []), col = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const p = scrollProgress(), t = clock.elapsedTime;
    const form = smooth(0.15, 0.55, p), heal = smooth(0.6, 0.8, p), flow = smooth(0.3, 0.45, p), fin = smooth(0.8, 1, p);
    data.target.forEach((tg, i) => {
      const c = data.cur[i]!.lerpVectors(data.start[i]!, tg, form); c.y += Math.sin(t * 0.6 + i) * 0.06; c.multiplyScalar(1 + fin * 0.6); c.x -= fin * 1.5;
      dummy.position.copy(c); dummy.scale.setScalar((0.35 + form * 0.65) * (data.threat[i] ? 1.4 : 1)); dummy.rotation.set(t * 0.3 + i, t * 0.2, 0); dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
      if (data.threat[i]) col.copy(RED).lerp(GREEN, heal).multiplyScalar(1.8); else col.copy(CYAN).multiplyScalar(1.6);
      ref.current.setColorAt(i, col);
    });
    ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    data.edges.forEach(([a, b], k) => { data.cur[a]!.toArray(linePos, k * 6); data.cur[b]!.toArray(linePos, k * 6 + 3); });
    linesRef.current.geometry.attributes['position']!.needsUpdate = true;
    (linesRef.current.material as THREE.LineBasicMaterial).opacity = form * 0.45;
    data.edges.forEach(([a, b], k) => { const u = (t * 0.5 + k * 0.13) % 1; dummy.position.lerpVectors(data.cur[a]!, data.cur[b]!, u); dummy.scale.setScalar(flow * Math.sin(u * Math.PI)); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); packets.current.setMatrixAt(k, dummy.matrix); });
    packets.current.instanceMatrix.needsUpdate = true;
  });
  return <group>
    <instancedMesh ref={ref} args={[undefined, undefined, count]}><octahedronGeometry args={[0.09, 0]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
    <lineSegments ref={linesRef}><bufferGeometry><bufferAttribute attach="attributes-position" args={[linePos, 3]} /></bufferGeometry><lineBasicMaterial color={BLUE} transparent opacity={0} toneMapped={false} /></lineSegments>
    <instancedMesh ref={packets} args={[undefined, undefined, data.edges.length]}><sphereGeometry args={[0.035, 6, 6]} /><meshBasicMaterial color={[3.2, 1.3, 0.4]} toneMapped={false} /></instancedMesh>
  </group>;
}

function Structures() {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, d) => { const dt = Math.min(d, 0.05); g.current.children.forEach((c, i) => { c.rotation.x += dt * (0.1 + i * 0.03); c.rotation.y += dt * (0.15 - i * 0.02); }); g.current.position.y = scrollProgress() * 6; });
  const items: [number, number, number, string][] = [[-6, 3, -6, "ico"], [6.5, -2, -7, "torus"], [-4, -4, -5, "oct"], [5, 4.5, -9, "shield"], [0, -8, -6, "ico"], [-7, -10, -8, "torus"]];
  return <group ref={g}>{items.map(([x, y, z, k], i) => <mesh key={i} position={[x, y, z]}>
    {k === "ico" ? <icosahedronGeometry args={[0.8, 0]} /> : k === "torus" ? <torusGeometry args={[0.8, 0.04, 8, 48]} /> : k === "oct" ? <octahedronGeometry args={[0.7, 0]} /> : <cylinderGeometry args={[0.7, 0.7, 0.08, 6]} />}
    <meshBasicMaterial color={i % 3 === 1 ? new THREE.Color("#3a3a3a") : BLUE} wireframe transparent opacity={0.35} toneMapped={false} /></mesh>)}</group>;
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);
  const pos = useMemo(() => { let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const a = new Float32Array(count * 3); for (let i = 0; i < count; i++) { a[i * 3] = (r() - 0.5) * 40; a[i * 3 + 1] = (r() - 0.5) * 30; a[i * 3 + 2] = -r() * 25; } return a; }, [count]);
  useFrame((_, d) => { ref.current.rotation.y += Math.min(d, 0.05) * 0.01; ref.current.position.y = scrollProgress() * 3; });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry><pointsMaterial color="#a05050" size={0.03} transparent opacity={0.6} /></points>;
}

function Grid() {
  const ref = useRef<THREE.GridHelper>(null!);
  useFrame(({ clock }) => { ref.current.position.z = (clock.elapsedTime * 0.3) % 1; });
  return <gridHelper ref={ref} args={[60, 60, "#4a0a10", "#1c0608"]} position={[0, -4, 0]} />;
}

function Rig({ reduced }: { reduced: boolean | undefined }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    const p = scrollProgress(), fin = smooth(0.8, 1, p);
    const mx = reduced ? 0 : pointer.x * 0.4, my = reduced ? 0 : pointer.y * 0.25;
    camera.position.x += (mx - camera.position.x) * 0.04;
    camera.position.y += (my - camera.position.y) * 0.04;
    camera.position.z += (8 + fin * 5 - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function CyberScene({ subtle, reduced, mobile }: SceneProps) {
  const ready = useRef(false);
  return <Canvas
    dpr={mobile ? 1 : [1, 1.5]} camera={{ position: [0, 0, 8], fov: 50 }}
    gl={{ antialias: false, powerPreference: "low-power", alpha: true }}
    frameloop={reduced ? "demand" : "always"}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); if (!ready.current) { ready.current = true; gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", ""); } }}
    style={{ pointerEvents: "none" }}>
    <fog attach="fog" args={["#050303", 10, 30]} />
    <ambientLight intensity={0.2} /><pointLight position={[5, 5, 5]} intensity={40} color="#ff2030" /><pointLight position={[-6, -3, 2]} intensity={15} color="#ff2a3c" />
    <Rig reduced={reduced} />
    <Dust count={mobile ? 400 : 1200} />
    <Grid />
    <Structures />
    <Globe count={mobile ? 260 : subtle ? 320 : 520} reduced={reduced} />
    {!subtle && <Topology count={mobile ? 24 : 42} />}
    {!mobile && <EffectComposer multisampling={0}><Bloom intensity={subtle ? 0.5 : 0.9} luminanceThreshold={0.2} mipmapBlur /><Vignette darkness={0.85} offset={0.3} /></EffectComposer>}
  </Canvas>;
}
