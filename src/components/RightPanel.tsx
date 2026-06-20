/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Layers,
  Settings,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  History,
  Send,
  Sliders,
  Palette,
} from "lucide-react";
import {
  ProjectState,
  Layer,
  Material,
  ProjectVersion,
  ProjectComment,
} from "../types";

// Beautiful SVG Texture Swatch Preview Generator
const renderSwatchPreview = (color: string, texture: string) => {
  return (
    <div className="relative w-14 h-14 border-2 border-ink-950 shadow-geo-flat shrink-0 overflow-hidden bg-paper-100 flex items-center justify-center rounded-none">
      {/* Base solid background */}
      <div className="absolute inset-0" style={{ backgroundColor: color }} />
      
      {/* Texture Overlay Pattern */}
      {texture === "rough" && (
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#000000_1.5px,transparent_1.5px)] [background-size:5px_5px]" />
      )}
      {texture === "glossy" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-80" />
      )}
      {texture === "polished" && (
        <div className="absolute inset-0 bg-gradient-to-tr from-white/15 via-white/60 to-transparent opacity-90" />
      )}
      {texture === "grain" && (
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, #000 3px, #000 5px)" }} />
      )}
      {texture === "brick" && (
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "repeating-linear-gradient(0deg, #000, #000 1px, transparent 1px, transparent 10px), repeating-linear-gradient(90deg, #000, #000 1px, transparent 1px, transparent 16px)" }} />
      )}
      {texture === "matte" && (
        <div className="absolute inset-0 opacity-20 bg-gradient-to-b from-black/15 via-transparent to-black/15" />
      )}
      
      {/* Border highlight for physical volumetric shine */}
      <div className="absolute inset-0 border-t border-l border-white/20" />
      
      {/* Texture tag */}
      <span className="absolute bottom-0.5 right-0.5 text-[7px] font-mono font-black py-0.5 px-1 bg-ink-950 text-white leading-none uppercase select-none rounded-[1px] tracking-tighter">
        {texture}
      </span>
    </div>
  );
};

interface RightPanelProps {
  projectState: ProjectState;
  setProjectState: React.Dispatch<React.SetStateAction<ProjectState>>;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  versions: ProjectVersion[];
  onRestoreVersion: (version: ProjectVersion) => void;
  onCreateVersion: (name: string) => void;
}

export default function RightPanel({
  projectState,
  setProjectState,
  selectedObjectId,
  setSelectedObjectId,
  versions,
  onRestoreVersion,
  onCreateVersion,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<"properties" | "layers" | "materials" | "versions">("properties");
  const [newLayerName, setNewLayerName] = useState("");
  const [replyText, setReplyText] = useState("");
  const [customVersionName, setCustomVersionName] = useState("");

  // Preset Materials
  const MATERIALS: Material[] = [
    { id: "concrete", name: "In-situ Concrete Slabs", color: "#64748b", texture: "smooth", reflectivity: 0.2, transparency: 0, roughness: 0.8 },
    { id: "brick", name: "Structural Brickwork Masonry", color: "#b91c1c", texture: "rough", reflectivity: 0.1, transparency: 0, roughness: 0.95 },
    { id: "glass", name: "Double Tempered Blue Glass", color: "#38bdf8", texture: "glossy", reflectivity: 0.9, transparency: 0.85, roughness: 0.05 },
    { id: "wood", name: "Western Red Cedar Timber Boards", color: "#b45309", texture: "grain", reflectivity: 0.35, transparency: 0, roughness: 0.55 },
    { id: "steel", name: "Hot Rolled Carbon Steel beams", color: "#475569", texture: "matte", reflectivity: 0.5, transparency: 0, roughness: 0.4 },
    { id: "granite", name: "Polished Imperial Black Granite", color: "#0f172a", texture: "polished", reflectivity: 0.8, transparency: 0, roughness: 0.1 },
    { id: "plaster", name: "Plaster Gypsum Coat", color: "#e2e8f0", texture: "matte", reflectivity: 0.05, transparency: 0, roughness: 0.95 },
    { id: "bricks", name: "Modern Brickwork Facing", color: "#f97316", texture: "brick", reflectivity: 0.1, transparency: 0, roughness: 0.9 },
  ];

  // Stateful Materials
  const [customMaterials, setCustomMaterials] = useState<Material[]>(MATERIALS);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Custom builder template states
  const [customMatName, setCustomMatName] = useState("");
  const [customMatColor, setCustomMatColor] = useState("#3b82f6");
  const [customMatTexture, setCustomMatTexture] = useState("smooth");
  const [customMatReflect, setCustomMatReflect] = useState(0.5);
  const [customMatOpacity, setCustomMatOpacity] = useState(100);
  const [customMatRough, setCustomMatRough] = useState(0.5);

  const handleUpdateMaterialTemplate = (id: string, updatedFields: Partial<Material>) => {
    setCustomMaterials((prev) => {
      const newList = prev.map((m) => (m.id === id ? { ...m, ...updatedFields } : m));
      
      // Propagate template color updates to actual elements in the canvas!
      if (updatedFields.color !== undefined) {
        setProjectState((prevProj) => {
          const updatedWalls = prevProj.walls.map((w) => (w.materialId === id ? { ...w, color: updatedFields.color! } : w));
          const updatedFurniture = prevProj.furniture.map((f) => (f.materialId === id ? { ...f, color: updatedFields.color! } : f));
          return {
            ...prevProj,
            walls: updatedWalls,
            furniture: updatedFurniture,
          };
        });
      }
      return newList;
    });
  };

  // 1. Identify selected element inside active project State
  let selectedElement: { type: string; data: any } | null = null;

  const findSelected = () => {
    if (!selectedObjectId) return null;

    const wall = projectState.walls.find((w) => w.id === selectedObjectId);
    if (wall) return { type: "wall", data: wall };

    const door = projectState.doors.find((d) => d.id === selectedObjectId);
    if (door) return { type: "door", data: door };

    const win = projectState.windows.find((w) => w.id === selectedObjectId);
    if (win) return { type: "window", data: win };

    const stair = projectState.stairs.find((s) => s.id === selectedObjectId);
    if (stair) return { type: "stair", data: stair };

    const room = projectState.rooms.find((r) => r.id === selectedObjectId);
    if (room) return { type: "room", data: room };

    const furn = projectState.furniture.find((f) => f.id === selectedObjectId);
    if (furn) return { type: "furniture", data: furn };

    const land = projectState.landscape.find((l) => l.id === selectedObjectId);
    if (land) return { type: "landscape", data: land };

    const dim = projectState.dimensions.find((d) => d.id === selectedObjectId);
    if (dim) return { type: "dimension", data: dim };

    const comment = projectState.comments.find((c) => c.id === selectedObjectId);
    if (comment) return { type: "comment", data: comment };

    const sketch = projectState.sketches.find((s) => s.id === selectedObjectId);
    if (sketch) return { type: "sketch", data: sketch };

    return null;
  };

  selectedElement = findSelected();

  // Selected Properties updaters generic helpers
  const updateSelectedElementValue = (field: string, val: any) => {
    if (!selectedElement) return;
    const { type, data } = selectedElement;

    setProjectState((prev) => {
      const state = { ...prev };
      if (type === "wall") {
        state.walls = state.walls.map((w) => (w.id === data.id ? { ...w, [field]: val } : w));
      } else if (type === "door") {
        state.doors = state.doors.map((d) => (d.id === data.id ? { ...d, [field]: val } : d));
      } else if (type === "window") {
        state.windows = state.windows.map((w) => (w.id === data.id ? { ...w, [field]: val } : w));
      } else if (type === "stair") {
        state.stairs = state.stairs.map((s) => (s.id === data.id ? { ...s, [field]: val } : s));
      } else if (type === "room") {
        state.rooms = state.rooms.map((r) => (r.id === data.id ? { ...r, [field]: val } : r));
      } else if (type === "furniture") {
        state.furniture = state.furniture.map((f) => (f.id === data.id ? { ...f, [field]: val } : f));
      } else if (type === "landscape") {
        state.landscape = state.landscape.map((l) => (l.id === data.id ? { ...l, [field]: val } : l));
      } else if (type === "dimension") {
        state.dimensions = state.dimensions.map((d) => (d.id === data.id ? { ...d, [field]: val } : d));
      } else if (type === "comment") {
        state.comments = state.comments.map((c) => (c.id === data.id ? { ...c, [field]: val } : c));
      } else if (type === "sketch") {
        state.sketches = state.sketches.map((s) => (s.id === data.id ? { ...s, [field]: val } : s));
      }
      return state;
    });
  };

  // Add Comment Reply interaction helpers
  const handleAddReply = () => {
    if (!selectedElement || selectedElement.type !== "comment" || !replyText.trim()) return;
    const comment: ProjectComment = selectedElement.data;

    const newReply = {
      id: `rep-${Math.random().toString(36).substr(2, 9)}`,
      author: "Design Partner",
      text: replyText,
      timestamp: "Just now",
    };

    updateSelectedElementValue("replies", [...comment.replies, newReply]);
    setReplyText("");
  };

  // Delete Active selected item from drawing canvas
  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    setProjectState((prev) => {
      const state = { ...prev };
      state.walls = state.walls.filter((w) => w.id !== selectedObjectId);
      state.doors = state.doors.filter((d) => d.id !== selectedObjectId);
      state.windows = state.windows.filter((w) => w.id !== selectedObjectId);
      state.stairs = state.stairs.filter((s) => s.id !== selectedObjectId);
      state.rooms = state.rooms.filter((r) => r.id !== selectedObjectId);
      state.furniture = state.furniture.filter((f) => f.id !== selectedObjectId);
      state.landscape = state.landscape.filter((l) => l.id !== selectedObjectId);
      state.dimensions = state.dimensions.filter((d) => d.id !== selectedObjectId);
      state.comments = state.comments.filter((c) => c.id !== selectedObjectId);
      state.sketches = state.sketches.filter((s) => s.id !== selectedObjectId);
      return state;
    });
    setSelectedObjectId(null);
  };

  // 2. Layers Management Operations
  const toggleLayerVisibility = (layerId: string) => {
    setProjectState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, isVisible: !l.isVisible } : l)),
    }));
  };

  const toggleLayerLockState = (layerId: string) => {
    setProjectState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === layerId ? { ...l, isLocked: !l.isLocked } : l)),
    }));
  };

  const handleAddNewLayer = () => {
    if (!newLayerName.trim()) return;
    const id = `layer-${Math.random().toString(36).substr(2, 9)}`;
    const newL: Layer = {
      id,
      name: newLayerName,
      isVisible: true,
      isLocked: false,
    };
    setProjectState((prev) => ({
      ...prev,
      layers: [...prev.layers, newL],
    }));
    setNewLayerName("");
  };

  const handleDeleteLayer = (layerId: string) => {
    // Avoid deleting core Ground Floor layers
    if (layerId === "layer-ground") return;
    setProjectState((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== layerId),
    }));
  };

  return (
    <div className="flex flex-col border-2 border-ink-950 bg-paper-50 rounded-none shadow-geo-md h-full overflow-hidden blueprint-grid-accent">
      {/* Visual Navigation Tabs */}
      <div className="flex border-b-2 border-ink-950 bg-paper-300 p-1 gap-1">
        {[
          { tab: "properties", label: "Properties", icon: Settings },
          { tab: "layers", label: "Layers", icon: Layers },
          { tab: "materials", label: "Materials", icon: Sliders },
          { tab: "versions", label: "Milestones", icon: History },
        ].map(({ tab, label, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-none transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-ink-950 text-white shadow-none font-bold"
                : "text-ink-700 hover:text-ink-950 hover:bg-paper-100"
            }`}
          >
            <Icon className="w-4 h-4 mb-1" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-tight">{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Properties inspector panel */}
        {activeTab === "properties" && (
          <div className="flex flex-col gap-4">
            {selectedElement ? (
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-paper-100 p-3.5 border-2 border-ink-950 rounded-none shadow-geo-flat">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-ink-600 uppercase tracking-wider font-mono">
                      Selected Element
                    </span>
                    <span className="text-sm font-black text-ink-950 capitalize font-display">
                      {selectedElement.type}
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-2 text-accent-orange hover:bg-accent-orange/10 rounded-none border-2 border-ink-950 transition-colors"
                    title="Delete element"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* WALL properties custom edits */}
                {selectedElement.type === "wall" && (() => {
                  const currentMaterial = customMaterials.find(m => m.id === selectedElement.data.materialId) || {
                    id: "custom",
                    name: "Direct Paint Coating",
                    color: selectedElement.data.color || "#64748b",
                    texture: "smooth",
                    reflectivity: 0.2,
                    transparency: 0,
                    roughness: 0.8
                  };
                  return (
                    <div className="flex flex-col gap-3 font-sans">
                      {/* Swatch Preview Block */}
                      <div className="flex gap-3 bg-paper-100 p-3 border-2 border-ink-950 rounded-none shadow-geo-flat">
                        {renderSwatchPreview(selectedElement.data.color || currentMaterial.color, currentMaterial.texture)}
                        <div className="flex flex-col justify-center min-w-0">
                          <span className="text-[9px] font-black text-ink-600 uppercase tracking-wider font-mono">
                            Surface Coating Swatch
                          </span>
                          <span className="text-sm font-black text-ink-950 truncate font-display">
                            {currentMaterial.name}
                          </span>
                          <span className="text-[10px] text-ink-500 font-mono uppercase mt-0.5 font-bold">
                            Color: {selectedElement.data.color || currentMaterial.color}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Wall Category</span>
                        <select
                          value={selectedElement.data.type}
                          onChange={(e) => updateSelectedElementValue("type", e.target.value)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                        >
                          <option value="exterior">Exterior (Load-bearing)</option>
                          <option value="interior">Interior (Partition)</option>
                          <option value="curved">Curved Accent Wall</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-ink-850">Thickness (cm)</span>
                          <input
                            type="number"
                            value={selectedElement.data.thickness}
                            onChange={(e) => updateSelectedElementValue("thickness", parseInt(e.target.value) || 15)}
                            className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-ink-850">Height (cm)</span>
                          <input
                            type="number"
                            value={selectedElement.data.height}
                            onChange={(e) => updateSelectedElementValue("height", parseInt(e.target.value) || 280)}
                            className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Apply Material Coating</span>
                        <select
                          value={selectedElement.data.materialId || "concrete"}
                          onChange={(e) => {
                            const mat = customMaterials.find((m) => m.id === e.target.value);
                            if (mat) {
                              updateSelectedElementValue("materialId", mat.id);
                              updateSelectedElementValue("color", mat.color);
                            }
                          }}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                        >
                          {customMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}

                {/* DOOR features specs */}
                {selectedElement.type === "door" && (
                  <div className="flex flex-col gap-3 font-sans">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Door Type</span>
                      <select
                        value={selectedElement.data.type}
                        onChange={(e) => updateSelectedElementValue("type", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                      >
                        <option value="single">Single Hinged Door</option>
                        <option value="double">French Double Doors</option>
                        <option value="sliding">Frameless Sliding Panel</option>
                        <option value="folding">Bi-fold Accordion</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Clear Span Width</span>
                        <input
                          type="number"
                          value={selectedElement.data.width}
                          onChange={(e) => updateSelectedElementValue("width", parseInt(e.target.value) || 90)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Physical Height</span>
                        <input
                          type="number"
                          value={selectedElement.data.height}
                          onChange={(e) => updateSelectedElementValue("height", parseInt(e.target.value) || 210)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Swing Orientation</span>
                      <select
                        value={selectedElement.data.swingDirection}
                        onChange={(e) => updateSelectedElementValue("swingDirection", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                      >
                        <option value="inside">Hinged Inside</option>
                        <option value="outside">Hinged Outside</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* WINDOW configurations */}
                {selectedElement.type === "window" && (
                  <div className="flex flex-col gap-3 font-sans">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Aperture Style</span>
                      <select
                        value={selectedElement.data.type}
                        onChange={(e) => updateSelectedElementValue("type", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                      >
                        <option value="sliding">Horizontally Sliding</option>
                        <option value="casement">Saddle Casement</option>
                        <option value="awning">Sill Awning</option>
                        <option value="fixed">Fixed Low-glazing Sheet</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Width</span>
                        <input
                          type="number"
                          value={selectedElement.data.width}
                          onChange={(e) => updateSelectedElementValue("width", parseInt(e.target.value) || 120)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Height</span>
                        <input
                          type="number"
                          value={selectedElement.data.height}
                          onChange={(e) => updateSelectedElementValue("height", parseInt(e.target.value) || 110)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ROOM configurations */}
                {selectedElement.type === "room" && (
                  <div className="flex flex-col gap-3 font-sans">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Zone Label</span>
                      <input
                        type="text"
                        value={selectedElement.data.name}
                        onChange={(e) => updateSelectedElementValue("name", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Compartment Classification</span>
                      <select
                        value={selectedElement.data.type}
                        onChange={(e) => updateSelectedElementValue("type", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                      >
                        <option value="living">Living Room / Lounge</option>
                        <option value="bedroom">Private Suite Bedroom</option>
                        <option value="kitchen">Wet range Kitchen</option>
                        <option value="bathroom">Bath / Washroom</option>
                        <option value="dining">Formal Dining Hall</option>
                        <option value="office">Workstation Office</option>
                        <option value="garage">Vehicle Garage Slabs</option>
                        <option value="corridor">Corridor Walkway</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Floor Color Wash</span>
                      <div className="flex gap-2.5 items-center">
                        <input
                          type="color"
                          value={selectedElement.data.color || "#e2e8f0"}
                          onChange={(e) => updateSelectedElementValue("color", e.target.value)}
                          className="w-9 h-9 border-2 border-ink-950 cursor-pointer shadow-geo-flat"
                        />
                        <span className="text-xs font-mono text-ink-600 font-extrabold uppercase">
                          {selectedElement.data.color || "#cbd5e1"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMENTS nested engine */}
                {selectedElement.type === "comment" && (
                  <div className="flex flex-col gap-3.5 font-sans bg-paper-100 p-3.5 border-2 border-ink-950 rounded-none shadow-geo-flat">
                    <span className="text-[10px] font-extrabold text-ink-900 flex items-center gap-1.5 border-b-2 border-ink-950 pb-2 uppercase tracking-wide font-mono">
                      💬 Blueprint feedback thread
                    </span>

                    <div className="flex flex-col gap-1 bg-white p-2.5 border border-ink-950/30">
                      <span className="text-[10px] font-mono font-black text-accent-orange flex justify-between">
                        <span>@{selectedElement.data.author}</span>
                        <span>{selectedElement.data.timestamp}</span>
                      </span>
                      <p className="text-xs text-ink-950 font-bold mt-1 leading-relaxed">
                        {selectedElement.data.text}
                      </p>
                    </div>

                    {/* Replies mapping */}
                    <div className="flex flex-col gap-2.5 pl-3.5 border-l-4 border-accent-blue">
                      {selectedElement.data.replies.map((rep: any) => (
                        <div key={rep.id} className="bg-paper-50 p-2 border border-ink-950/20 text-ink-800">
                          <span className="text-[9px] font-bold text-ink-600 block">
                            @{rep.author} • {rep.timestamp}
                          </span>
                          <p className="text-[11px] font-bold leading-relaxed mt-0.5">{rep.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Reply form */}
                    <div className="flex gap-1.5 items-center mt-1">
                      <input
                        type="text"
                        placeholder="Write reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="flex-1 text-xs p-2.5 bg-white border-2 border-ink-950 rounded-none text-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-blue font-bold"
                      />
                      <button
                        onClick={handleAddReply}
                        className="bg-accent-blue hover:bg-accent-blue/90 text-white p-2.5 rounded-none border-2 border-ink-950 shadow-none cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Resolve toggle */}
                    <button
                      onClick={() => updateSelectedElementValue("isResolved", !selectedElement?.data.isResolved)}
                      className={`text-[10px] py-2 px-3 border-2 rounded-none font-black text-center transition-all cursor-pointer ${
                        selectedElement.data.isResolved
                          ? "bg-accent-green/20 text-accent-green border-accent-green"
                          : "bg-white text-ink-950 border-ink-950 hover:bg-paper-150"
                      }`}
                    >
                      {selectedElement.data.isResolved ? "✓ Resolved & Closed" : "Mark as Resolved"}
                    </button>
                  </div>
                )}

                {/* FURNITURE properties custom specs */}
                {selectedElement.type === "furniture" && (() => {
                  const currentMaterial = customMaterials.find(m => m.id === selectedElement.data.materialId) || {
                    id: "custom",
                    name: "Custom Finish",
                    color: selectedElement.data.color || "#cbd5e1",
                    texture: "smooth",
                    reflectivity: 0.35,
                    transparency: 0,
                    roughness: 0.55
                  };
                  return (
                    <div className="flex flex-col gap-3 font-sans">
                      {/* Swatch Preview Block */}
                      <div className="flex gap-3 bg-paper-100 p-3 border-2 border-ink-950 rounded-none shadow-geo-flat">
                        {renderSwatchPreview(selectedElement.data.color || currentMaterial.color, currentMaterial.texture)}
                        <div className="flex flex-col justify-center min-w-0">
                          <span className="text-[9px] font-black text-ink-600 uppercase tracking-wider font-mono">
                            Model Material Finish
                          </span>
                          <span className="text-sm font-black text-ink-950 truncate font-display">
                            {currentMaterial.name}
                          </span>
                          <span className="text-[10px] text-ink-500 font-mono uppercase mt-0.5 font-bold">
                            Color: {selectedElement.data.color || currentMaterial.color}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Model Block Name</span>
                        <input
                          type="text"
                          value={selectedElement.data.name}
                          onChange={(e) => updateSelectedElementValue("name", e.target.value)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-ink-850">Span Width (cm)</span>
                          <input
                            type="number"
                            value={selectedElement.data.width}
                            onChange={(e) => updateSelectedElementValue("width", parseInt(e.target.value) || 50)}
                            className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-ink-850">Span Depth (cm)</span>
                          <input
                            type="number"
                            value={selectedElement.data.height}
                            onChange={(e) => updateSelectedElementValue("height", parseInt(e.target.value) || 50)}
                            className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850 flex justify-between">
                          <span>Rotation Degrees</span>
                          <span className="text-accent-orange font-mono font-black">{selectedElement.data.rotation}°</span>
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={selectedElement.data.rotation}
                          onChange={(e) => updateSelectedElementValue("rotation", parseInt(e.target.value))}
                          className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue mt-1"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Apply Coating Finish</span>
                        <select
                          value={selectedElement.data.materialId || "custom"}
                          onChange={(e) => {
                            const mat = customMaterials.find((m) => m.id === e.target.value);
                            if (mat) {
                              updateSelectedElementValue("materialId", mat.id);
                              updateSelectedElementValue("color", mat.color);
                            } else {
                              updateSelectedElementValue("materialId", "custom");
                            }
                          }}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none cursor-pointer"
                        >
                          <option value="custom">-- Custom Color Finish (below) --</option>
                          {customMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Custom Paint Color</span>
                        <div className="flex gap-2.5 items-center">
                          <input
                            type="color"
                            value={selectedElement.data.color || "#cbd5e1"}
                            onChange={(e) => {
                              updateSelectedElementValue("color", e.target.value);
                              updateSelectedElementValue("materialId", "custom");
                            }}
                            className="w-9 h-9 border-2 border-ink-950 cursor-pointer shadow-geo-flat"
                          />
                          <span className="text-xs font-mono text-ink-600 font-extrabold uppercase">
                            {selectedElement.data.color || "#cbd5e1"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* LANDSCAPE properties specs */}
                {selectedElement.type === "landscape" && (
                  <div className="flex flex-col gap-3 font-sans">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850">Model Block Name</span>
                      <input
                        type="text"
                        value={selectedElement.data.name}
                        onChange={(e) => updateSelectedElementValue("name", e.target.value)}
                        className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Span Width (cm)</span>
                        <input
                          type="number"
                          value={selectedElement.data.width}
                          onChange={(e) => updateSelectedElementValue("width", parseInt(e.target.value) || 50)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-ink-850">Span Depth (cm)</span>
                        <input
                          type="number"
                          value={selectedElement.data.height}
                          onChange={(e) => updateSelectedElementValue("height", parseInt(e.target.value) || 50)}
                          className="text-xs p-2.5 border-2 border-ink-950 rounded-none bg-white text-ink-950 font-mono font-bold focus:ring-1 focus:ring-accent-blue focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-ink-850 flex justify-between">
                        <span>Rotation Degrees</span>
                        <span className="text-accent-orange font-mono font-black">{selectedElement.data.rotation}°</span>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={selectedElement.data.rotation}
                        onChange={(e) => updateSelectedElementValue("rotation", parseInt(e.target.value))}
                        className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-ink-500 font-sans border-2 border-dashed border-ink-950/35 rounded-none bg-paper-100 shadow-none p-6">
                <Palette className="w-10 h-10 text-ink-400/70 mb-3 stroke-1 animate-pulse" />
                <span className="text-xs font-black text-ink-950 uppercase font-display tracking-wider">No element selected</span>
                <p className="text-[11px] text-ink-700 mt-2.5 max-w-[200px] leading-relaxed font-bold">
                  Click on any wall, room slab, door, or comment on the design canvas to configure stats.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Layers control tab panel */}
        {activeTab === "layers" && (
          <div className="flex flex-col gap-4 font-sans">
            <span className="text-xs font-black text-ink-950 uppercase tracking-wider block border-b-2 border-ink-950 pb-2">
              Layer Configurations
            </span>

            {/* List Layers */}
            <div className="flex flex-col gap-2">
              {projectState.layers.map((layer) => {
                const isActive = projectState.selectedLayerId === layer.id;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setProjectState((prev) => ({ ...prev, selectedLayerId: layer.id }))}
                    className={`flex items-center justify-between p-3 border-2 rounded-none transition-all cursor-pointer ${
                      isActive
                        ? "bg-paper-250 border-ink-950 shadow-geo-flat font-bold"
                        : "bg-paper-50 border-ink-950/20 hover:border-ink-950"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-none border border-ink-950 ${isActive ? "bg-accent-orange animate-pulse" : "bg-paper-300"}`} />
                      <span className={`text-xs uppercase tracking-tight font-mono ${isActive ? "text-ink-950 font-black" : "text-ink-800"}`}>
                        {layer.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* View toggling */}
                      <button
                        onClick={() => toggleLayerVisibility(layer.id)}
                        className={`p-1.5 rounded-none hover:bg-paper-200 border border-transparent hover:border-ink-950/20 ${layer.isVisible ? "text-ink-800 font-bold" : "text-ink-300"}`}
                      >
                        {layer.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Lock toggling */}
                      <button
                        onClick={() => toggleLayerLockState(layer.id)}
                        className={`p-1.5 rounded-none hover:bg-paper-200 border border-transparent hover:border-ink-950/20 ${layer.isLocked ? "text-ink-800 font-bold" : "text-ink-300"}`}
                      >
                        {layer.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>

                      {/* Delete */}
                      {layer.id !== "layer-ground" && (
                        <button
                          onClick={() => handleDeleteLayer(layer.id)}
                          className="p-1.5 text-accent-orange hover:bg-accent-orange/10 rounded-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create new layer */}
            <div className="flex gap-2 items-center mt-3.5 p-3 bg-paper-100 border-2 border-ink-950 rounded-none shadow-geo-flat">
              <input
                type="text"
                placeholder="New Layer Name..."
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                className="flex-1 text-xs p-2 bg-white border border-ink-950/30 rounded-none focus:outline-none text-ink-950 font-bold"
              />
              <button
                onClick={handleAddNewLayer}
                className="bg-accent-blue text-white py-2 px-3.5 rounded-none hover:bg-accent-blue/90 border border-ink-950 transition-colors text-xs font-bold"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Materials Customizing panel */}
        {activeTab === "materials" && (
          <div className="flex flex-col gap-4 font-sans animate-fade-in">
            <span className="text-xs font-black text-ink-950 uppercase tracking-wider block border-b-2 border-ink-950 pb-2">
              Architectural Coatings
            </span>

            {/* 1. Selected Element Fine-Tuner if applicable */}
            {(selectedElement && (selectedElement.type === "wall" || selectedElement.type === "furniture")) ? (() => {
              const element = selectedElement.data;
              const type = selectedElement.type;
              
              const matchedMat = customMaterials.find(m => m.id === element.materialId) || {
                id: "custom",
                name: "Direct Paint Coating",
                color: element.color || "#64748b",
                texture: "smooth",
                reflectivity: 0.1,
                transparency: 0,
                roughness: 0.9
              };

              const elementColor = element.color || matchedMat.color || "#64748b";
              const elementTexture = matchedMat.texture || "smooth";
              const elementRoughness = matchedMat.roughness ?? 0.8;
              const elementReflectivity = matchedMat.reflectivity ?? 0.2;

              return (
                <div className="flex flex-col gap-3 p-3.5 bg-paper-100 border-2 border-ink-950 rounded-none shadow-geo-flat mb-1">
                  <div className="flex justify-between items-center border-b border-ink-950/20 pb-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black font-mono text-accent-blue uppercase tracking-wider">Live Coating Editor</span>
                      <span className="text-xs font-black text-ink-950 capitalize">{type}: {element.name || "Default Block"}</span>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-ink-500 bg-paper-250 px-1.5 py-0.5 border border-ink-950/15">Active</span>
                  </div>

                  <div className="flex gap-3 items-center">
                    {renderSwatchPreview(elementColor, elementTexture)}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-ink-850">Quick Paint Color</span>
                      <div className="flex gap-1.5 items-center mt-1">
                        <input
                          type="color"
                          value={elementColor}
                          onChange={(e) => {
                            updateSelectedElementValue("color", e.target.value);
                            if (element.materialId && element.materialId !== "custom") {
                              updateSelectedElementValue("materialId", "custom");
                            }
                          }}
                          className="w-8 h-8 border border-ink-950 cursor-pointer shadow-none"
                        />
                        <span className="text-xs font-mono font-bold text-ink-600 block uppercase">{elementColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Texture buttons */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-ink-850">Apply Texture Stamp</span>
                    <div className="grid grid-cols-3 gap-1">
                      {["smooth", "rough", "glossy", "grain", "polished", "brick", "matte"].map((tex) => (
                        <button
                          key={tex}
                          onClick={() => {
                            setCustomMaterials(prev => {
                              const containsCustom = prev.some(m => m.id === "custom");
                              if (containsCustom) {
                                return prev.map(m => m.id === "custom" ? { ...m, color: elementColor, texture: tex } : m);
                              } else {
                                return [...prev, {
                                  id: "custom",
                                  name: "Custom Finish",
                                  color: elementColor,
                                  texture: tex,
                                  reflectivity: 0.3,
                                  transparency: 0,
                                  roughness: 0.5
                                }];
                              }
                            });
                            updateSelectedElementValue("materialId", "custom");
                          }}
                          className={`text-[9.5px] py-1 px-1.5 text-center font-mono font-bold uppercase transition-all rounded-none border ${
                            elementTexture === tex
                              ? "bg-ink-950 text-white border-ink-950 font-black"
                              : "bg-white text-ink-800 border-ink-950/25 hover:border-ink-950"
                          }`}
                        >
                          {tex}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders for micro details */}
                  <div className="flex flex-col gap-1.5 mt-1 border-t border-ink-950/10 pt-2.5">
                    <div className="flex justify-between text-[10px] font-bold text-ink-700 font-mono">
                      <span>Reflectivity:</span>
                      <span>{(elementReflectivity * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={elementReflectivity * 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) / 100;
                        setCustomMaterials(prev => {
                          const hasCustom = prev.some(m => m.id === "custom");
                          if (hasCustom) {
                            return prev.map(m => m.id === "custom" ? { ...m, reflectivity: val } : m);
                          } else {
                            return [...prev, {
                              id: "custom",
                              name: "Custom Finish",
                              color: elementColor,
                              texture: elementTexture,
                              reflectivity: val,
                              transparency: 0,
                              roughness: elementRoughness
                            }];
                          }
                        });
                        updateSelectedElementValue("materialId", "custom");
                      }}
                      className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue"
                    />

                    <div className="flex justify-between text-[10px] font-bold text-ink-700 font-mono mt-1">
                      <span>Roughness:</span>
                      <span>{(elementRoughness * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={elementRoughness * 100}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) / 100;
                        setCustomMaterials(prev => {
                          const hasCustom = prev.some(m => m.id === "custom");
                          if (hasCustom) {
                            return prev.map(m => m.id === "custom" ? { ...m, roughness: val } : m);
                          } else {
                            return [...prev, {
                              id: "custom",
                              name: "Custom Finish",
                              color: elementColor,
                              texture: elementTexture,
                              reflectivity: elementReflectivity,
                              transparency: 0,
                              roughness: val
                            }];
                          }
                        });
                        updateSelectedElementValue("materialId", "custom");
                      }}
                      className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue"
                    />
                  </div>
                </div>
              );
            })() : (
              <div className="text-center py-4 px-3 bg-paper-100 border-2 border-dashed border-ink-950/20 text-ink-500 text-[10px] uppercase font-mono font-bold leading-relaxed mb-1">
                🎨 Click element (Wall or Furniture) on drafting sheet to edit its specific coatings.
              </div>
            )}

            {/* 2. Custom Materials Templates Catalog */}
            <div className="flex flex-col gap-3 mt-1.5">
              <span className="text-[10px] font-black text-ink-900 uppercase tracking-wider font-mono border-b-2 border-ink-950/25 pb-1 block">
                Architectural Roster Templates
              </span>

              <div className="flex flex-col gap-3.5">
                {customMaterials.filter(m => m.id !== "custom").map((mat) => {
                  const isEditing = editingMaterialId === mat.id;
                  const isSelectedForApply = selectedElement && (selectedElement.type === "wall" || selectedElement.type === "furniture");
                  
                  return (
                    <div
                      key={mat.id}
                      className="flex flex-col gap-2.5 p-3.5 border-2 border-ink-950 rounded-none shadow-geo-flat bg-paper-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          {renderSwatchPreview(mat.color, mat.texture)}
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-xs font-black text-ink-950 uppercase tracking-tight block truncate font-sans">
                              {mat.name}
                            </span>
                            <span className="text-[9.5px] text-ink-600 font-mono capitalize mt-0.5 font-bold">
                              Stamp: {mat.texture} • HEX: {mat.color}
                            </span>
                          </div>
                        </div>

                        {/* Apply Preset buttons */}
                        <div className="flex flex-col gap-1 shrink-0">
                          {isSelectedForApply && (
                            <button
                              onClick={() => {
                                updateSelectedElementValue("materialId", mat.id);
                                updateSelectedElementValue("color", mat.color);
                              }}
                              className="text-[9.5px] text-white bg-accent-blue hover:bg-accent-blue/90 border border-ink-950 py-1 px-2 font-black uppercase font-mono cursor-pointer"
                              title="Apply this coating to the selected item"
                            >
                              Apply
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingMaterialId(null);
                              } else {
                                setEditingMaterialId(mat.id);
                              }
                            }}
                            className={`text-[9.5px] border border-ink-950 py-1 px-2 font-black uppercase font-mono cursor-pointer ${
                              isEditing ? "bg-paper-300 text-ink-900" : "bg-white text-ink-800 hover:bg-paper-100"
                            }`}
                          >
                            {isEditing ? "Close" : "Params"}
                          </button>
                        </div>
                      </div>

                      {/* Display Template Specs */}
                      {!isEditing && (
                        <div className="grid grid-cols-3 gap-1.5 mt-0.5 text-[8.5px] font-mono text-ink-600 bg-paper-100 p-1.5 rounded-none border border-ink-950/20">
                          <div className="flex flex-col">
                            <span>GLINT:</span>
                            <b className="text-ink-950 font-black">{(mat.reflectivity * 100).toFixed(0)}%</b>
                          </div>
                          <div className="flex flex-col">
                            <span>OPACITY:</span>
                            <b className="text-ink-950 font-black">{((1 - mat.transparency) * 100).toFixed(0)}%</b>
                          </div>
                          <div className="flex flex-col">
                            <span>ROUGH:</span>
                            <b className="text-ink-950 font-black">{(mat.roughness * 100).toFixed(0)}%</b>
                          </div>
                        </div>
                      )}

                      {/* Editable Form for specific Material template */}
                      {isEditing && (
                        <div className="flex flex-col gap-2.5 bg-paper-100 p-2.5 border-t border-ink-950/15 font-mono text-[10px] text-ink-800">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">Template Label:</span>
                            <input
                              type="text"
                              value={mat.name}
                              onChange={(e) => handleUpdateMaterialTemplate(mat.id, { name: e.target.value })}
                              className="p-1 px-1.5 text-[11px] bg-white border border-ink-950/30 rounded-none text-ink-950 font-bold font-sans"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold">Base Color:</span>
                              <div className="flex gap-1 items-center">
                                <input
                                  type="color"
                                  value={mat.color}
                                  onChange={(e) => handleUpdateMaterialTemplate(mat.id, { color: e.target.value })}
                                  className="w-6 h-6 border border-ink-950 cursor-pointer"
                                />
                                <span className="text-[9.5px] font-mono leading-none">{mat.color}</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="font-bold">Texture Style:</span>
                              <select
                                value={mat.texture}
                                onChange={(e) => handleUpdateMaterialTemplate(mat.id, { texture: e.target.value })}
                                className="p-1 text-[9.5px] bg-white border border-ink-950/30 rounded-none font-bold cursor-pointer"
                              >
                                {["smooth", "rough", "glossy", "grain", "polished", "brick", "matte"].map(t => (
                                  <option key={t} value={t}>{t.toUpperCase()}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between font-bold">
                              <span>Reflectivity / Glint:</span>
                              <span>{(mat.reflectivity * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={mat.reflectivity * 100}
                              onChange={(e) => handleUpdateMaterialTemplate(mat.id, { reflectivity: parseFloat(e.target.value) / 100 })}
                              className="w-full h-1 accent-accent-blue mt-0.5 cursor-pointer"
                            />
                          </div>

                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between font-bold">
                              <span>Roughness Index:</span>
                              <span>{(mat.roughness * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={mat.roughness * 100}
                              onChange={(e) => handleUpdateMaterialTemplate(mat.id, { roughness: parseFloat(e.target.value) / 100 })}
                              className="w-full h-1 accent-accent-blue mt-0.5 cursor-pointer"
                            />
                          </div>

                          {/* Delete custom material option */}
                          {!["concrete", "brick", "glass", "wood", "steel", "granite", "plaster", "bricks"].includes(mat.id) && (
                            <button
                              onClick={() => {
                                setCustomMaterials(prev => prev.filter(m => m.id !== mat.id));
                                setEditingMaterialId(null);
                              }}
                              className="text-[9px] uppercase font-bold text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20 border border-accent-orange/30 py-1.5 rounded-none text-center mt-1 cursor-pointer"
                            >
                              Delete Coating Template
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Developer Synthesizer Builder */}
            <div className="flex flex-col gap-3 p-3.5 bg-paper-100 border-2 border-ink-950 rounded-none mt-2 shadow-geo-flat">
              <span className="text-[10px] font-black text-ink-900 uppercase tracking-wider font-mono flex items-center gap-1">
                <Plus className="w-3 h-3 text-accent-blue" /> Custom Coating Synthesizer
              </span>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-ink-850 text-[11px]">Coating Template Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Polished Jade, Ash Wood..."
                    value={customMatName}
                    onChange={(e) => setCustomMatName(e.target.value)}
                    className="p-2 border-2 border-ink-950 bg-white font-bold text-ink-950 focus:outline-none rounded-none text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-ink-850 text-[11px]">Pigment Paint</span>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={customMatColor}
                        onChange={(e) => setCustomMatColor(e.target.value)}
                        className="w-8 h-8 border border-ink-950 cursor-pointer"
                      />
                      <span className="font-mono text-[10px] text-ink-500 font-bold block">{customMatColor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-ink-850 text-[11px]">Texture Stamp</span>
                    <select
                      value={customMatTexture}
                      onChange={(e) => setCustomMatTexture(e.target.value)}
                      className="p-1.5 border-2 border-ink-950 bg-white font-bold text-ink-950 focus:outline-none rounded-none text-xs cursor-pointer"
                    >
                      {["smooth", "rough", "glossy", "grain", "polished", "brick", "matte"].map(t => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between font-mono text-[9px] font-bold text-ink-700">
                    <span>Reflection Level:</span>
                    <span>{(customMatReflect * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customMatReflect * 100}
                    onChange={(e) => setCustomMatReflect(parseFloat(e.target.value) / 100)}
                    className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue"
                  />
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between font-mono text-[9px] font-bold text-ink-700">
                    <span>Roughness Index:</span>
                    <span>{(customMatRough * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={customMatRough * 100}
                    onChange={(e) => setCustomMatRough(parseFloat(e.target.value) / 100)}
                    className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!customMatName.trim()) return;
                    const cleanId = `custom-${Math.random().toString(36).substr(2, 9)}`;
                    const newMat: Material = {
                      id: cleanId,
                      name: customMatName,
                      color: customMatColor,
                      texture: customMatTexture,
                      reflectivity: customMatReflect,
                      transparency: (100 - customMatOpacity) / 100,
                      roughness: customMatRough,
                    };

                    setCustomMaterials(prev => [...prev, newMat]);
                    setCustomMatName("");
                    
                    if (selectedElement && (selectedElement.type === "wall" || selectedElement.type === "furniture")) {
                      updateSelectedElementValue("materialId", cleanId);
                      updateSelectedElementValue("color", customMatColor);
                    }
                  }}
                  className="bg-accent-orange hover:bg-accent-orange/90 text-white py-2 px-3 border-2 border-ink-950 shadow-geo-flat font-bold text-xs uppercase cursor-pointer text-center mt-2.5 transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Synthesize & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestones version control */}
        {activeTab === "versions" && (
          <div className="flex flex-col gap-4 font-sans">
            <span className="text-xs font-black text-ink-950 uppercase tracking-wider block border-b-2 border-ink-950 pb-2">
              Project Snapshots
            </span>

            {/* Create Snapshot manual backup */}
            <div className="flex gap-2 bg-paper-100 p-3.5 border-2 border-ink-950 rounded-none shadow-geo-flat">
              <input
                type="text"
                placeholder="Tag milestone tag..."
                value={customVersionName}
                onChange={(e) => setCustomVersionName(e.target.value)}
                className="flex-1 text-xs p-2.5 bg-white border-2 border-ink-950 rounded-none text-ink-950 focus:outline-none font-sans font-bold"
              />
              <button
                onClick={() => {
                  if (customVersionName.trim()) {
                    onCreateVersion(customVersionName);
                    setCustomVersionName("");
                  }
                }}
                className="bg-accent-orange text-white py-2 px-4 rounded-none hover:bg-accent-orange/90 font-bold border-2 border-ink-950 shadow-geo-flat cursor-pointer text-xs font-display flex items-center justify-center"
              >
                Save
              </button>
            </div>

            {/* List versions */}
            <div className="flex flex-col gap-3.5 mt-2">
              {versions.length === 0 ? (
                <div className="text-center py-6 text-ink-500 text-xs font-bold font-mono">No milestones snapshots recorded.</div>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between p-3 border-2 border-ink-950 rounded-none bg-paper-50 hover:bg-paper-100 transition-all group shadow-geo-flat"
                  >
                    <div className="flex flex-col min-w-0 pr-3">
                      <span className="text-xs font-extrabold text-ink-950 truncate uppercase font-mono" title={ver.name}>
                        {ver.name}
                      </span>
                      <span className="text-[10px] text-ink-500 font-mono mt-0.5">
                        {ver.timestamp}
                      </span>
                    </div>

                    <button
                      onClick={() => onRestoreVersion(ver)}
                      className="text-[10px] uppercase font-bold text-ink-950 hover:bg-accent-blue hover:text-white border-2 border-ink-950 rounded-none py-1.5 px-3 bg-paper-100 transition-all font-mono cursor-pointer shadow-geo-flat"
                    >
                      Restore [↩]
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
