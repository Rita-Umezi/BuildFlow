/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ProjectState, Wall, Door, Window, Stair, Furniture, Landscape } from "../types";
import { RotateCcw, Compass, ZoomIn, ZoomOut, Maximize2, Minimize2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move } from "lucide-react";

interface ThreeViewportProps {
  projectState: ProjectState;
  isFullscreen?: boolean;
  setIsFullscreen?: (val: boolean) => void;
}

export default function ThreeViewport({
  projectState,
  isFullscreen = false,
  setIsFullscreen,
}: ThreeViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Orbit state references
  const rotationRef = useRef({ x: -Math.PI / 6, y: -Math.PI / 4 }); // Tilt slightly down and angle
  const zoomRef = useRef(1.0);
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef<"none" | "orbit" | "pan">("none");
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const [wheelMode, setWheelMode] = useState<"zoom" | "pan">("pan"); // Default to panning as requested
  const [panVal, setPanVal] = useState({ x: 0, y: 0 });
  const lastPanValRef = useRef({ x: 0, y: 0 });

  // Listen to keyboard Arrow keys for panning/scrolling 3D model
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      const scrollStep = 45;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        panRef.current.y += scrollStep;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        panRef.current.y -= scrollStep;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        panRef.current.x += scrollStep;
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        panRef.current.x -= scrollStep;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Persistent refs for scrollbar dragging in 3D
  const isDraggingScrollY = useRef(false);
  const startDragY = useRef(0);
  const startPanY = useRef(0);

  const isDraggingScrollX = useRef(false);
  const startDragX = useRef(0);
  const startPanX = useRef(0);

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isDraggingScrollY.current && containerRef.current) {
        const deltaY = e.clientY - startDragY.current;
        const trackHeight = containerRef.current.clientHeight - 80;
        const panDelta = -deltaY * (3000 / trackHeight);
        panRef.current.y = Math.max(-1500, Math.min(1500, startPanY.current + panDelta));
      }
      if (isDraggingScrollX.current && containerRef.current) {
        const deltaX = e.clientX - startDragX.current;
        const trackWidth = containerRef.current.clientWidth - 80;
        const panDelta = -deltaX * (3000 / trackWidth);
        panRef.current.x = Math.max(-1500, Math.min(1500, startPanX.current + panDelta));
      }
    };

    const handleGlobalUp = () => {
      isDraggingScrollY.current = false;
      isDraggingScrollX.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
    };
  }, []);

  // Scene references to allow real-time updates
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  // Active details displayed in viewport stats
  const [elementsCount, setElementsCount] = useState({ walls: 0, rooms: 0, furniture: 0, stairs: 0 });

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create Scene with elegant light grey background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f1f5f9");
    sceneRef.current = scene;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Directional Architectural Sunlighting
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
    sunLight.position.set(400, 500, 300);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    const helperLight = new THREE.DirectionalLight(0xffffff, 0.25);
    helperLight.position.set(-400, 200, -300);
    scene.add(helperLight);

    // Grid Floor Helper (drawn at Z = 0)
    const gridHelper = new THREE.GridHelper(1200, 48, "#94a3b8", "#cbd5e1");
    // Rotate grid helper so it lies flat on the layout floor
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.set(400, 300, -0.5);
    scene.add(gridHelper);

    // Substantial ground plane
    const groundGeo = new THREE.PlaneGeometry(2500, 2500);
    const groundMat = new THREE.MeshPhongMaterial({ color: "#f8fafc", depthWrite: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(400, 300, -1);
    scene.add(ground);

    // Initial camera sizing
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;
    const aspect = width / height;

    // View bounds map to 2D canvas scale setup (800 x 600)
    const viewSize = 650;
    const camera = new THREE.OrthographicCamera(
      (-viewSize * aspect) / 2,
      (viewSize * aspect) / 2,
      viewSize / 2,
      -viewSize / 2,
      1,
      2000
    );

    // Set camera center coordinates
    camera.position.set(400, 300, 600);
    camera.lookAt(400, 300, 0);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const asp = w / h;

      cameraRef.current.left = (-viewSize * asp) / 2;
      cameraRef.current.right = (viewSize * asp) / 2;
      cameraRef.current.top = viewSize / 2;
      cameraRef.current.bottom = -viewSize / 2;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Initial Render Trigger
    build3DModel();

    // Render loop
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      if (cameraRef.current && sceneRef.current && rendererRef.current) {
        // Apply orbit spherical angles
        const rotX = rotationRef.current.x; // Vertical pitch
        const rotY = rotationRef.current.y; // Horizontal yaw
        const distance = 800 / zoomRef.current; // Zoom distance modifier

        // Target remains the active pan center
        const targetX = 400 + panRef.current.x;
        const targetY = 300 + panRef.current.y;
        const targetZ = 0;

        // Spherical trigonometry for camera coordinates relative to center
        cameraRef.current.position.x = targetX + distance * Math.cos(rotX) * Math.sin(rotY);
        cameraRef.current.position.y = targetY + distance * Math.cos(rotX) * Math.cos(rotY);
        cameraRef.current.position.z = targetZ + distance * Math.sin(rotX);

        cameraRef.current.lookAt(targetX, targetY, targetZ);
        rendererRef.current.render(sceneRef.current, cameraRef.current);

        // Sync with React State for scrollbars
        if (
          Math.abs(panRef.current.x - lastPanValRef.current.x) > 0.1 ||
          Math.abs(panRef.current.y - lastPanValRef.current.y) > 0.1
        ) {
          lastPanValRef.current = { x: panRef.current.x, y: panRef.current.y };
          setPanVal({ x: panRef.current.x, y: panRef.current.y });
        }
      }
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
    };
  }, []);

  // Sync state and construct 3D meshes dynamically when plan edits happen
  useEffect(() => {
    build3DModel();
  }, [projectState]);

  const build3DModel = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Flush old model meshes (excluding grid / lights / base grounds)
    const objectsToRemove: THREE.Object3D[] = [];
    scene.children.forEach((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.name !== "ground" &&
        !(child instanceof THREE.GridHelper) &&
        !(child instanceof THREE.AmbientLight) &&
        !(child instanceof THREE.DirectionalLight)
      ) {
        objectsToRemove.push(child);
      }
    });
    objectsToRemove.forEach((obj) => scene.remove(obj));

    // Compile active elements counts
    setElementsCount({
      walls: projectState.walls.length,
      rooms: projectState.rooms.length,
      furniture: projectState.furniture.length,
      stairs: projectState.stairs.length,
    });

    // 2. Generate Rooms (as floor slabs with custom color washes)
    projectState.rooms.forEach((room) => {
      const layer = projectState.layers.find((l) => l.id === room.layerId);
      if (layer && !layer.isVisible) return;

      if (!room.points || room.points.length < 3) return;

      // Draw floor shape polygon
      const shape = new THREE.Shape();
      shape.moveTo(room.points[0].x, room.points[0].y);
      for (let i = 1; i < room.points.length; i++) {
        shape.lineTo(room.points[i].x, room.points[i].y);
      }
      shape.closePath();

      // Render slab
      const slabGeo = new THREE.ShapeGeometry(shape);
      const slabMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(room.color || "#cbd5e1"),
        side: THREE.DoubleSide,
        shininess: 30,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      // Elevate slab slightly above base floor to prevent Z-fighting
      slab.position.z = 0.5;
      slab.receiveShadow = true;
      scene.add(slab);
    });

    // 3. Generate Walls (Extrude 2D coordinates to 3D volumes)
    projectState.walls.forEach((wall) => {
      const layer = projectState.layers.find((l) => l.id === wall.layerId);
      if (layer && !layer.isVisible) return;

      const dx = wall.endX - wall.startX;
      const dy = wall.endY - wall.startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 2) return;

      const rotation = Math.atan2(dy, dx);
      const cx = (wall.startX + wall.endX) / 2;
      const cy = (wall.startY + wall.endY) / 2;

      // Default height coordinates are scaled (e.g., 280 = 2.8 meters)
      // Material assignment: Choose color based on structural attributes
      let wireColor = wall.color || (wall.type === "exterior" ? "#475569" : "#64748b");
      const wallMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(wireColor),
        shininess: 20,
      });

      // Box Geometry: Width = physical length, Height = wall thickness, Depth = height vertical
      const boxGeo = new THREE.BoxGeometry(length, wall.thickness, wall.height);
      const box = new THREE.Mesh(boxGeo, wallMat);

      // Positioning
      box.position.set(cx, cy, wall.height / 2);
      box.rotation.z = rotation;
      box.castShadow = true;
      box.receiveShadow = true;
      scene.add(box);
    });

    // 4. Generate Doors
    projectState.doors.forEach((door) => {
      const layer = projectState.layers.find((l) => l.id === door.layerId);
      if (layer && !layer.isVisible) return;

      // Render flat wood doors
      const doorGeo = new THREE.BoxGeometry(door.width, 8, door.height);
      const doorMat = new THREE.MeshPhongMaterial({ color: "#b45309", shininess: 40 });
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);

      doorMesh.position.set(door.startX, door.startY, door.height / 2);
      doorMesh.rotation.z = (door.angle * Math.PI) / 180;
      doorMesh.castShadow = true;
      scene.add(doorMesh);

      // Render swing curve guide below door
      const curveGeo = new THREE.RingGeometry(door.width - 2, door.width, 32, 1, 0, Math.PI / 2);
      const curveMat = new THREE.MeshBasicMaterial({ color: "#fbaf5d", side: THREE.DoubleSide });
      const curve = new THREE.Mesh(curveGeo, curveMat);
      curve.position.set(door.startX, door.startY, 1.2);
      if (door.swingDirection === "right") curve.scale.y = -1;
      curve.rotation.z = (door.angle * Math.PI) / 180;
      scene.add(curve);
    });

    // 5. Generate Windows
    projectState.windows.forEach((win) => {
      const layer = projectState.layers.find((l) => l.id === win.layerId);
      if (layer && !layer.isVisible) return;

      // Outer glass pane frame (timber/steel borders)
      const frameGeo = new THREE.BoxGeometry(win.width, 10, win.height);
      const frameMat = new THREE.MeshPhongMaterial({ color: "#e2e8f0", transparent: true, opacity: 0.5 });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.set(win.startX, win.startY, win.height / 2 + 50); // Sill height offset
      scene.add(frameMesh);

      // Interior window glass plane
      const glassGeo = new THREE.BoxGeometry(win.width - 8, 4, win.height - 8);
      const glassMat = new THREE.MeshPhongMaterial({
        color: "#38bdf8",
        shininess: 100,
        transparent: true,
        opacity: 0.6,
      });
      const glassMesh = new THREE.Mesh(glassGeo, glassMat);
      glassMesh.position.set(win.startX, win.startY, win.height / 2 + 50);
      scene.add(glassMesh);
    });

    // 6. Generate Stairs (Staggered cascading tiers)
    projectState.stairs.forEach((stair) => {
      const layer = projectState.layers.find((l) => l.id === stair.layerId);
      if (layer && !layer.isVisible) return;

      const stepsCount = stair.stepsCount || 10;
      const stepRise = 180 / stepsCount; // Standard stair riser max height sum
      const stepWidth = stair.width;
      const stepLength = stair.height / stepsCount;
      const rotationRad = (stair.rotation * Math.PI) / 180;

      for (let i = 0; i < stepsCount; i++) {
        const stepHeight = stepRise * (i + 1);
        const stairSecGeo = new THREE.BoxGeometry(stepWidth, stepLength, stepHeight);
        const stairSecMat = new THREE.MeshPhongMaterial({ color: "#a1a1aa", shininess: 10 });
        const stairSec = new THREE.Mesh(stairSecGeo, stairSecMat);

        // Position offset calculated along the cascading length
        const offsetLength = -stair.height / 2 + (i + 0.5) * stepLength;
        const localX = offsetLength * Math.sin(rotationRad);
        const localY = offsetLength * Math.cos(rotationRad);

        stairSec.position.set(stair.startX + localX, stair.startY + localY, stepHeight / 2);
        stairSec.rotation.z = -rotationRad;
        stairSec.castShadow = true;
        stairSec.receiveShadow = true;
        scene.add(stairSec);
      }
    });

    // 7. Generate Furniture Layout
    projectState.furniture.forEach((furn) => {
      const layer = projectState.layers.find((l) => l.id === furn.layerId);
      if (layer && !layer.isVisible) return;

      // Model customized shapes based on types
      const groupMat = new THREE.MeshPhongMaterial({ color: furn.color || "#64748b", shininess: 50 });
      const rotRad = (furn.rotation * Math.PI) / 180;

      if (furn.type === "bed") {
        // Bed mattress & cushion slab
        const mattressGeo = new THREE.BoxGeometry(furn.width, furn.height, 40);
        const bedMesh = new THREE.Mesh(mattressGeo, groupMat);
        bedMesh.position.set(furn.x + furn.width / 2, furn.y + furn.height / 2, 20);
        bedMesh.rotation.z = rotRad;
        bedMesh.castShadow = true;
        scene.add(bedMesh);

        // Rounded headboards
        const headGeo = new THREE.BoxGeometry(furn.width, 10, 60);
        const headMat = new THREE.MeshPhongMaterial({ color: "#475569" });
        const headboard = new THREE.Mesh(headGeo, headMat);
        headboard.position.set(furn.x + furn.width / 2, furn.y + 5, 30);
        headboard.rotation.z = rotRad;
        scene.add(headboard);
      } else if (furn.type === "sofa") {
        // Main sofa seat
        const sofaGeo = new THREE.BoxGeometry(furn.width, furn.height, 35);
        const sofaMesh = new THREE.Mesh(sofaGeo, groupMat);
        sofaMesh.position.set(furn.x + furn.width / 2, furn.y + furn.height / 2, 17.5);
        sofaMesh.rotation.z = rotRad;
        sofaMesh.castShadow = true;
        scene.add(sofaMesh);

        // Sofa backing board
        const backGeo = new THREE.BoxGeometry(furn.width, 12, 55);
        const backMat = new THREE.MeshPhongMaterial({ color: "#334155" });
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.set(furn.x + furn.width / 2, furn.y + 6, 27.5);
        back.rotation.z = rotRad;
        scene.add(back);
      } else if (furn.type === "table") {
        // Table dining top slab
        const topGeo = new THREE.BoxGeometry(furn.width, furn.height, 8);
        const tableMesh = new THREE.Mesh(topGeo, groupMat);
        tableMesh.position.set(furn.x + furn.width / 2, furn.y + furn.height / 2, 75);
        tableMesh.rotation.z = rotRad;
        tableMesh.castShadow = true;
        scene.add(tableMesh);

        // Standard 4 table legs corner cylinders
        const legGeo = new THREE.CylinderGeometry(4, 4, 75);
        const legPoints = [
          { dx: 10, dy: 10 },
          { dx: furn.width - 10, dy: 10 },
          { dx: 10, dy: furn.height - 10 },
          { dx: furn.width - 10, dy: furn.height - 10 },
        ];
        legPoints.forEach((pt) => {
          const leg = new THREE.Mesh(legGeo, groupMat);
          leg.rotation.x = Math.PI / 2;
          leg.position.set(furn.x + pt.dx, furn.y + pt.dy, 37.5);
          scene.add(leg);
        });
      } else {
        // Standard geometric volume shape
        const boxGeo = new THREE.BoxGeometry(furn.width, furn.height, 45);
        const block = new THREE.Mesh(boxGeo, groupMat);
        block.position.set(furn.x + furn.width / 2, furn.y + furn.height / 2, 22.5);
        block.rotation.z = rotRad;
        block.castShadow = true;
        scene.add(block);
      }
    });

    // 8. Generate Landscape assets (Trees, gardens, foliage overlays)
    projectState.landscape.forEach((land) => {
      const layer = projectState.layers.find((l) => l.id === land.layerId);
      if (layer && !layer.isVisible) return;

      if (land.type === "tree") {
        // Wood cedar trunk pillar
        const trunkGeo = new THREE.CylinderGeometry(8, 12, 100);
        const trunkMat = new THREE.MeshPhongMaterial({ color: "#78350f" });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.rotation.x = Math.PI / 2;
        trunk.position.set(land.x, land.y, 50);
        scene.add(trunk);

        // Spherical green leaves mesh grouping code
        const leavesGeo = new THREE.DodecahedronGeometry(land.width / 2, 1);
        const leavesMat = new THREE.MeshPhongMaterial({ color: land.color || "#15803d", shininess: 10 });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(land.x, land.y, 110);
        leaves.castShadow = true;
        scene.add(leaves);
      } else {
        // Flat block
        const slabGeo = new THREE.BoxGeometry(land.width, land.height, 5);
        const slabMat = new THREE.MeshPhongMaterial({ color: land.color || "#16a34a" });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.set(land.x, land.y, 2.5);
        slab.receiveShadow = true;
        scene.add(slab);
      }
    });
  };

  // Interaction handlers - Elegant local orbit & zoom bounds
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = e.button === 2 || e.shiftKey ? "pan" : "orbit";
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current === "none") return;

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current === "orbit") {
      // Rotate spherical yaw & boundaries on vertical pitch
      rotationRef.current.y += deltaX * 0.007;
      rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(0, rotationRef.current.x - deltaY * 0.007));
    } else if (isDraggingRef.current === "pan") {
      // Translate panning coordinates proportional to current camera zoom
      const zoomFactor = 1.0 / zoomRef.current;
      panRef.current.x -= deltaX * 0.9 * zoomFactor;
      panRef.current.y += deltaY * 0.9 * zoomFactor;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = "none";
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const isZoomMode = wheelMode === "zoom" || e.ctrlKey;
    if (isZoomMode) {
      zoomRef.current = Math.max(0.2, Math.min(4.0, zoomRef.current - e.deltaY * 0.0015));
    } else {
      // Pan/scroll up and down or left and right proportionally to current camera zoom
      const zoomFactor = 1.0 / zoomRef.current;
      panRef.current.x -= e.deltaX * 0.5 * zoomFactor;
      panRef.current.y += e.deltaY * 0.5 * zoomFactor;
    }
  };

  const resetCamera = () => {
    rotationRef.current = { x: -Math.PI / 4, y: -Math.PI / 4 };
    zoomRef.current = 1.0;
    panRef.current = { x: 0, y: 0 };
  };

  const adjustZoom = (direction: "in" | "out") => {
    if (direction === "in") {
      zoomRef.current = Math.min(4.0, zoomRef.current + 0.25);
    } else {
      zoomRef.current = Math.max(0.2, zoomRef.current - 0.25);
    }
  };

  const lookDirectTop = () => {
    rotationRef.current = { x: -Math.PI / 2 + 0.001, y: 0 };
    panRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-100 rounded-xl overflow-hidden select-none border border-slate-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Interactive Custom Scrollbars for 3D Viewport */}
      {/* Vertical Scrollbar */}
      <div className="absolute right-2.5 top-4 bottom-16 w-2.5 bg-slate-300/25 hover:bg-slate-300/40 rounded-full z-30 transition-all border border-slate-400/10 cursor-ns-resize">
        <div
          className="absolute left-[1.5px] right-[1.5px] bg-slate-700/50 hover:bg-slate-800 rounded-full cursor-grab active:cursor-grabbing transition-all min-h-[35px]"
          style={{
            top: `${Math.max(0, Math.min(85, ((-panVal.y + 1500) / 3000) * 85))}%`,
            height: "15%",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            isDraggingScrollY.current = true;
            startDragY.current = e.clientY;
            startPanY.current = panRef.current.y;
          }}
        />
      </div>

      {/* Horizontal Scrollbar */}
      <div className="absolute bottom-[54px] left-4 right-8 h-2.5 bg-slate-300/25 hover:bg-slate-300/40 rounded-full z-30 transition-all border border-slate-400/10 cursor-ew-resize">
        <div
          className="absolute top-[1.5px] bottom-[1.5px] bg-slate-700/50 hover:bg-slate-800 rounded-full cursor-grab active:cursor-grabbing transition-all min-w-[35px]"
          style={{
            left: `${Math.max(0, Math.min(85, ((-panVal.x + 1500) / 3000) * 85))}%`,
            width: "15%",
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            isDraggingScrollX.current = true;
            startDragX.current = e.clientX;
            startPanX.current = panRef.current.x;
          }}
        />
      </div>

      {/* Floating control bar */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 w-8 bg-white/95 backdrop-blur-md p-1 rounded-lg shadow-md border border-slate-200 z-35">
        <button
          onClick={resetCamera}
          title="Fit & Reset Orbit"
          className="w-6 h-6 hover:bg-slate-150 text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer p-0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={lookDirectTop}
          title="Top Plan View (orthogonal)"
          className="w-6 h-6 hover:bg-slate-150 text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer p-0"
        >
          <Compass className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 my-0.5" />
        <button
          onClick={() => adjustZoom("in")}
          title="Zoom In"
          className="w-6 h-6 hover:bg-slate-155 text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer p-0"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => adjustZoom("out")}
          title="Zoom Out"
          className="w-6 h-6 hover:bg-slate-155 text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer p-0"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setWheelMode((m) => (m === "zoom" ? "pan" : "zoom"))}
          title={wheelMode === "zoom" ? "Wheel is Zoom (Click to toggle Scroll style)" : "Wheel is Scroll (Click to toggle Zoom style)"}
          className={`w-6 h-6 rounded transition-colors flex items-center justify-center cursor-pointer ${
            wheelMode === "pan" ? "bg-indigo-600 text-white" : "hover:bg-slate-150 text-slate-700"
          }`}
        >
          <Move className="w-3.5 h-3.5 animate-none" />
        </button>

        {setIsFullscreen && (
          <>
            <div className="h-px bg-slate-200 my-0.5" />
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Fullscreen Focus" : "Enter Distraction-Free Fullscreen"}
              className="w-6 h-6 hover:bg-slate-150 text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-amber-600" />
              ) : (
                <Maximize2 className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Viewport helper overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-slate-900/90 backdrop-blur-md text-white py-2 px-4 rounded-xl text-xs font-mono shadow-md border border-slate-800">
        <div className="flex gap-4">
          <span>⚙️ WebGL Viewport</span>
          <span>Walls: <b className="text-emerald-400">{elementsCount.walls}</b></span>
          <span>Slabs: <b className="text-cyan-400">{elementsCount.rooms}</b></span>
          <span>Furniture: <b className="text-purple-400">{elementsCount.furniture}</b></span>
        </div>
        <div className="text-slate-400 hidden sm:block">
          Rotate: Drag | Scroll Wheel: <b className="text-amber-400 uppercase">{wheelMode}</b> | Arrow Keys: Scroll
        </div>
      </div>
    </div>
  );
}
