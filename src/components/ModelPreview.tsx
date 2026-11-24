import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight, Box3, DirectionalLight, Group, Material, Mesh,
  PerspectiveCamera, Scene, SkinnedMesh, Sphere, Texture, WebGLRenderer,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function disposeModel(model: Object3D) {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) {
          if (typeof ImageBitmap !== 'undefined' && value.source.data instanceof ImageBitmap) value.source.data.close();
          value.dispose();
        }
      }
      material.dispose();
    }
    if (object instanceof SkinnedMesh) object.skeleton.dispose();
  });
}

interface Props {
  url: string;
  name: string;
  rotationX: number;
  rotationY: number;
}

export default function ModelPreview({ url, name, rotationX, rotationY }: Props) {
  const [initialUrl] = useState(url);
  const hostRef = useRef<HTMLDivElement>(null);
  const applyAngles = useRef<((x: number, y: number) => void) | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus('error');
      return;
    }
    const controller = new AbortController();
    const scene = new Scene();
    const pivot = new Group();
    const camera = new PerspectiveCamera(38, 1, 0.001, 100);
    const keyLight = new DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 6);
    scene.add(pivot, new AmbientLight(0xffffff, 2), keyLight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    let model: Object3D | undefined;
    let renderWidth = 0;
    let renderHeight = 0;
    const draw = () => {
      if (!model) return;
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height) return;
      if (width !== renderWidth || height !== renderHeight) {
        renderWidth = width;
        renderHeight = height;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        const verticalFov = camera.fov * Math.PI / 360;
        const horizontalFov = Math.atan(Math.tan(verticalFov) * camera.aspect);
        // The GLB is normalized to a unit bounding sphere before being rotated.
        const distance = 1.12 / Math.sin(Math.min(verticalFov, horizontalFov));
        camera.far = distance + 2;
        camera.position.set(0, 0, distance);
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };

    applyAngles.current = (x, y) => {
      pivot.rotation.set(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0, 0);
      draw();
    };
    const observer = new ResizeObserver(draw);
    observer.observe(host);

    async function load() {
      try {
        const response = await fetch(initialUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        const { scene: loadedModel } = await new GLTFLoader().parseAsync(bytes, new URL('.', response.url || initialUrl).href);
        if (controller.signal.aborted) {
          disposeModel(loadedModel);
          return;
        }
        model = loadedModel;
        const bounds = new Box3().setFromObject(model).getBoundingSphere(new Sphere());
        if (bounds.isEmpty() || !Number.isFinite(bounds.radius)) throw new Error('Пустая модель');
        const centered = new Group();
        centered.add(model);
        centered.position.copy(bounds.center).negate();
        const normalized = new Group();
        normalized.scale.setScalar(bounds.radius > 0 ? 1 / bounds.radius : 1);
        normalized.add(centered);
        pivot.add(normalized);
        draw();
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }
    void load();

    return () => {
      controller.abort();
      observer.disconnect();
      applyAngles.current = null;
      if (model) disposeModel(model);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [initialUrl]);

  useEffect(() => {
    applyAngles.current?.(rotationX, rotationY);
  }, [rotationX, rotationY]);

  return (
    <>
      <div
        ref={hostRef}
        className={`model-preview-canvas${status === 'ready' ? ' is-ready' : ''}`}
        role={status === 'ready' ? 'img' : undefined}
        aria-label={status === 'ready' ? `3D-модель индекса ${name}` : undefined}
      />
      {status === 'loading' && <p className="model-status" role="status">Загрузка 3D-модели…</p>}
      {status === 'error' && <p className="model-status" role="status">3D-модель недоступна</p>}
    </>
  );
}
