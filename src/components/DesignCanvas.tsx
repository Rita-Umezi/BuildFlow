/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Grid,
  Square,
  Compass,
  CornerRightDown,
  Trash2,
  BookOpen,
  MousePointer,
  PenTool,
  Pen,
  ChevronDown,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileImage,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Move,
} from "lucide-react";
import {
  ProjectState,
  Point,
  Wall,
  Door,
  Window,
  Stair,
  Room,
  SketchPath,
  Furniture,
  Landscape,
  Annotation,
  Dimension,
  ProjectComment,
  Layer,
} from "../types";

interface DesignCanvasProps {
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  selectedLayerId: string;
  gridSize: number; // in pixels (e.g. 10代表10cm, 50代表50cm, 100代表1m)
  snapToGrid: boolean;
  pencilWidth: number;
  pencilColor: string;
  pencilOpacity: number;
  onMouseCoordsChange?: (coords: { x: number; y: number } | null) => void;
  isFullscreen?: boolean;
  setIsFullscreen?: (val: boolean) => void;
}

export default function DesignCanvas({
  projectState,
  setProjectState,
  activeTool,
  setActiveTool,
  selectedObjectId,
  setSelectedObjectId,
  selectedLayerId,
  gridSize,
  snapToGrid,
  pencilWidth,
  pencilColor,
  pencilOpacity,
  onMouseCoordsChange,
  isFullscreen = false,
  setIsFullscreen,
}: DesignCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Pan & Zoom coordinate controls
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [wheelMode, setWheelMode] = useState<"zoom" | "pan">("pan"); // Default to panning as requested

  // Listen to keyboard Arrow keys for panning/scrolling
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

      const scrollStep = 50;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y + scrollStep }));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y - scrollStep }));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x + scrollStep }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x - scrollStep }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Persistent refs for scrollbar dragging
  const isDraggingScrollY = useRef(false);
  const startDragY = useRef(0);
  const startPanY = useRef(0);

  const isDraggingScrollX = useRef(false);
  const startDragX = useRef(0);
  const startPanX = useRef(0);

  // Sync scrollbar drag events with container size
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
      if (isDraggingScrollY.current && containerRef.current) {
        const deltaY = e.clientY - startDragY.current;
        const trackHeight = containerRef.current.clientHeight - 80;
        const panDelta = -deltaY * (3000 / trackHeight);
        setPan(p => ({
          ...p,
          y: Math.max(-1500, Math.min(1500, startPanY.current + panDelta))
        }));
      }
      if (isDraggingScrollX.current && containerRef.current) {
        const deltaX = e.clientX - startDragX.current;
        const trackWidth = containerRef.current.clientWidth - 80;
        const panDelta = -deltaX * (3000 / trackWidth);
        setPan(p => ({
          ...p,
          x: Math.max(-1500, Math.min(1500, startPanX.current + panDelta))
        }));
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

  // Drawing coordinates temporal tracking
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [tempEndPoint, setTempEndPoint] = useState<Point | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Layer tracing background image
  const [traceUrl, setTraceUrl] = useState("");
  const [traceOpacity, setTraceOpacity] = useState(0.3);
  const [showTraceInput, setShowTraceInput] = useState(false);

  // Active Placement selection configurations
  const [activeFurnitureType, setActiveFurnitureType] = useState<any>("sofa");
  const [activeLandscapeType, setActiveLandscapeType] = useState<any>("tree");
  const [activeStairType, setActiveStairType] = useState<any>("straight");

  // Multi-segment Room definition mode
  const [roomVertices, setRoomVertices] = useState<Point[]>([]);

  // Measurement Tool coordinates tracking
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Reset measurement state when activeTool shifts
  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasureStart(null);
      setMeasureEnd(null);
      setIsMeasuring(false);
    }
  }, [activeTool]);

  // Function to snap value to grid
  const snap = (val: number): number => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  // Convert raw screen viewport coordinates directly into pan-and-zoomed SVG coordinates
  const getSVGCoordinates = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Interaction: START layout drafting
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // If middle button drag or Space/Hand tool, start Panning
    if (e.button === 1 || activeTool === "pan") {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (e.button !== 0) return; // Right clicks ignored for orbit controls trigger

    const coords = getSVGCoordinates(e);
    const snapped = { x: snap(coords.x), y: snap(coords.y) };

    if (activeTool === "measure") {
      const startPoint = snapToGrid ? snapped : coords;
      if (!measureStart || !isMeasuring) {
        setMeasureStart(startPoint);
        setMeasureEnd(startPoint);
        setIsMeasuring(true);
      } else {
        setMeasureEnd(startPoint);
        setIsMeasuring(false);
      }
      return;
    }

    const selectedLayer = projectState.layers.find((l) => l.id === selectedLayerId);
    if (selectedLayer?.isLocked) return; // Layer locked boundary guard

    if (activeTool === "pencil" || activeTool === "pen") {
      setIsDrawing(true);
      setDrawingPoints([coords]);
      setTempEndPoint(coords);
    } else if (activeTool === "wall" || activeTool === "dimension") {
      setIsDrawing(true);
      // Anchor wall starting segment
      setDrawingPoints([snapped]);
      setTempEndPoint(snapped);
    } else if (activeTool === "shape") {
      setIsDrawing(true);
      setDrawingPoints([snapped]);
      setTempEndPoint(snapped);
    } else if (activeTool === "room") {
      // Create room boundaries via individual point clicks
      const updatedVertices = [...roomVertices, snapped];
      setRoomVertices(updatedVertices);
      if (updatedVertices.length >= 4) {
        // Automatically save room when four vertices are mapped
        const newRoomId = `room-${Math.random().toString(36).substr(2, 9)}`;
        const newRoom: Room = {
          id: newRoomId,
          name: `Room Area ${projectState.rooms.length + 1}`,
          type: "living",
          points: updatedVertices,
          color: "#cbd5e1",
          layerId: selectedLayerId,
        };
        setProjectState((prev) => ({
          ...prev,
          rooms: [...prev.rooms, newRoom],
        }));
        setRoomVertices([]);
      }
    } else if (activeTool === "door") {
      // Place door template
      const doorId = `door-${Math.random().toString(36).substr(2, 9)}`;
      const newDoor: Door = {
        id: doorId,
        startX: snapped.x,
        startY: snapped.y,
        width: 90,
        height: 210,
        type: "single",
        swingDirection: "inside",
        angle: 0,
        materialId: "wood",
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        doors: [...prev.doors, newDoor],
      }));
      setSelectedObjectId(doorId);
      setActiveTool("select");
    } else if (activeTool === "window") {
      // Place Window template
      const winId = `win-${Math.random().toString(36).substr(2, 9)}`;
      const newWin: Window = {
        id: winId,
        startX: snapped.x,
        startY: snapped.y,
        width: 80,
        height: 120,
        type: "sliding",
        materialId: "glass",
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        windows: [...prev.windows, newWin],
      }));
      setSelectedObjectId(winId);
      setActiveTool("select");
    } else if (activeTool === "stair") {
      const stairId = `stair-${Math.random().toString(36).substr(2, 9)}`;
      const newStair: Stair = {
        id: stairId,
        startX: snapped.x,
        startY: snapped.y,
        width: 80,
        height: 160,
        type: activeStairType,
        stepsCount: 12,
        stepDepth: 25,
        rotation: 0,
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        stairs: [...prev.stairs, newStair],
      }));
      setSelectedObjectId(stairId);
      setActiveTool("select");
    } else if (activeTool === "furniture") {
      const furnId = `furn-${Math.random().toString(36).substr(2, 9)}`;
      // Assign dimensions based on categories
      let w = 80,
        h = 80;
      if (activeFurnitureType === "bed") {
        w = 120;
        h = 130;
      } else if (activeFurnitureType === "sofa") {
        w = 140;
        h = 80;
      } else if (activeFurnitureType === "table") {
        w = 100;
        h = 100;
      }
      const newFurn: Furniture = {
        id: furnId,
        name: `Premium ${activeFurnitureType.toUpperCase()}`,
        type: activeFurnitureType,
        x: snapped.x - w / 2,
        y: snapped.y - h / 2,
        width: w,
        height: h,
        rotation: 0,
        color: "#64748b",
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        furniture: [...prev.furniture, newFurn],
      }));
      setSelectedObjectId(furnId);
      setActiveTool("select");
    } else if (activeTool === "landscape") {
      const landId = `land-${Math.random().toString(36).substr(2, 9)}`;
      const newLand: Landscape = {
        id: landId,
        name: `Landscape ${activeLandscapeType.toUpperCase()}`,
        type: activeLandscapeType,
        x: snapped.x,
        y: snapped.y,
        width: activeLandscapeType === "tree" ? 60 : 150,
        height: activeLandscapeType === "tree" ? 60 : 40,
        rotation: 0,
        color: activeLandscapeType === "tree" ? "#15803d" : "#22c55e",
        layerId: "layer-landscape",
      };
      setProjectState((prev) => ({
        ...prev,
        landscape: [...prev.landscape, newLand],
      }));
      setSelectedObjectId(landId);
      setActiveTool("select");
    } else if (activeTool === "comment") {
      const commentId = `comment-${Math.random().toString(36).substr(2, 9)}`;
      const newComment: ProjectComment = {
        id: commentId,
        x: coords.x,
        y: coords.y,
        author: "Drafting Lead",
        text: "Verify door boundaries match clear spans.",
        timestamp: "Now",
        isResolved: false,
        replies: [],
      };
      setProjectState((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment],
      }));
      setSelectedObjectId(commentId);
      setActiveTool("select");
    } else if (activeTool === "select") {
      // Clear selections if clicked on open grid floor
      setSelectedObjectId(null);
    }
  };

  // Interaction: PROCESS coordinates update with active cursor tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSVGCoordinates(e);
    if (onMouseCoordsChange) {
      onMouseCoordsChange(coords);
    }

    if (activeTool === "measure" && isMeasuring && measureStart) {
      const snapped = { x: snap(coords.x), y: snap(coords.y) };
      setMeasureEnd(snapToGrid ? snapped : coords);
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    if (!isDrawing) return;

    const snapped = { x: snap(coords.x), y: snap(coords.y) };

    if (activeTool === "pencil" || activeTool === "pen") {
      setDrawingPoints((prev) => [...prev, coords]);
    } else if (activeTool === "wall" || activeTool === "dimension" || activeTool === "shape") {
      setTempEndPoint(snapped);
    }
  };

  // Interaction: COMPLETE layout elements saving
  const handleMouseUp = () => {
    if (activeTool === "measure") {
      if (measureStart && isMeasuring && measureEnd) {
        const dist = Math.sqrt((measureEnd.x - measureStart.x) ** 2 + (measureEnd.y - measureStart.y) ** 2);
        if (dist > 10) {
          setIsMeasuring(false);
        }
      }
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (drawingPoints.length === 0) return;

    if (activeTool === "pencil" || activeTool === "pen") {
      const sketchId = `sk-${Math.random().toString(36).substr(2, 9)}`;
      const newSketch: SketchPath = {
        id: sketchId,
        points: drawingPoints,
        strokeWidth: pencilWidth,
        strokeColor: pencilColor,
        opacity: pencilOpacity,
        mode: activeTool as any,
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        sketches: [...prev.sketches, newSketch],
      }));
    } else if (activeTool === "wall" && tempEndPoint) {
      const start = drawingPoints[0];
      // Prevent creating zero-length walls accidentally
      const dist = Math.sqrt((tempEndPoint.x - start.x) ** 2 + (tempEndPoint.y - start.y) ** 2);
      if (dist > 15) {
        const wallId = `wall-${Math.random().toString(36).substr(2, 9)}`;
        const newWall: Wall = {
          id: wallId,
          startX: start.x,
          startY: start.y,
          endX: tempEndPoint.x,
          endY: tempEndPoint.y,
          type: "exterior",
          thickness: 20,
          height: 280,
          materialId: "concrete",
          color: "#475569",
          layerId: selectedLayerId,
        };
        setProjectState((prev) => ({
          ...prev,
          walls: [...prev.walls, newWall],
        }));
        setSelectedObjectId(wallId);
      }
    } else if (activeTool === "dimension" && tempEndPoint) {
      const start = drawingPoints[0];
      const dist = Math.sqrt((tempEndPoint.x - start.x) ** 2 + (tempEndPoint.y - start.y) ** 2);
      const distMetres = (dist / 100).toFixed(1); // 100px mapped to 1m
      const dimId = `dim-${Math.random().toString(36).substr(2, 9)}`;
      const newDim: Dimension = {
        id: dimId,
        startX: start.x,
        startY: start.y,
        endX: tempEndPoint.x,
        endY: tempEndPoint.y,
        text: `${distMetres} m`,
        type: "manual",
      };
      setProjectState((prev) => ({
        ...prev,
        dimensions: [...prev.dimensions, newDim],
      }));
    } else if (activeTool === "shape" && tempEndPoint) {
      const start = drawingPoints[0];
      const sketchId = `shape-${Math.random().toString(36).substr(2, 9)}`;
      const newShape: SketchPath = {
        id: sketchId,
        points: [start, tempEndPoint],
        strokeWidth: pencilWidth,
        strokeColor: pencilColor,
        opacity: pencilOpacity,
        mode: "shape",
        shapeType: "rectangle",
        layerId: selectedLayerId,
      };
      setProjectState((prev) => ({
        ...prev,
        sketches: [...prev.sketches, newShape],
      }));
    }

    setDrawingPoints([]);
    setTempEndPoint(null);
  };

  // Zoom control helpers
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.15));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, z - 0.15));
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const isZoomMode = wheelMode === "zoom" || e.ctrlKey;
    if (isZoomMode) {
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      setZoom((z) => Math.max(0.4, Math.min(3.0, z * zoomFactor)));
    } else {
      // Pan/scroll based on wheel movement delta
      const sensitivity = 0.8;
      setPan((p) => ({
        x: p.x - e.deltaX * sensitivity,
        y: p.y - e.deltaY * sensitivity,
      }));
    }
  };
  const autoFocusHome = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Room area computations
  const calculateRoomProperties = (points: Point[]) => {
    if (!points || points.length < 3) return { area: 0, perimeter: 0 };
    // Shoelace theorem for area
    let areaSum = 0;
    let perimeterSum = 0;
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      areaSum += points[i].x * next.y - next.x * points[i].y;
      perimeterSum += Math.sqrt((next.x - points[i].x) ** 2 + (next.y - points[i].y) ** 2);
    }
    // Convert 100px => 1m, so area scale is 1/10000
    const m2Area = Math.abs(areaSum) / 20000;
    const mPerimeter = perimeterSum / 100;
    return {
      area: m2Area.toFixed(1),
      perimeter: mPerimeter.toFixed(1),
    };
  };

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Dynamic Sub-toolbar selection options */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-wrap gap-2 z-10">
        <div className="flex items-center gap-2">
          {activeTool === "furniture" && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {["sofa", "bed", "table", "chair", "cabinet"].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveFurnitureType(type as any)}
                  className={`text-[10px] px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    activeFurnitureType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {activeTool === "landscape" && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {["tree", "grass", "fence", "road"].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveLandscapeType(type as any)}
                  className={`text-[10px] px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    activeLandscapeType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {activeTool === "stair" && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              {["straight", "L-shaped", "U-shaped", "spiral"].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveStairType(type as any)}
                  className={`text-[10px] px-2.5 py-1 rounded-md capitalize font-medium transition-colors ${
                    activeStairType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {activeTool === "room" && (
            <div className="text-xs text-indigo-600 bg-indigo-50 font-medium py-1 px-2.5 rounded-lg border border-indigo-100">
              {roomVertices.length === 0
                ? "Click 4 outer bounds corners on the plan to close & calculate Room Area..."
                : `Mapped corners: ${roomVertices.length}/4`}
            </div>
          )}

          {activeTool === "pencil" && (
            <div className="flex items-center gap-3 text-xs text-slate-500 px-3">
              <span>Opacity: <b>{Math.round(pencilOpacity * 100)}%</b></span>
              <span>Thickness: <b>{pencilWidth}px</b></span>
            </div>
          )}
        </div>

        {/* Tracing overlays */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTraceInput(!showTraceInput)}
            className={`flex items-center gap-1 text-[11px] font-medium py-1 px-2.5 rounded-lg border transition-colors ${
              traceUrl ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            Tracing Layer {traceUrl ? "(Active)" : ""}
          </button>

          {showTraceInput && (
            <div className="absolute right-4 top-14 bg-white p-3 rounded-xl shadow-lg border border-slate-200 flex flex-col gap-2 z-50 w-72">
              <span className="text-[11px] font-semibold text-slate-700">Enter Reference Sketch URL:</span>
              <input
                type="text"
                value={traceUrl}
                onChange={(e) => setTraceUrl(e.target.value)}
                placeholder="https://example.com/drawing.jpg"
                className="text-xs p-2 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {traceUrl && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] text-slate-500 flex justify-between">
                    <span>Alpha level:</span>
                    <span>{Math.round(traceOpacity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={traceOpacity}
                    onChange={(e) => setTraceOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <button
                  onClick={() => setTraceUrl("")}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Clear Background
                </button>
                <button
                  onClick={() => setShowTraceInput(false)}
                  className="bg-slate-900 text-white text-[10px] font-medium py-1 px-2.5 rounded hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Workspace viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
        onWheel={handleWheel}
      >
        <svg
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (onMouseCoordsChange) onMouseCoordsChange(null);
          }}
        >
          {/* Pan & Zoom applied transform group */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Background Trace Image Under the grid lines! */}
            {traceUrl && (
              <image
                href={traceUrl}
                opacity={traceOpacity}
                width={1200}
                height={900}
                x={0}
                y={0}
                preserveAspectRatio="xMidYMid meet"
              />
            )}

            {/* Grid helper gridlines */}
            <defs>
              <pattern
                id="minor-grid"
                width={gridSize}
                height={gridSize}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern
                id="major-grid"
                width={gridSize * 10}
                height={gridSize * 10}
                patternUnits="userSpaceOnUse"
              >
                <rect width={gridSize * 10} height={gridSize * 10} fill="url(#minor-grid)" />
                <path
                  d={`M ${gridSize * 10} 0 L 0 0 0 ${gridSize * 10}`}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                />
              </pattern>

              {/* Physical Architecture Texture Stamp Fills */}
              <pattern id="pattern_rough" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#000000" opacity="0.18" />
                <circle cx="8" cy="8" r="1.5" fill="#000000" opacity="0.18" />
                <circle cx="5" cy="4" r="0.8" fill="#000000" opacity="0.1" />
              </pattern>

              <pattern id="pattern_brick" width="24" height="16" patternUnits="userSpaceOnUse">
                <path
                  d="M0,0 L24,0 M0,8 L24,8 M0,0 L0,8 M12,8 L12,16 M24,0 L24,8"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="0.85"
                  opacity="0.25"
                />
              </pattern>

              <pattern id="pattern_grain" width="35" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M0,3 C10,1 25,5 35,3 M0,7 C12,5 22,9 35,7"
                  fill="none"
                  stroke="#451a03"
                  strokeWidth="0.7"
                  opacity="0.22"
                />
              </pattern>

              <pattern id="pattern_glossy" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M0,40 L40,0"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="6"
                  opacity="0.12"
                />
                <path
                  d="M-10,10 L10,-10 M30,50 L50,30"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.12"
                />
              </pattern>
            </defs>
            {/* Infinite floor grids */}
            <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#major-grid)" opacity={0.65} />

            {/* Render Defined Room Slabs */}
            {projectState.rooms.map((room) => {
              const layer = projectState.layers.find((l) => l.id === room.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === room.id;
              const pathDef = room.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
              const props = calculateRoomProperties(room.points);

              return (
                <g key={room.id} onClick={(e) => { e.stopPropagation(); setSelectedObjectId(room.id); }}>
                  <path
                    d={pathDef}
                    fill={room.color || "#e2e8f1"}
                    fillOpacity={0.65}
                    stroke={isSelected ? "#6366f1" : "#94a3b8"}
                    strokeWidth={isSelected ? 2.5 : 1}
                    className="cursor-pointer hover:fill-opacity-80 transition-all"
                  />
                  {/* Label Room metrics */}
                  <text
                    x={room.points[0].x + 30}
                    y={room.points[0].y + 35}
                    className="font-sans text-[10px] font-bold text-slate-800 select-none pointer-events-none fill-slate-800"
                  >
                    {room.name}
                  </text>
                  <text
                    x={room.points[0].x + 30}
                    y={room.points[0].y + 48}
                    className="font-mono text-[9px] text-slate-500 select-none pointer-events-none fill-slate-700"
                  >
                    {props.area} m² | P: {props.perimeter} m
                  </text>
                </g>
              );
            })}

            {/* Room Vertices currently being drafted line lines */}
            {roomVertices.length > 0 && (
              <g>
                {roomVertices.map((v, idx) => (
                  <circle key={idx} cx={v.x} cy={v.y} r={5} fill="#4f46e5" />
                ))}
                {roomVertices.map((v, idx) => {
                  const next = roomVertices[idx + 1];
                  if (!next) return null;
                  return (
                    <line
                      key={idx}
                      x1={v.x}
                      y1={v.y}
                      x2={next.x}
                      y2={next.y}
                      stroke="#4f46e5"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  );
                })}
              </g>
            )}

            {/* Render Sketch Freehand & Anchor Paths */}
            {projectState.sketches.map((path) => {
              const layer = projectState.layers.find((l) => l.id === path.layerId);
              if (layer && !layer.isVisible) return null;

              if (path.points.length < 2) return null;
              const isSelected = selectedObjectId === path.id;

              if (path.mode === "pencil" || path.mode === "pen") {
                const drawDef = path.points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
                return (
                  <path
                    key={path.id}
                    d={drawDef}
                    fill="none"
                    stroke={path.strokeColor}
                    strokeWidth={path.strokeWidth}
                    opacity={path.opacity}
                    className="cursor-pointer"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onClick={(e) => { e.stopPropagation(); setSelectedObjectId(path.id); }}
                  />
                );
              } else if (path.mode === "shape") {
                // Rectangle shape boundaries
                const p1 = path.points[0];
                const p2 = path.points[1];
                const xw = Math.abs(p2.x - p1.x);
                const yh = Math.abs(p2.y - p1.y);
                const rx = Math.min(p1.x, p2.x);
                const ry = Math.min(p1.y, p2.y);
                return (
                  <rect
                    key={path.id}
                    x={rx}
                    y={ry}
                    width={xw}
                    height={yh}
                    fill="none"
                    stroke={path.strokeColor}
                    strokeWidth={path.strokeWidth}
                    opacity={path.opacity}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedObjectId(path.id); }}
                  />
                );
              }
              return null;
            })}

            {/* Render Wall Rectangles layout */}
            {projectState.walls.map((wall) => {
              const layer = projectState.layers.find((l) => l.id === wall.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === wall.id;
              
              // Custom texture mapping overlay
              const textureId = (() => {
                if (wall.materialId === "brick" || wall.materialId === "bricks") return "pattern_brick";
                if (wall.materialId === "wood") return "pattern_grain";
                if (wall.materialId === "concrete" || wall.materialId === "granite" || wall.materialId === "rough") return "pattern_rough";
                if (wall.materialId === "glass" || wall.materialId === "polished" || wall.materialId === "glossy") return "pattern_glossy";
                return null;
              })();

              return (
                <g key={wall.id} onClick={(e) => { e.stopPropagation(); setSelectedObjectId(wall.id); }}>
                  {/* Base solid color background */}
                  <line
                    x1={wall.startX}
                    y1={wall.startY}
                    x2={wall.endX}
                    y2={wall.endY}
                    stroke={wall.color || "#475569"}
                    strokeWidth={wall.thickness}
                    className="cursor-pointer hover:stroke-slate-900 transition-colors"
                  />
                  
                  {/* Texture Pattern overlay */}
                  {textureId && (
                    <line
                      x1={wall.startX}
                      y1={wall.startY}
                      x2={wall.endX}
                      y2={wall.endY}
                      stroke={`url(#${textureId})`}
                      strokeWidth={wall.thickness}
                      className="pointer-events-none"
                    />
                  )}

                  {/* Active Selection Outline */}
                  {isSelected && (
                    <line
                      x1={wall.startX}
                      y1={wall.startY}
                      x2={wall.endX}
                      y2={wall.endY}
                      stroke="#4f46e5"
                      strokeWidth={wall.thickness + 4}
                      strokeLinecap="round"
                      opacity={0.3}
                      className="pointer-events-none"
                    />
                  )}

                  {/* Length Label */}
                  <text
                    x={(wall.startX + wall.endX) / 2}
                    y={(wall.startY + wall.endY) / 2 - 8}
                    className="font-mono text-[9px] fill-slate-700 font-medium select-none pointer-events-none"
                    textAnchor="middle"
                  >
                    {(Math.sqrt((wall.endX - wall.startX) ** 2 + (wall.endY - wall.startY) ** 2) / 100).toFixed(2)}m
                  </text>
                </g>
              );
            })}

            {/* Render Doors */}
            {projectState.doors.map((door) => {
              const layer = projectState.layers.find((l) => l.id === door.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === door.id;
              const angleRad = (door.angle * Math.PI) / 180;
              const endX = door.startX + door.width * Math.cos(angleRad);
              const endY = door.startY + door.width * Math.sin(angleRad);

              return (
                <g
                  key={door.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId(door.id); }}
                  className="cursor-pointer"
                >
                  {/* Door Leaf line */}
                  <line
                    x1={door.startX}
                    y1={door.startY}
                    x2={endX}
                    y2={endY}
                    stroke={isSelected ? "#4f46e5" : "#b45309"}
                    strokeWidth={4}
                  />
                  {/* Door frame block */}
                  <circle cx={door.startX} cy={door.startY} r={4} fill="#b45309" />
                  {/* Swing arc guide */}
                  <path
                    d={`M ${endX} ${endY} A ${door.width} ${door.width} 0 0 ${door.swingDirection === "right" ? 0 : 1} ${door.startX} ${door.startY}`}
                    fill="none"
                    stroke="#fbaf5d"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                </g>
              );
            })}

            {/* Render Windows */}
            {projectState.windows.map((win) => {
              const layer = projectState.layers.find((l) => l.id === win.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === win.id;
              return (
                <g
                  key={win.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId(win.id); }}
                  className="cursor-pointer"
                >
                  {/* Double line window */}
                  <rect
                    x={win.startX - win.width / 2}
                    y={win.startY - 6}
                    width={win.width}
                    height={12}
                    fill="#e0f2fe"
                    stroke={isSelected ? "#4f46e5" : "#0284c7"}
                    strokeWidth={1.5}
                  />
                  <line
                    x1={win.startX - win.width / 2}
                    y1={win.startY}
                    x2={win.startX + win.width / 2}
                    y2={win.startY}
                    stroke="#0284c7"
                    strokeWidth={1}
                  />
                </g>
              );
            })}

            {/* Render Stairs (drawn as zebra treads list) */}
            {projectState.stairs.map((stair) => {
              const layer = projectState.layers.find((l) => l.id === stair.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === stair.id;
              return (
                <g
                  key={stair.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId(stair.id); }}
                  className="cursor-pointer"
                  transform={`translate(${stair.startX}, ${stair.startY}) rotate(${stair.rotation})`}
                >
                  <rect
                    x={-stair.width / 2}
                    y={-stair.height / 2}
                    width={stair.width}
                    height={stair.height}
                    fill="#f3f4f6"
                    stroke={isSelected ? "#4f46e5" : "#71717a"}
                    strokeWidth={1.5}
                  />
                  {/* Drawing riser divisions */}
                  {Array.from({ length: stair.stepsCount }).map((_, idx) => {
                    const stepY = -stair.height / 2 + (stair.height / stair.stepsCount) * idx;
                    return (
                      <line
                        key={idx}
                        x1={-stair.width / 2}
                        y1={stepY}
                        x2={stair.width / 2}
                        y2={stepY}
                        stroke="#71717a"
                        strokeWidth={0.8}
                      />
                    );
                  })}
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    className="font-sans text-[8px] fill-slate-500 font-bold select-none pointer-events-none"
                  >
                    UP ↗
                  </text>
                </g>
              );
            })}

            {/* Render Furniture layout boxes */}
            {projectState.furniture.map((furn) => {
              const layer = projectState.layers.find((l) => l.id === furn.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === furn.id;

              const textureId = (() => {
                if (furn.materialId === "brick" || furn.materialId === "bricks") return "pattern_brick";
                if (furn.materialId === "wood") return "pattern_grain";
                if (furn.materialId === "concrete" || furn.materialId === "granite" || furn.materialId === "rough") return "pattern_rough";
                if (furn.materialId === "glass" || furn.materialId === "polished" || furn.materialId === "glossy") return "pattern_glossy";
                return null;
              })();

              return (
                <g
                  key={furn.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId(furn.id); }}
                  className="cursor-pointer"
                  transform={`translate(${furn.x + furn.width / 2}, ${furn.y + furn.height / 2}) rotate(${furn.rotation})`}
                >
                  {/* Base solid background */}
                  <rect
                    x={-furn.width / 2}
                    y={-furn.height / 2}
                    width={furn.width}
                    height={furn.height}
                    rx={4}
                    fill={furn.color || "#e2e8f0"}
                    stroke={isSelected ? "#4f46e5" : "#64748b"}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />

                  {/* Optional Material texture stamp fill overlay */}
                  {textureId && (
                    <rect
                      x={-furn.width / 2}
                      y={-furn.height / 2}
                      width={furn.width}
                      height={furn.height}
                      rx={4}
                      fill={`url(#${textureId})`}
                      className="pointer-events-none"
                    />
                  )}

                  <text
                    x={0}
                    y={3}
                    textAnchor="middle"
                    className="font-sans text-[9px] fill-slate-700 font-bold select-none pointer-events-none"
                  >
                    {furn.name}
                  </text>
                </g>
              );
            })}

            {/* Render Landscape elements */}
            {projectState.landscape.map((land) => {
              const layer = projectState.layers.find((l) => l.id === land.layerId);
              if (layer && !layer.isVisible) return null;

              const isSelected = selectedObjectId === land.id;
              if (land.type === "tree") {
                return (
                  <g
                    key={land.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedObjectId(land.id); }}
                    className="cursor-pointer shadow-md"
                  >
                    <circle
                      cx={land.x}
                      cy={land.y}
                      r={land.width / 2}
                      fill={land.color || "#16a34a"}
                      fillOpacity={0.7}
                      stroke={isSelected ? "#4f46e5" : "#14532d"}
                      strokeWidth={1.5}
                    />
                    <circle cx={land.x} cy={land.y} r={land.width / 4} fill="#14532d" fillOpacity={0.4} />
                    <text
                      x={land.x}
                      y={land.y + 3}
                      textAnchor="middle"
                      className="font-mono text-[8px] fill-white select-none pointer-events-none font-bold"
                    >
                      🌳
                    </text>
                  </g>
                );
              } else {
                return (
                  <rect
                    key={land.id}
                    x={land.x - land.width / 2}
                    y={land.y - land.height / 2}
                    width={land.width}
                    height={land.height}
                    fill={land.color || "#86efac"}
                    fillOpacity={0.4}
                    stroke={isSelected ? "#4f46e5" : "#22c55e"}
                    strokeWidth={1}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedObjectId(land.id); }}
                  />
                );
              }
            })}

            {/* Render Dimensions */}
            {projectState.dimensions.map((dim) => {
              const isSelected = selectedObjectId === dim.id;
              return (
                <g key={dim.id} onClick={(e) => { e.stopPropagation(); setSelectedObjectId(dim.id); }} className="cursor-pointer">
                  {/* Dimension line */}
                  <line
                    x1={dim.startX}
                    y1={dim.startY}
                    x2={dim.endX}
                    y2={dim.endY}
                    stroke="#e11d48"
                    strokeWidth={1.2}
                    strokeDasharray="4 4"
                  />
                  {/* Tick endcaps */}
                  <line
                    x1={dim.startX - 5}
                    y1={dim.startY - 5}
                    x2={dim.startX + 5}
                    y2={dim.startY + 5}
                    stroke="#e11d48"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={dim.endX - 5}
                    y1={dim.endY - 5}
                    x2={dim.endX + 5}
                    y2={dim.endY + 5}
                    stroke="#e11d48"
                    strokeWidth={1.5}
                  />
                  {/* Dimension read text backer */}
                  <rect
                    x={(dim.startX + dim.endX) / 2 - 25}
                    y={(dim.startY + dim.endY) / 2 - 8}
                    width={50}
                    height={14}
                    rx={3}
                    fill="#fff"
                    stroke="#e11d48"
                    strokeWidth={0.5}
                  />
                  <text
                    x={(dim.startX + dim.endX) / 2}
                    y={(dim.startY + dim.endY) / 2 + 2}
                    textAnchor="middle"
                    className="font-mono text-[9px] fill-rose-600 font-bold select-none pointer-events-none"
                  >
                    {dim.text}
                  </text>
                </g>
              );
            })}

            {/* Render Pins Review Comments */}
            {projectState.comments.map((comment) => {
              const isSelected = selectedObjectId === comment.id;
              return (
                <g
                  key={comment.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedObjectId(comment.id); }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={comment.x}
                    cy={comment.y}
                    r={10}
                    fill={comment.isResolved ? "#10b981" : "#f43f5e"}
                    stroke="#fff"
                    strokeWidth={2}
                    className="shadow-lg hover:scale-110 transition-transform"
                  />
                  <text
                    x={comment.x}
                    y={comment.y + 3}
                    textAnchor="middle"
                    className="font-mono text-[8px] fill-white font-bold select-none pointer-events-none"
                  >
                    C
                  </text>
                </g>
              );
            })}

            {/* User Pointer presence cursors simulation */}
            <g opacity={0.85}>
              <circle cx={250} cy={180} r={5} fill="#4f46e5" />
              <text x={260} y={184} className="font-sans text-[8px] font-bold fill-slate-750">
                Sarah (Engineer)
              </text>
              <line x1={250} y1={180} x2={210} y2={190} stroke="#4f46e5" strokeWidth={0.5} strokeDasharray="2 2" />
            </g>
            <g opacity={0.65}>
              <circle cx={480} cy={350} r={5} fill="#e11d48" />
              <text x={490} y={354} className="font-sans text-[8px] font-bold fill-slate-700">
                Mark (Client)
              </text>
            </g>

            {/* Render active dragging element guidelines */}
            {/* Render active freehand drawing path preview */}
            {isDrawing && (activeTool === "pencil" || activeTool === "pen") && drawingPoints.length >= 2 && (
              <path
                d={drawingPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
                fill="none"
                stroke={pencilColor}
                strokeWidth={pencilWidth}
                opacity={pencilOpacity}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Render active dragging shape preview */}
            {isDrawing && tempEndPoint && activeTool === "shape" && (
              <rect
                x={Math.min(drawingPoints[0].x, tempEndPoint.x)}
                y={Math.min(drawingPoints[0].y, tempEndPoint.y)}
                width={Math.abs(tempEndPoint.x - drawingPoints[0].x)}
                height={Math.abs(tempEndPoint.y - drawingPoints[0].y)}
                fill="none"
                stroke={pencilColor}
                strokeWidth={pencilWidth}
                opacity={pencilOpacity}
                strokeDasharray="4 4"
              />
            )}

            {/* Render active wall drawing design preview */}
            {isDrawing && tempEndPoint && activeTool === "wall" && (
              <line
                x1={drawingPoints[0].x}
                y1={drawingPoints[0].y}
                x2={tempEndPoint.x}
                y2={tempEndPoint.y}
                stroke="#475569"
                strokeWidth={20}
                opacity={0.5}
              />
            )}

            {/* Render active manual dimension tool drawing preview */}
            {isDrawing && tempEndPoint && activeTool === "dimension" && (
              <g>
                <line
                  x1={drawingPoints[0].x}
                  y1={drawingPoints[0].y}
                  x2={tempEndPoint.x}
                  y2={tempEndPoint.y}
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <circle cx={drawingPoints[0].x} cy={drawingPoints[0].y} r={3} fill="#ef4444" />
                <circle cx={tempEndPoint.x} cy={tempEndPoint.y} r={3} fill="#ef4444" />
                <text
                  x={(drawingPoints[0].x + tempEndPoint.x) / 2}
                  y={(drawingPoints[0].y + tempEndPoint.y) / 2 - 8}
                  textAnchor="middle"
                  className="font-mono text-[10px] font-bold fill-red-500 select-none pointer-events-none"
                >
                  {(Math.sqrt((tempEndPoint.x - drawingPoints[0].x)**2 + (tempEndPoint.y - drawingPoints[0].y)**2) / 100).toFixed(1)} m
                </text>
              </g>
            )}

            {/* Render fallback general guidelines */}
            {isDrawing && tempEndPoint && activeTool !== "pencil" && activeTool !== "pen" && activeTool !== "shape" && activeTool !== "wall" && activeTool !== "dimension" && activeTool !== "measure" && (
              <line
                x1={drawingPoints[0].x}
                y1={drawingPoints[0].y}
                x2={tempEndPoint.x}
                y2={tempEndPoint.y}
                stroke="#6366f1"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}

            {/* Render Measurement Tool Guide Line */}
            {measureStart && measureEnd && (
              <g>
                {/* Connection Line */}
                <line
                  x1={measureStart.x}
                  y1={measureStart.y}
                  x2={measureEnd.x}
                  y2={measureEnd.y}
                  stroke="#06b6d4"
                  strokeWidth={2}
                  strokeDasharray={isMeasuring ? "4 4" : "none"}
                  className="animate-pulse"
                />
                
                {/* Crosshair anchors at start & end */}
                <g stroke="#06b6d4" strokeWidth={1.5}>
                  {/* Start Point Crosshair */}
                  <line x1={measureStart.x - 7} y1={measureStart.y} x2={measureStart.x + 7} y2={measureStart.y} />
                  <line x1={measureStart.x} y1={measureStart.y - 7} x2={measureStart.x} y2={measureStart.y + 7} />
                  <circle cx={measureStart.x} cy={measureStart.y} r={3} fill="none" stroke="#06b6d4" strokeWidth={1} />

                  {/* End Point Crosshair */}
                  <line x1={measureEnd.x - 7} y1={measureEnd.y} x2={measureEnd.x + 7} y2={measureEnd.y} />
                  <line x1={measureEnd.x} y1={measureEnd.y - 7} x2={measureEnd.x} y2={measureEnd.y + 7} />
                  <circle cx={measureEnd.x} cy={measureEnd.y} r={3} fill="none" stroke="#06b6d4" strokeWidth={1} />
                </g>

                {/* Badge Container */}
                {(() => {
                  const dx = measureEnd.x - measureStart.x;
                  const dy = measureEnd.y - measureStart.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const distMetres = (dist / 100).toFixed(2);
                  const dxMetres = (Math.abs(dx) / 100).toFixed(2);
                  const dyMetres = (Math.abs(dy) / 100).toFixed(2);
                  const centerX = (measureStart.x + measureEnd.x) / 2;
                  const centerY = (measureStart.y + measureEnd.y) / 2;
                  
                  return (
                    <g className="select-none pointer-events-none">
                      {/* background card */}
                      <rect
                        x={centerX - 70}
                        y={centerY - 22}
                        width={140}
                        height={40}
                        rx={4}
                        fill="#083344"
                        stroke="#22d3ee"
                        strokeWidth={1.5}
                        className="shadow-geo-flat opacity-95"
                      />
                      {/* Text details */}
                      <text
                        x={centerX}
                        y={centerY - 10}
                        textAnchor="middle"
                        className="font-sans text-[9px] font-black fill-cyan-300 uppercase tracking-wider"
                      >
                        {isMeasuring ? "Measuring..." : "Measured Distance"}
                      </text>
                      <text
                        x={centerX}
                        y={centerY + 4}
                        textAnchor="middle"
                        className="font-mono text-xs font-bold fill-white"
                      >
                        {distMetres} m
                      </text>
                      <text
                        x={centerX}
                        y={centerY + 14}
                        textAnchor="middle"
                        className="font-mono text-[8px] fill-cyan-400 font-bold"
                      >
                        dx: {dxMetres}m • dy: {dyMetres}m
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}
          </g>
        </svg>

        {/* Interactive Custom Scrollbars */}
        {/* Vertical Scrollbar */}
        <div className="absolute right-2.5 top-4 bottom-20 w-2.5 bg-paper-100/30 hover:bg-paper-100/55 rounded-full z-30 transition-all border border-ink-950/10 cursor-ns-resize group/vs">
          <div
            className="absolute left-[1px] right-[1px] bg-ink-950/45 hover:bg-ink-950 rounded-full cursor-grab active:cursor-grabbing transition-all min-h-[35px]"
            style={{
              top: `${Math.max(0, Math.min(85, ((-pan.y + 1500) / 3000) * 85))}%`,
              height: "15%",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              isDraggingScrollY.current = true;
              startDragY.current = e.clientY;
              startPanY.current = pan.y;
            }}
          />
        </div>

        {/* Horizontal Scrollbar */}
        <div className="absolute bottom-[66px] left-4 right-8 h-2.5 bg-paper-100/30 hover:bg-paper-100/55 rounded-full z-30 transition-all border border-ink-950/10 cursor-ew-resize group/hs">
          <div
            className="absolute top-[1px] bottom-[1px] bg-ink-950/45 hover:bg-ink-950 rounded-full cursor-grab active:cursor-grabbing transition-all min-w-[35px]"
            style={{
              left: `${Math.max(0, Math.min(85, ((-pan.x + 1500) / 3000) * 85))}%`,
              width: "15%",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              isDraggingScrollX.current = true;
              startDragX.current = e.clientX;
              startPanX.current = pan.x;
            }}
          />
        </div>

        {/* Float Controls Canvas Action rail */}
        <div className="absolute top-4 left-4 flex flex-col gap-1 w-9 bg-paper-50 p-1 rounded-none border-2 border-ink-950 shadow-geo-flat z-35">
          <button
            onClick={handleZoomIn}
            title="Zoom In (Ctrl+Wheel Up)"
            className="w-6 h-6 hover:bg-paper-250 text-ink-950 rounded-none transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-ink-950/15"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (Ctrl+Wheel Down)"
            className="w-6 h-6 hover:bg-paper-250 text-ink-950 rounded-none transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-ink-950/15"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={autoFocusHome}
            title="Recenter Plan (100% Zoom)"
            className="w-6 h-6 hover:bg-paper-250 text-ink-950 rounded-none transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-ink-950/15"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWheelMode((m) => (m === "zoom" ? "pan" : "zoom"))}
            title={wheelMode === "zoom" ? "Wheel is Zoom (Click to toggle Scroll style)" : "Wheel is Scroll (Click to toggle Zoom style)"}
            className={`w-6 h-6 rounded-none transition-colors flex items-center justify-center cursor-pointer border border-transparent ${
              wheelMode === "pan" ? "bg-accent-blue text-white" : "hover:bg-paper-250 text-ink-950 hover:border-ink-950/15"
            }`}
          >
            <Move className="w-3.5 h-3.5 animate-none" />
          </button>

          {setIsFullscreen && (
            <>
              <div className="h-[1px] bg-ink-950/20 my-0.5" />
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen Focus" : "Enter Distraction-Free Fullscreen"}
                className="w-6 h-6 hover:bg-paper-250 text-ink-950 rounded-none transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-ink-950/15"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-accent-orange" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-accent-blue" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Presence Indicator bottom widget strip */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-paper-50 text-ink-950 py-2.5 px-4 rounded-none text-[10px] font-mono shadow-geo-flat border-2 border-ink-950 z-10 font-extrabold">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5"><Grid className="w-3.5 h-3.5 text-accent-blue" />Grid size: {gridSize}px</span>
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-accent-orange" />Active: {projectState.layers.find((l) => l.id === selectedLayerId)?.name}</span>
          </div>
          <div className="text-ink-600 font-sans hidden sm:block">
            Mode: <b className="text-accent-blue">{activeTool.toUpperCase()}</b> | Wheel Tool: <b className="text-accent-orange">{wheelMode.toUpperCase()}</b> | Arrow Keys: Scroll
          </div>
        </div>
      </div>
    </div>
  );
}
