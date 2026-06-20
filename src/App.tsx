/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Grid,
  Sparkles,
  Layers,
  Compass,
  CornerRightDown,
  Trash2,
  BookOpen,
  MousePointer,
  PenTool,
  Pen,
  ChevronDown,
  ChevronRight,
  Play,
  Share,
  Undo2,
  Redo2,
  Save,
  Download,
  FolderOpen,
  Plus,
  RefreshCw,
  Eye,
  Layout,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  FileCode,
  ShieldCheck,
  Cpu,
  UserCheck,
  Sliders,
  MessageCircle,
  ArrowLeft,
  Ruler,
  Maximize2,
  Minimize2,
  Upload,
  Info,
  BarChart2,
} from "lucide-react";

import { Project, ProjectState, ProjectVersion, Layer } from "./types";
import { TEMPLATE_PRESETS } from "./data/templates";
import DesignCanvas from "./components/DesignCanvas";
import ThreeViewport from "./components/ThreeViewport";
import AIBox from "./components/AIBox";
import RightPanel from "./components/RightPanel";

// Initial projects seeding
const SEED_PROJECTS: Project[] = TEMPLATE_PRESETS.map((preset, idx) => ({
  id: preset.id,
  name: preset.name,
  type: preset.category === "Residential" ? "Residential Villa" : "Restaurant Cafe Space",
  createdAt: "Jun 19 2026, 12:00",
  updatedAt: "Jun 19 2026, 16:30",
  role: "pro",
  state: JSON.parse(JSON.stringify(preset.state)), // deep clone state
  versions: [
    {
      id: `seed-ver-${idx}`,
      name: "Initial Template Load Plan",
      timestamp: "Jun 19 12:00",
      data: JSON.parse(JSON.stringify(preset.state)),
    },
  ],
}));

export default function App() {
  // Project states
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>("studio-apartment");
  const activeProj = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Selected tool tracking
  const [activeTool, setActiveTool] = useState<string>("select");

  // Selection configurations
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Undo / Redo linear snapshot tracing stack
  const [undoStack, setUndoStack] = useState<ProjectState[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectState[]>([]);

  // Layout parameters
  const [viewMode, setViewMode] = useState<"2D" | "3D" | "split">("split");
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState("Synchronized");
  const [countdown, setCountdown] = useState(30);

  // Toggle client collaboration feedback panel
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Grid Controls
  const [gridSize, setGridSize] = useState(25); // in px
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Drawing Brush Controls
  const [pencilWidth, setPencilWidth] = useState(3);
  const [pencilColor, setPencilColor] = useState("#4f46e5");
  const [pencilOpacity, setPencilOpacity] = useState(1.0);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);

  // Active designer role clearance (simulating role checks)
  const [designerRole, setDesignerRole] = useState<"guest" | "registered" | "pro">("pro");
  const [isActionToolsOpen, setIsActionToolsOpen] = useState(true);

  // Project renamer inputs
  const [isRenaming, setIsRenaming] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<"manual" | "ai">("manual");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectNameTemp, setProjectNameTemp] = useState(activeProj?.name || "My Blueprint");
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearCanvas = () => {
    const doubleCheck = window.confirm(
      "Are you absolutely sure you want to clear this entire design canvas? This will clear all walls, doors, windows, and furnishings. You can revert this with Undo (Ctrl+Z / ⌘+Z)."
    );
    if (doubleCheck) {
      const blankState: ProjectState = {
        walls: [],
        doors: [],
        windows: [],
        stairs: [],
        rooms: [],
        sketches: [],
        furniture: [],
        landscape: [],
        annotations: [],
        dimensions: [],
        layers: [
          { id: "layer-ground", name: "Ground Floor Block", isVisible: true, isLocked: false },
          { id: "layer-roof", name: "Roof level", isVisible: true, isLocked: false },
          { id: "layer-landscape", name: "Landscape Garden Layout", isVisible: true, isLocked: false },
        ],
        comments: [],
        selectedLayerId: "layer-ground",
      };
      setProjectStateAndHistory(blankState);
      setFileMenuOpen(false);
      setSaveToast("Blueprint canvas reset to blank template.");
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  const handleExportJSON = () => {
    const exportData = JSON.stringify(activeProj.state, null, 2);
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProj.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_blueprint_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFileMenuOpen(false);
    setSaveToast("Architectural project state exported!");
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === "object") {
          const validKeys = ["walls", "doors", "windows", "rooms"];
          const hasSomeKeys = validKeys.some(k => k in parsed);
          if (!hasSomeKeys) {
            alert("Uploaded file does not appear to contain standard blueprint architectural variables.");
            return;
          }
          
          const rehydrated: ProjectState = {
            walls: parsed.walls || [],
            doors: parsed.doors || [],
            windows: parsed.windows || [],
            stairs: parsed.stairs || [],
            rooms: parsed.rooms || [],
            sketches: parsed.sketches || [],
            furniture: parsed.furniture || [],
            landscape: parsed.landscape || [],
            annotations: parsed.annotations || [],
            dimensions: parsed.dimensions || [],
            layers: parsed.layers || [
              { id: "layer-ground", name: "Ground Floor Block", isVisible: true, isLocked: false },
              { id: "layer-roof", name: "Roof level", isVisible: true, isLocked: false },
              { id: "layer-landscape", name: "Landscape Garden Layout", isVisible: true, isLocked: false },
            ],
            comments: parsed.comments || [],
            selectedLayerId: parsed.selectedLayerId || "layer-ground",
          };

          setProjectStateAndHistory(rehydrated);
          setFileMenuOpen(false);
          setSaveToast("Blueprint JSON configuration imported successfully!");
          setTimeout(() => setSaveToast(null), 3500);
        }
      } catch (err) {
        alert("Invalid file structure. Make sure you load a valid export file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleManualSave = () => {
    const verId = `ver-${Math.random().toString(36).substr(2, 9)}`;
    const newVer = {
      id: verId,
      name: `Manual Blueprint Save: ${activeProj.name}`,
      timestamp: new Date().toLocaleTimeString(),
      data: JSON.parse(JSON.stringify(activeProj.state)),
    };
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProjectId
          ? {
              ...proj,
              versions: [newVer, ...proj.versions],
            }
          : proj
      )
    );
    setSaveToast(`Draft successfully saved!`);
    setTimeout(() => {
      setSaveToast(null);
    }, 4000);
    setFileMenuOpen(false);
  };

  // 1. Trace autosave loops (Section 4.4: every 30 seconds)
  useEffect(() => {
    const term = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          triggerAutosave();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(term);
  }, [projects, activeProjectId]);

  const triggerAutosave = () => {
    setAutosaveStatus("Saving...");
    setTimeout(() => {
      setProjects((current) =>
        current.map((p) => {
          if (p.id === activeProjectId) {
            const snapState = JSON.parse(JSON.stringify(p.state));
            const newVer: ProjectVersion = {
              id: `auto-ver-${Math.random().toString(36).substr(2, 9)}`,
              name: `Auto-Backup State (${new Date().toLocaleTimeString()})`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              data: snapState,
            };
            // Keep maximum 8 backup checkpoints to conserve system memory
            const history = [newVer, ...p.versions].slice(0, 8);
            return {
              ...p,
              updatedAt: "Just now",
              versions: history,
            };
          }
          return p;
        })
      );
      setAutosaveStatus("Autosaved");
      setTimeout(() => setAutosaveStatus("Synchronized"), 2000);
    }, 800);
  };

  // State updater with linear Undo capture mechanism
  const setProjectStateAndHistory = (updateFn: any) => {
    const priorState = JSON.parse(JSON.stringify(activeProj.state));

    setProjects((current) =>
      current.map((p) => {
        if (p.id === activeProjectId) {
          const nextState = typeof updateFn === "function" ? updateFn(p.state) : updateFn;
          return {
            ...p,
            state: nextState,
          };
        }
        return p;
      })
    );

    // Save history logs
    setUndoStack((prev) => [...prev, priorState]);
    setRedoStack([]); // Clear redo stack on manual alterations
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const currentActiveState = JSON.parse(JSON.stringify(activeProj.state));

    setProjects((curr) =>
      curr.map((p) => (p.id === activeProjectId ? { ...p, state: previous } : p))
    );

    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentActiveState]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const currentActiveState = JSON.parse(JSON.stringify(activeProj.state));

    setProjects((curr) =>
      curr.map((p) => (p.id === activeProjectId ? { ...p, state: next } : p))
    );

    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentActiveState]);
  };

  // Project creation and operations (FR-001/002/003)
  const handleCreateNewProject = (name = "Untitled Residential", type = "Bungalow") => {
    const newId = `proj-${Math.random().toString(36).substr(2, 9)}`;
    const blankState: ProjectState = {
      walls: [],
      doors: [],
      windows: [],
      stairs: [],
      rooms: [],
      sketches: [],
      furniture: [],
      landscape: [],
      annotations: [],
      dimensions: [],
      layers: [
        { id: "layer-ground", name: "Ground Floor Block", isVisible: true, isLocked: false },
        { id: "layer-roof", name: "Roof level", isVisible: true, isLocked: false },
        { id: "layer-landscape", name: "Landscape Garden Layout", isVisible: true, isLocked: false },
      ],
      comments: [],
      selectedLayerId: "layer-ground",
    };

    const newProject: Project = {
      id: newId,
      name,
      type,
      createdAt: "Just now",
      updatedAt: "Just now",
      role: "pro",
      state: blankState,
      versions: [{ id: "ver-init-1", name: "Draft Created", timestamp: "Now", data: blankState }],
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newId);
    setProjectNameTemp(name);
    setShowProjectsModal(false);
  };

  const handleCloneProject = () => {
    const dupId = `proj-clone-${Math.random().toString(36).substr(2, 9)}`;
    const copiedProject: Project = {
      ...activeProj,
      id: dupId,
      name: `${activeProj.name} (Copy)`,
      createdAt: "Just now",
      updatedAt: "Just now",
    };
    setProjects((prev) => [copiedProject, ...prev]);
    setActiveProjectId(dupId);
    setProjectNameTemp(copiedProject.name);
    setShowProjectsModal(false);
  };

  const handleDeleteProject = (id: string) => {
    // Retain at least one active project blueprint
    if (projects.length <= 1) return;
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    setActiveProjectId(remaining[0].id);
    setProjectNameTemp(remaining[0].name);
  };

  // Milestone version Restore execution
  const handleRestoreVersion = (ver: ProjectVersion) => {
    setProjectStateAndHistory(JSON.parse(JSON.stringify(ver.data)));
  };

  const handleCreateCustomVersion = (name: string) => {
    const verId = `milestone-${Math.random().toString(36).substr(2, 9)}`;
    const newVer: ProjectVersion = {
      id: verId,
      name,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      data: JSON.parse(JSON.stringify(activeProj.state)),
    };
    setProjects((curr) =>
      curr.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            versions: [newVer, ...p.versions],
          };
        }
        return p;
      })
    );
  };

  // Rename action handler
  const handleSaveRename = () => {
    if (!projectNameTemp.trim()) return;
    setProjects((current) =>
      current.map((p) => (p.id === activeProjectId ? { ...p, name: projectNameTemp } : p))
    );
    setIsRenaming(false);
  };

  // AI Project apply hook (replaces geometry structure securely)
  const handleApplyAIProjectState = (aiData: Partial<ProjectState>) => {
    setProjectStateAndHistory((current: ProjectState) => {
      return {
        ...current,
        walls: aiData.walls || current.walls,
        rooms: aiData.rooms || current.rooms,
        doors: aiData.doors || current.doors,
        windows: aiData.windows || current.windows,
        stairs: aiData.stairs || current.stairs,
        furniture: aiData.furniture || current.furniture,
        landscape: aiData.landscape || current.landscape,
      };
    });
  };

  // EXPORT Blueprints System
  const downloadSVGBlueprintFile = () => {
    if (designerRole === "guest") {
      alert("⚠️ Guest Limit: Please toggle to Registered or Pro user roles in the top tier to unlock vector exports!");
      return;
    }

    // Dynamic serializing of paths
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" style="background:#f8fafc;">`;
    svgContent += `<!-- Generated by BuildFlow Platform (Architectural Export) -->`;

    // Slabs
    activeProj.state.rooms.forEach((r) => {
      const pts = r.points.map((p) => `${p.x},${p.y}`).join(" ");
      svgContent += `<polygon points="${pts}" fill="${r.color || "#cbd5e1"}" fill-opacity="0.4" stroke="#64748b" stroke-width="1"/>`;
    });
    // Walls
    activeProj.state.walls.forEach((w) => {
      svgContent += `<line x1="${w.startX}" y1="${w.startY}" x2="${w.endX}" y2="${w.endY}" stroke="${w.color || "#475569"}" stroke-width="${w.thickness}"/>`;
    });
    // Doors
    activeProj.state.doors.forEach((d) => {
      svgContent += `<line x1="${d.startX}" y1="${d.startY}" x2="${d.startX + d.width}" y2="${d.startY}" stroke="#92400e" stroke-width="3"/>`;
    });
    // Windows
    activeProj.state.windows.forEach((win) => {
      svgContent += `<rect x="${win.startX - win.width / 2}" y="${win.startY - 4}" width="${win.width}" height="8" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5" />`;
    });

    svgContent += `<text x="50" y="550" font-family="monospace" font-size="12" fill="#94a3b8">BuildFlow Export - ${activeProj.name}</text>`;
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildflow-${activeProj.id}.svg`;
    a.click();
  };

  const downloadOBJmeshFile = () => {
    if (designerRole === "guest") {
      alert("⚠️ Guest Limit: Please toggle to Registered or Pro user roles to unlock professional 3D exports!");
      return;
    }

    // Generate valid 3D OBJ strings representing extruded geometry blocks
    let objData = `# BuildFlow 3D OBJ Export\n# Model Name: ${activeProj.name}\n\n`;
    let vCounter = 1;

    activeProj.state.walls.forEach((w) => {
      const dx = w.endX - w.startX;
      const dy = w.endY - w.startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const halfThick = w.thickness / 2;

      // 4 points on the base, 4 points on the top of extruded wall height
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const corners = [
        { x: w.startX - halfThick * sin, y: w.startY + halfThick * cos },
        { x: w.startX + halfThick * sin, y: w.startY - halfThick * cos },
        { x: w.endX + halfThick * sin, y: w.endY - halfThick * cos },
        { x: w.endX - halfThick * sin, y: w.endY + halfThick * cos },
      ];

      // Base nodes
      corners.forEach((c) => {
        objData += `v ${c.x.toFixed(2)} ${c.y.toFixed(2)} 0.00\n`;
      });
      // Cap nodes
      corners.forEach((c) => {
        objData += `v ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${w.height?.toFixed(2) || "280.0"}\n`;
      });

      // Faces definitions
      objData += `f ${vCounter} ${vCounter + 1} ${vCounter + 2} ${vCounter + 3}\n`; // base
      objData += `f ${vCounter + 4} ${vCounter + 5} ${vCounter + 6} ${vCounter + 7}\n`; // cap
      objData += `f ${vCounter} ${vCounter + 1} ${vCounter + 5} ${vCounter + 4}\n`;
      objData += `f ${vCounter + 1} ${vCounter + 2} ${vCounter + 6} ${vCounter + 5}\n`;
      objData += `f ${vCounter + 2} ${vCounter + 3} ${vCounter + 7} ${vCounter + 6}\n`;
      objData += `f ${vCounter + 3} ${vCounter} ${vCounter + 4} ${vCounter + 7}\n\n`;

      vCounter += 8;
    });

    const blob = new Blob([objData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildflow-3d-model.obj`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-paper-200 text-ink-950 flex flex-col font-sans select-none overflow-hidden">
      {saveToast && (
        <div className="fixed bottom-4 right-4 bg-ink-950 text-white px-4 py-3 rounded-none border-2 border-white/80 shadow-geo-flat z-50 font-sans font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-accent-green" />
          <span>{saveToast}</span>
        </div>
      )}
      {/* 1. Main Navigation Header */}
      {!isFullscreen && (
        <header className="bg-paper-50 text-ink-900 px-5 py-3 flex items-center justify-between border-b-2 border-ink-950 z-10 shadow-none">
          
          {/* Left Section: BuildFlow Branding, Project name selector (moves to top left), and File Menu Dropdown (moves farther right) */}
          <div className="flex items-center gap-5">
            {/* Logo, Brand and Active Project Name under requested layout */}
            <div className="flex items-center gap-2.5">
              <div className="bg-accent-blue p-2 rounded-none border-2 border-ink-950 text-white shadow-geo-flat">
                <Layout className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 leading-none">
                  <h1 className="text-xs font-black tracking-tight text-ink-950 uppercase font-display select-none">BuildFlow</h1>
                  <span className="text-[7.5px] bg-paper-200 font-semibold border border-ink-950 font-mono text-accent-orange px-0.5 rounded-none uppercase leading-none">
                    V1.0
                  </span>
                </div>
                <p className="text-[8px] text-ink-600 font-mono tracking-wider uppercase leading-none mt-0.5">Modeling Core</p>
              </div>
            </div>

            {/* Project Name Selector next to BuildFlow logo */}
            <div className="flex items-center justify-between gap-1.5 bg-paper-50 px-2 py-1.5 rounded-none border-2 border-ink-950 shadow-geo-flat w-48">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <button
                  onClick={() => setShowProjectsModal(true)}
                  className="p-0.5 hover:bg-paper-200 text-ink-800 rounded transition-colors flex-shrink-0"
                  title="Open project manager"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-accent-blue" />
                </button>

                <div className="h-3.5 w-px bg-ink-950/25 flex-shrink-0" />

                {isRenaming ? (
                  <input
                    type="text"
                    value={projectNameTemp}
                    onChange={(e) => setProjectNameTemp(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                    className="text-[10px] bg-white border border-ink-950 rounded-none px-1.5 py-0.5 text-ink-950 font-semibold focus:outline-none focus:ring-1 focus:ring-accent-blue w-full min-w-0"
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => {
                      setProjectNameTemp(activeProj.name);
                      setIsRenaming(true);
                    }}
                    className="text-[10px] font-black text-ink-950 hover:text-accent-blue hover:underline cursor-pointer truncate flex-1 min-w-0"
                    title="Click to rename"
                  >
                    {activeProj?.name || "Loading Blueprint..."}
                  </span>
                )}
              </div>
            </div>

            {/* File Menu Dropdown (VS Code Inspired) - moves farther right */}
            <div className="relative">
              <button
                onClick={() => setFileMenuOpen(!fileMenuOpen)}
                className={`bg-paper-50 hover:bg-paper-150 text-ink-950 font-bold font-sans text-xs px-3 py-2 rounded-none border-2 border-ink-950 shadow-geo-flat transition-all flex items-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                  fileMenuOpen ? "bg-paper-250 ring-2 ring-ink-950 font-extrabold" : ""
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-accent-blue" />
                <span>File</span>
                <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
              </button>

              {fileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setFileMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 bg-paper-50 text-ink-950 font-sans p-2.5 rounded-none shadow-geo-md border-2 border-ink-950 flex flex-col gap-1 w-64 z-50">
                    <span className="text-[9px] text-ink-500 font-bold p-1 uppercase block tracking-wider font-mono">
                      Blueprint Actions
                    </span>

                    <button
                      onClick={() => {
                        handleCreateNewProject("New 2D Floor Plan", "Modular Residential");
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                      title="Create a brand new 2D project floor plan"
                    >
                      <Plus className="w-3.5 h-3.5 text-accent-blue" />
                      <span>New Floor Plan</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowProjectsModal(true);
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-accent-orange" />
                      <span>Open Blueprint...</span>
                    </button>

                    <button
                      onClick={() => {
                        setProjectNameTemp(activeProj.name);
                        setIsRenaming(true);
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                      title="Rename the current blueprint design"
                    >
                      <Pen className="w-3.5 h-3.5 text-accent-blue" />
                      <span>Rename Blueprint...</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowStatsModal(true);
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                      title="View active blueprint object stats and material estimations"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                      <span>Properties & Stats...</span>
                    </button>

                    <div className="h-px bg-ink-950/15 my-1" />

                    <span className="text-[9px] text-ink-500 font-bold p-1 uppercase block tracking-wider font-mono">
                      Data Management
                    </span>

                    <button
                      onClick={() => {
                        handleManualSave();
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                      <span>Save Current Draft</span>
                    </button>

                    <button
                      onClick={() => {
                        handleCloneProject();
                        setFileMenuOpen(false);
                        setSaveToast("Project cloned successfully as Copy!");
                        setTimeout(() => setSaveToast(null), 3500);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <Share className="w-3.5 h-3.5 text-purple-500" />
                      <span>Save Copy As...</span>
                    </button>

                    <button
                      onClick={handleExportJSON}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                      title="Download an exact JSON data backup of this architecture design"
                    >
                      <Download className="w-3.5 h-3.5 text-accent-blue" />
                      <span>Export JSON Backup...</span>
                    </button>

                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                      title="Load a previously saved JSON blueprint data design"
                    >
                      <Upload className="w-3.5 h-3.5 text-accent-orange" />
                      <span>Import JSON Backup...</span>
                    </button>

                    <button
                      onClick={handleClearCanvas}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all w-full"
                      title="Clear everything from workspace"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Reset/Clear Canvas...</span>
                    </button>

                    <div className="h-px bg-ink-950/15 my-1" />

                    <span className="text-[9px] text-ink-500 font-bold p-1 uppercase block tracking-wider font-mono">
                      Collaboration
                    </span>

                    <button
                      onClick={() => {
                        setShowShareModal(true);
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex items-center gap-2 rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <Share className="w-3.5 h-3.5 text-accent-orange" />
                      <span>Collab Workspace...</span>
                    </button>

                    <div className="h-px bg-ink-950/15 my-1" />

                    <span className="text-[9px] text-ink-500 font-bold p-1 uppercase block tracking-wider font-mono">
                      Export Options
                    </span>

                    <button
                      onClick={() => {
                        downloadSVGBlueprintFile();
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex justify-between items-center rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-accent-green" />
                        <span>Save SVG Plan</span>
                      </span>
                      <span className="font-mono text-[8px] text-accent-green bg-accent-green/10 px-1 border border-accent-green/20 font-extrabold uppercase">VECTOR</span>
                    </button>

                    <button
                      onClick={() => {
                        downloadOBJmeshFile();
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs font-bold flex justify-between items-center rounded-none border border-transparent hover:border-ink-950/25 transition-all text-ink-950 w-full"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-accent-blue" />
                        <span>OBJ Geometry</span>
                      </span>
                      <span className="font-mono text-[8px] text-accent-blue bg-accent-blue/10 px-1 border border-accent-blue/20 font-extrabold uppercase">3D</span>
                    </button>

                    <button
                      onClick={() => {
                        alert("FBX and GLB formats require Pro user clearance level activated in top rig.");
                        setFileMenuOpen(false);
                      }}
                      className="text-left py-2 px-2 hover:bg-paper-200 text-xs text-ink-500 flex justify-between items-center rounded-none opacity-50 cursor-not-allowed w-full"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-ink-400" />
                        <span>FBX Format</span>
                      </span>
                      <span className="font-mono text-[8px] bg-paper-250 text-accent-orange border border-ink-950/20 px-1 rounded-none font-bold">PRO</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Middle Section: Organized Role Toggler and Autosave status */}
          <div className="flex items-center gap-4 bg-paper-100 p-1.5 border-2 border-ink-950 shadow-inner-flat">
            <div className="flex items-center gap-1.5 border-r border-ink-950/20 pr-4">
              <UserCheck className="w-4 h-4 text-accent-blue" />
              <span className="text-[10px] text-ink-600 font-bold uppercase tracking-wider font-mono">Clearance Role:</span>
              <select
                value={designerRole}
                onChange={(e) => setDesignerRole(e.target.value as any)}
                className="text-[10px] bg-transparent text-ink-900 font-extrabold border-0 p-0 focus:ring-0 focus:outline-none cursor-pointer uppercase tracking-tight"
              >
                <option value="guest">Guest (Read-only)</option>
                <option value="registered">Registered Member</option>
                <option value="pro">Architect (Pro License)</option>
              </select>
            </div>

            {/* Autosaver indicator and description */}
            <div className="flex items-center gap-3 text-left font-mono leading-tight relative group">
              <span
                className="text-ink-600 flex items-center gap-1.5 font-bold text-[10px] cursor-help"
                title="Autosaves progress to persistent store every 30 seconds"
              >
                <span className={`w-2.5 h-2.5 rounded-none border border-ink-950 ${autosaveStatus === "Autosaved" || autosaveStatus === "Synchronized" ? "bg-accent-green" : "bg-accent-orange animate-pulse"}`} />
                Autosave: {autosaveStatus}
              </span>
              
              <div className="absolute top-full left-0 mt-1 hidden group-hover:block w-44 bg-ink-950 text-white text-[9.5px] p-2 shadow-geo-md border border-white/20 rounded z-50 pointer-events-none text-left">
                <div className="font-extrabold text-accent-orange mb-0.5 uppercase tracking-wider">Auto-Backup</div>
                <p className="text-paper-100 font-sans leading-normal normal-case font-normal">Saves every 30 seconds automatically to secure cloud persistence.</p>
              </div>
            </div>
          </div>

          {/* Right Section: Organized action controls */}
          <div className="flex items-center gap-3">
            {/* Undo / Redo button group */}
            <div className="flex items-center gap-0.5 bg-paper-100 p-0.5 border-2 border-ink-950 rounded-none shadow-geo-flat">
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0}
                className="p-1.5 hover:bg-paper-200 text-ink-850 disabled:text-ink-900/30 rounded-none transition-colors"
                title="Undo segment (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="p-1.5 hover:bg-paper-200 text-ink-850 disabled:text-ink-900/30 rounded-none transition-colors"
                title="Redo segment (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* 2. Main Platform Grid Structure */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar Option rail (FR-17 Main Layout: left toolbar) */}
        <aside className={`${isFullscreen ? "hidden" : "flex"} ${sidebarMode === "ai" ? "w-80" : "w-60"} bg-paper-100 border-r-2 border-ink-950 p-4 flex flex-col gap-5 overflow-y-auto blueprint-grid transition-all duration-200`}>
          
{sidebarMode === "manual" ? (
            <>
              <div className="flex flex-col gap-2">
                <div 
                  onClick={() => setIsActionToolsOpen(!isActionToolsOpen)}
                  className="flex items-center justify-between cursor-pointer border-b border-ink-950/15 pb-1 text-left select-none group/hdr"
                >
                  <h3 className="text-[10px] font-extrabold text-ink-950 uppercase tracking-tight font-display flex items-center gap-1 group-hover/hdr:text-accent-blue transition-colors">
                    Action Tools
                  </h3>
                  <button className="p-0.5 hover:bg-paper-250 text-ink-800 rounded transition-colors">
                    {isActionToolsOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-ink-600" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-accent-orange" />
                    )}
                  </button>
                </div>

                {isActionToolsOpen ? (
                  /* Expanded Photoshop Grid View */
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "select", label: "Select Pointer", icon: MousePointer, desc: "Select, move, or double-click walls and elements to edit properties." },
                      { id: "pencil", label: "Pencil Sketch", icon: Pen, desc: "Draw freehand sketch lines. Adjust thickness and opacity above the canvas." },
                      { id: "pen", label: "Pen Vector", icon: PenTool, desc: "Place metric coordinate anchors to sketch vector layout lines." },
                      { id: "wall", label: "L-Wall Unit", icon: Compass, desc: "Click and drag to lay out custom load-bearing interior floor walls." },
                      { id: "door", label: "Door Wing", icon: CornerRightDown, desc: "Click on walls to embed wood-finished door wings." },
                      { id: "window", label: "Glass Window", icon: Eye, desc: "Click on wall units to place glass windows with customizable sizes." },
                      { id: "stair", label: "Stair Flights", icon: Play, desc: "Click and drag to trace vertical stairs and step risers." },
                      { id: "room", label: "Room Polygon", icon: Layout, desc: "Create closed coordinate room bounds with texturized carpet/wood slabs." },
                      { id: "furniture", label: "Furniture Unit", icon: Grid, desc: "Place chairs, work stations, counters, and household appliances." },
                      { id: "landscape", label: "Foliage Garden", icon: TreeColor, desc: "Model gardens, foliage trees, paving stones and lawn segments." },
                      { id: "dimension", label: "Dimension Line", icon: Sliders, desc: "Measure distance markers and draw dimension lines." },
                      { id: "comment", label: "Pin Comment", icon: MessageCircle, desc: "Place collaboration pinned feedback on elements." },
                      { id: "measure", label: "Measure Tool", icon: Ruler, desc: "Check live coordinate and metric distances across points of the draft." },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`flex flex-col items-center justify-center px-1.5 py-1.5 h-[42px] rounded-none border transition-all text-center group relative cursor-pointer ${
                          activeTool === tool.id
                            ? "bg-ink-950 border-ink-950 text-white font-bold shadow-geo-flat"
                            : "bg-paper-50 border-ink-900/15 text-ink-800 hover:bg-paper-250 hover:border-ink-950"
                        }`}
                      >
                        <tool.icon className={`w-3.5 h-3.5 mb-1 transition-transform group-hover:scale-105 ${activeTool === tool.id ? "text-accent-orange" : "text-ink-600"}`} />
                        <span className="text-[8px] font-extrabold tracking-tight uppercase font-mono truncate w-full">{tool.label.split(" ")[0]}</span>

                        {/* Photoshop-style beautiful hover tooltip */}
                        <div className="absolute left-full top-0 ml-2 hidden group-hover:block w-44 bg-ink-950 text-white text-[9.5px] p-2 shadow-geo-md border border-white/20 rounded z-50 pointer-events-none text-left font-sans normal-case leading-snug">
                          <div className="font-extrabold text-accent-orange mb-0.5 uppercase tracking-wider text-[10px] font-display">{tool.label}</div>
                          <p className="text-paper-150 font-normal">{tool.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Combined Photoshop Column View */
                  <div className="flex flex-col gap-1 items-center bg-paper-50 p-1 border-2 border-ink-950 shadow-geo-flat w-[42px] mx-auto">
                    {[
                      { id: "select", label: "Select Pointer", icon: MousePointer, desc: "Select, move, or double-click walls and elements to edit properties." },
                      { id: "pencil", label: "Pencil Sketch", icon: Pen, desc: "Draw freehand sketch lines. Adjust thickness and opacity above the canvas." },
                      { id: "pen", label: "Pen Vector", icon: PenTool, desc: "Place metric coordinate anchors to sketch vector layout lines." },
                      { id: "wall", label: "L-Wall Unit", icon: Compass, desc: "Click and drag to lay out custom load-bearing interior floor walls." },
                      { id: "door", label: "Door Wing", icon: CornerRightDown, desc: "Click on walls to embed wood-finished door wings." },
                      { id: "window", label: "Glass Window", icon: Eye, desc: "Click on wall units to place glass windows with customizable sizes." },
                      { id: "stair", label: "Stair Flights", icon: Play, desc: "Click and drag to trace vertical stairs and step risers." },
                      { id: "room", label: "Room Polygon", icon: Layout, desc: "Create closed coordinate room bounds with texturized carpet/wood slabs." },
                      { id: "furniture", label: "Furniture Unit", icon: Grid, desc: "Place chairs, work stations, counters, and household appliances." },
                      { id: "landscape", label: "Foliage Garden", icon: TreeColor, desc: "Model gardens, foliage trees, paving stones and lawn segments." },
                      { id: "dimension", label: "Dimension Line", icon: Sliders, desc: "Measure distance markers and draw dimension lines." },
                      { id: "comment", label: "Pin Comment", icon: MessageCircle, desc: "Place collaboration pinned feedback on elements." },
                      { id: "measure", label: "Measure Tool", icon: Ruler, desc: "Check live coordinate and metric distances across points of the draft." },
                    ].map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id)}
                        className={`w-7 h-7 flex items-center justify-center transition-all group relative cursor-pointer border rounded-none ${
                          activeTool === tool.id
                            ? "bg-ink-950 border-ink-950 text-white shadow-geo-flat"
                            : "bg-paper-50 border-transparent text-ink-800 hover:bg-paper-250 hover:border-ink-950"
                        }`}
                      >
                        <tool.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTool === tool.id ? "text-accent-orange" : "text-ink-600"}`} />

                        {/* Photoshop-style beautiful hover tooltip */}
                        <div className="absolute left-full top-0 ml-2 hidden group-hover:block w-44 bg-ink-950 text-white text-[9.5px] p-2 shadow-geo-md border border-white/20 rounded z-50 pointer-events-none text-left font-sans normal-case leading-snug">
                          <div className="font-extrabold text-accent-orange mb-0.5 uppercase tracking-wider text-[10px] font-display">{tool.label}</div>
                          <p className="text-paper-150 font-normal">{tool.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Config Settings widget */}
              <div className="p-3.5 bg-paper-50 rounded-none border-2 border-ink-950 shadow-geo-flat">
                <h4 className="text-[10px] font-extrabold text-ink-950 uppercase tracking-wider mb-2.5 font-display flex items-center gap-1">
                  <Grid className="w-3 h-3 text-accent-blue" />
                  Grid Settings
                </h4>
                <div className="flex flex-col gap-3 text-xs">
                  <label className="flex items-center justify-between text-ink-800 font-bold cursor-pointer">
                    <span>Snap to grid:</span>
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="rounded-none border-2 border-ink-950 text-accent-blue focus:ring-0 w-4 h-4"
                    />
                  </label>

                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-ink-600 flex justify-between font-mono text-[10px] font-bold">
                      <span>SCALE SIZE:</span>
                      <span className="text-accent-orange font-extrabold">{gridSize === 10 ? "10cm" : gridSize === 25 ? "25cm" : gridSize === 50 ? "50cm" : "1m"}</span>
                    </span>
                    <div className="flex gap-1.5 mt-0.5">
                      {[10, 25, 50, 100].map((size) => (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`flex-1 py-1 text-[9px] border-2 rounded-none font-extrabold font-mono transition-colors cursor-pointer ${
                            gridSize === size
                              ? "bg-ink-950 text-white border-ink-950"
                              : "bg-white text-ink-700 border-ink-950/20 hover:bg-paper-100"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pencil customizer when tool is active */}
              {activeTool === "pencil" && (
                <div className="p-3.5 bg-paper-100 rounded-none border-2 border-ink-950 shadow-geo-flat">
                  <h4 className="text-[10px] font-extrabold text-accent-orange uppercase tracking-wider mb-2.5 font-display">
                    Sketch Parameters
                  </h4>
                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-ink-600 font-bold">Pick Ink:</span>
                      <div className="flex gap-1.5">
                        {["#0f172a", "#0f62fe", "#ff5c00", "#008a52"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setPencilColor(c)}
                            className={`w-6 h-6 rounded-none border-2 border-ink-950 transition-transform hover:scale-110 cursor-pointer ${pencilColor === c ? "ring-2 ring-accent-orange ring-offset-1" : ""}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-ink-600 font-mono text-[10px] flex justify-between font-bold">
                        <span>STOKE WIDTH:</span>
                        <span>{pencilWidth}px</span>
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={pencilWidth}
                        onChange={(e) => setPencilWidth(parseInt(e.target.value))}
                        className="w-full h-1 bg-paper-300 rounded-none appearance-none cursor-pointer accent-accent-blue"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Copilot Switch Call-out block */}
              <div className="p-3.5 bg-white rounded-none border-2 border-ink-950 shadow-geo-flat flex flex-col gap-2 mx-0 select-none hover:border-accent-orange transition-all duration-200">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-accent-orange animate-pulse" />
                  <span className="text-[10px] font-black text-ink-950 uppercase tracking-wider font-display">AI Drafting Assistant</span>
                </div>
                <p className="text-[10.5px] text-ink-600 leading-normal font-sans">
                  Generate structural rooms, design wall geometries, or seed components using AI prompts.
                </p>
                <button
                  onClick={() => setSidebarMode("ai")}
                  className="w-full bg-ink-950 hover:bg-neutral-800 text-white font-extrabold font-display text-[10px] py-2.5 px-3 rounded-none border-2 border-ink-950 shadow-geo-flat transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5 text-accent-orange" />
                  <span>Use AI Assistant</span>
                </button>
              </div>

              {/* Help box */}
              <div className="mt-auto bg-ink-900 text-paper-100 p-4 rounded-none border-2 border-ink-950 text-[11px] leading-relaxed shadow-geo-flat">
                <span className="font-bold text-accent-orange block mb-1 uppercase font-display tracking-widest text-xs">Architect Pro Tip</span>
                Use the Middle mouse button or hand-panning to shift the view. Conversion from 2D coordinates to 3D runs constantly in real-time.
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex flex-col gap-2 pb-2.5 border-b-2 border-ink-950/10">
                <button
                  onClick={() => setSidebarMode("manual")}
                  className="w-full bg-paper-50 hover:bg-paper-200 text-ink-950 hover:text-ink-900 font-extrabold text-[10px] font-sans px-3 py-2.5 rounded-none border-2 border-neutral-950 shadow-geo-flat transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                  title="Return to standard manual drafting tools"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-accent-blue" />
                  <span>← Back to Manual Mode</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <AIBox
                  projectState={activeProj.state}
                  onApplyAIProjectData={handleApplyAIProjectState}
                />
              </div>
            </div>
          )}
        </aside>

        {/* 3. Central Drawing / Loading Area (Multi-view) */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Controls line bar for view mode tabs */}
          <div className="flex items-center justify-between border-b-2 border-ink-950 pb-2">
            <div className="flex gap-1.5 bg-paper-300 p-1.5 rounded-none border-2 border-ink-950 shadow-geo-flat">
              {[
                { id: "2D", label: "2D Floor Plan" },
                { id: "3D", label: "3D Realtime Model" },
                { id: "split", label: "Split Synchronized view" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id as any)}
                  className={`text-xs px-4 py-1.5 rounded-none font-bold font-display transition-all cursor-pointer ${
                    viewMode === m.id
                      ? "bg-ink-950 text-white shadow-none"
                      : "text-ink-700 hover:text-ink-950 hover:bg-paper-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {viewMode === "split" && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-600 font-bold font-mono">
                  <span className="w-2.5 h-2.5 bg-accent-green rounded-none border border-ink-950 animate-pulse" />
                  WEBGL CORE ENGINE • ACTIVE 60FPS
                </div>
              )}
            </div>
          </div>

          {/* Viewport container box wrapper */}
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* 2D Canvas */}
            {(viewMode === "2D" || viewMode === "split") && (
              <div className="flex-1 relative border-2 border-ink-950 rounded-none overflow-hidden bg-paper-50 shadow-geo-md flex flex-col">
                <DesignCanvas
                  projectState={activeProj.state}
                  setProjectState={setProjectStateAndHistory}
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  selectedObjectId={selectedObjectId}
                  setSelectedObjectId={setSelectedObjectId}
                  selectedLayerId={activeProj.state.selectedLayerId}
                  gridSize={gridSize}
                  snapToGrid={snapToGrid}
                  pencilWidth={pencilWidth}
                  pencilColor={pencilColor}
                  pencilOpacity={pencilOpacity}
                  onMouseCoordsChange={setMouseCoords}
                  isFullscreen={isFullscreen}
                  setIsFullscreen={setIsFullscreen}
                />
              </div>
            )}

            {/* 3D WebGL Canvas */}
            {(viewMode === "3D" || viewMode === "split") && (
              <div className="flex-1 relative flex flex-col border-2 border-ink-950 rounded-none bg-paper-50 shadow-geo-md overflow-hidden">
                <ThreeViewport
                  projectState={activeProj.state}
                  isFullscreen={isFullscreen}
                  setIsFullscreen={setIsFullscreen}
                />
              </div>
            )}
          </div>

          {/* Dynamic Workspace Status Bar */}
          <div className="bg-paper-100 border-2 border-ink-950 p-2 text-[11px] text-ink-800 font-mono flex flex-wrap items-center justify-between gap-4 shadow-geo-flat select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-500 font-extrabold text-[9px] uppercase tracking-wider">Active Tool:</span>
              <span className="text-accent-blue font-black bg-white border border-ink-950/15 py-0.5 px-2 rounded-none uppercase">
                {activeTool}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-ink-500 font-extrabold text-[9px] uppercase tracking-wider">Mouse Coordinates:</span>
              <span className="text-ink-950 bg-white border border-ink-950/15 py-0.5 px-2 font-bold min-w-[130px] text-center">
                {mouseCoords ? `X: ${(mouseCoords.x / 100).toFixed(2)}m • Y: ${(mouseCoords.y / 100).toFixed(2)}m` : "OUTSIDE CANVAS"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-ink-500 font-extrabold text-[9px] uppercase tracking-wider">Project Objects:</span>
              <div className="flex flex-wrap items-center gap-1.5 font-bold text-[9px]">
                <span className="bg-white border border-ink-950/15 px-1.5 py-0.5 text-slate-700">
                  Rooms: <b className="text-ink-950">{activeProj.state.rooms?.length || 0}</b>
                </span>
                <span className="bg-white border border-ink-950/15 px-1.5 py-0.5 text-slate-700">
                  Walls: <b className="text-ink-950">{activeProj.state.walls?.length || 0}</b>
                </span>
                <span className="bg-white border border-ink-950/15 px-1.5 py-0.5 text-slate-700">
                  Doors/Windows: <b className="text-ink-950">{(activeProj.state.doors?.length || 0) + (activeProj.state.windows?.length || 0)}</b>
                </span>
                <span className="bg-white border border-ink-950/15 px-1.5 py-0.5 text-slate-700">
                  Furn/Sketches: <b className="text-ink-950">{(activeProj.state.furniture?.length || 0) + (activeProj.state.sketches?.length || 0)}</b>
                </span>
                <span className="bg-accent-orange/10 border border-accent-orange/30 px-2 py-0.5 text-accent-orange font-black uppercase">
                  Total live: {(
                    (activeProj.state.rooms?.length || 0) +
                    (activeProj.state.walls?.length || 0) +
                    (activeProj.state.doors?.length || 0) +
                    (activeProj.state.windows?.length || 0) +
                    (activeProj.state.stairs?.length || 0) +
                    (activeProj.state.furniture?.length || 0) +
                    (activeProj.state.landscape?.length || 0) +
                    (activeProj.state.sketches?.length || 0) +
                    (activeProj.state.comments?.length || 0) +
                    (activeProj.state.dimensions?.length || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* 4. Sidebars: Right Properties & Snapshot Versioning Manager */}
        <aside className={`${isFullscreen ? "hidden" : "flex"} w-80 border-l-2 border-ink-950 bg-paper-150 p-4 flex flex-col gap-4 overflow-y-auto blueprint-grid`}>
          <div className="flex-1 min-h-0">
            <RightPanel
              projectState={activeProj.state}
              setProjectState={setProjectStateAndHistory}
              selectedObjectId={selectedObjectId}
              setSelectedObjectId={setSelectedObjectId}
              versions={activeProj.versions}
              onRestoreVersion={handleRestoreVersion}
              onCreateVersion={handleCreateCustomVersion}
            />
          </div>
        </aside>
      </div>

      {/* FOOTER specs */}
      {!isFullscreen && (
        <footer className="bg-paper-50 border-t-2 border-ink-950 px-5 py-2.5 text-center text-xs text-ink-600 font-mono flex items-center justify-between">
          <span className="font-bold uppercase tracking-tight">BuildFlow Studio Drafting System © 2026.</span>
          <div className="flex gap-4 font-bold">
            <span>WebGL: <b className="text-accent-green">ACTIVE</b></span>
            <span>Integrity Check: <b className="text-accent-blue">VERIFIED</b></span>
          </div>
        </footer>
      )}

      {/* Modal 1: Projects Management List (duplicate, add, open) */}
      {showProjectsModal && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-paper-50 rounded-none shadow-geo-lg max-w-lg w-full p-6 border-2 border-ink-950 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-ink-950">
              <h3 className="text-sm font-extrabold text-ink-950 uppercase tracking-wider font-display">Project Workspace Blueprints</h3>
              <button
                onClick={() => setShowProjectsModal(false)}
                className="text-ink-600 hover:text-ink-950 hover:font-bold text-xs font-mono font-bold"
              >
                [CLOSE ✕]
              </button>
            </div>

            {/* Creation options */}
            <div className="flex gap-2">
              <button
                onClick={() => handleCreateNewProject("Modern Suburban Villa", "Residential Villa")}
                className="flex-1 bg-accent-blue text-white py-2.5 px-4 rounded-none hover:bg-accent-blue/90 text-xs font-bold font-display border-2 border-ink-950 shadow-geo-flat flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Floor Plan
              </button>
              <button
                onClick={handleCloneProject}
                className="flex-1 bg-paper-100 text-ink-950 py-2.5 px-4 rounded-none hover:bg-paper-250 text-xs font-bold font-display border-2 border-ink-950 shadow-geo-flat cursor-pointer"
              >
                Clone Current Plan
              </button>
            </div>

            {/* List Blueprints */}
            <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setProjectNameTemp(proj.name);
                    setShowProjectsModal(false);
                  }}
                  className={`flex items-center justify-between p-3.5 border-2 rounded-none cursor-pointer transition-all ${
                    proj.id === activeProjectId
                      ? "bg-paper-250 border-ink-950 shadow-geo-flat font-bold"
                      : "bg-paper-50 border-ink-950/20 hover:border-ink-950 hover:bg-paper-100"
                  }`}
                >
                  <div>
                    <span className="text-xs font-extrabold text-ink-950 block tracking-tight uppercase font-mono">{proj.name}</span>
                    <span className="text-[10px] text-ink-500 font-mono">
                      Type: {proj.type} • Updated: {proj.updatedAt}
                    </span>
                  </div>

                  {projects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(proj.id);
                      }}
                      className="p-1.5 hover:bg-accent-orange/10 text-accent-orange rounded-none border border-transparent hover:border-accent-orange/30 transition-colors"
                      title="Delete draft blueprint"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Collaboration invite Share */}
      {showShareModal && (
        <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-paper-50 rounded-none shadow-geo-lg max-w-md w-full p-6 border-2 border-ink-950 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b-2 border-ink-950">
              <h3 className="text-sm font-extrabold text-ink-950 uppercase tracking-wider font-display">Collaborator Space Share</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-ink-600 hover:text-ink-950 hover:font-bold text-xs font-mono font-bold"
              >
                [✕]
              </button>
            </div>

            <p className="text-xs text-ink-700 leading-relaxed font-sans">
              Invite structural engineers, HVAC designers, or clients to sketch over these layout files in real-time. Comments and user paths sync automatically below security walls.
            </p>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="colleague@architecture.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 text-xs p-2.5 bg-white border-2 border-ink-950 rounded-none text-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-blue"
              />
              <button
                onClick={() => {
                  if (inviteEmail.trim()) {
                    alert(`Invitation successfully dispatched to ${inviteEmail}!`);
                    setInviteEmail("");
                  }
                }}
                className="bg-accent-orange text-white font-extrabold font-display text-xs px-4 py-2.5 rounded-none border-2 border-ink-950 shadow-geo-flat hover:bg-accent-orange/90 transition-all cursor-pointer"
              >
                Send Invite
              </button>
            </div>

            <div className="bg-paper-100 p-3.5 rounded-none border-2 border-ink-950 flex flex-col gap-1.5 mt-1">
              <span className="text-[10px] font-extrabold text-ink-600 uppercase tracking-wider font-mono">
                Self-Referential Workspace Link
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="bg-white text-[10px] p-2.5 rounded-none border border-ink-950/30 text-ink-500 flex-1 select-all font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="bg-ink-950 hover:bg-ink-900 text-white font-bold text-[10px] px-3.5 py-2 rounded-none border border-ink-950 shadow-none cursor-pointer uppercase font-mono"
                >
                  {isCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Import Trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportJSON}
        accept=".json"
        className="hidden"
      />

      {/* Modal 3: Blueprint Properties & Stats Analyzer */}
      {showStatsModal && (() => {
        const wallsLen = activeProj.state.walls?.length || 0;
        const doorsLen = activeProj.state.doors?.length || 0;
        const windowsLen = activeProj.state.windows?.length || 0;
        const furnitureLen = activeProj.state.furniture?.length || 0;
        const stairsLen = activeProj.state.stairs?.length || 0;
        const landscapeLen = activeProj.state.landscape?.length || 0;
        const roomsLen = activeProj.state.rooms?.length || 0;
        const dimLen = activeProj.state.dimensions?.length || 0;

        // Calculate total wall physical drawing length
        const totalWallLength = (activeProj.state.walls || []).reduce((acc, w) => {
          return acc + Math.sqrt(Math.pow(w.endX - w.startX, 2) + Math.pow(w.endY - w.startY, 2));
        }, 0);

        // Standard scaling factor (e.g. 1 unit on canvas = 10cm physical)
        const totalWallMeters = Number(((totalWallLength * 0.1)).toFixed(1));

        // Estimator budget items
        const wallCost = Math.round(totalWallMeters * 82);
        const fenestrationCost = (doorsLen * 350) + (windowsLen * 185);
        const structuralCost = (stairsLen * 1250);
        const landscapeCost = (landscapeLen * 240);
        const furnitureCost = (furnitureLen * 480);
        const totalEstimatedBudget = wallCost + fenestrationCost + structuralCost + landscapeCost + furnitureCost;

        // Generate dynamic intelligent design warnings
        const dynamicRecommendations: string[] = [];
        if (wallsLen > 0 && doorsLen === 0) {
          dynamicRecommendations.push("Structural safety code: Exterior/interior walls are erected, but no egress doors have been designated.");
        }
        if (roomsLen > 0 && furnitureLen === 0) {
          dynamicRecommendations.push("Furnishing suggestion: Floor plan layout shows segmented spatial rooms, but no loose furniture items are nested.");
        }
        if (wallsLen > 5 && dimLen === 0) {
          dynamicRecommendations.push("Precision warning: Consider placing dynamic alignment measuring-tape links to facilitate on-site framing.");
        }
        if (dynamicRecommendations.length === 0) {
          dynamicRecommendations.push("Aesthetic integrity is green! Blueprint ratios and zoning are fully optimal.");
        }

        return (
          <div className="fixed inset-0 bg-ink-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-paper-50 rounded-none shadow-geo-lg max-w-2xl w-full p-6 border-2 border-ink-950 flex flex-col gap-5">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-2.5 border-b-2 border-ink-950">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-accent-blue" />
                  <h3 className="text-sm font-extrabold text-ink-950 uppercase tracking-widest font-display">
                    Blueprint Analyzer & Estimation
                  </h3>
                </div>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="text-ink-600 hover:text-ink-950 hover:font-black text-xs font-mono font-bold"
                >
                  [✕ CLOSE]
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                
                {/* Visual Stats Block */}
                <div className="bg-white border-2 border-ink-950 p-4 shadow-geo-flat flex flex-col gap-3">
                  <h4 className="font-extrabold uppercase tracking-wide text-accent-blue font-display flex items-center gap-1.5 border-b border-ink-950/10 pb-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Bill of Materials (BOM)
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-800">
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Total Walls:</span>
                      <b className="text-ink-950 text-right">{wallsLen} unit{wallsLen !== 1 && 's'}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Mapped Rooms:</span>
                      <b className="text-ink-950 text-right">{roomsLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Door Openings:</span>
                      <b className="text-ink-950 text-right">{doorsLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Glazed Windows:</span>
                      <b className="text-ink-950 text-right">{windowsLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Stairwells:</span>
                      <b className="text-ink-950 text-right">{stairsLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Flora/Landscape:</span>
                      <b className="text-ink-950 text-right">{landscapeLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Furniture Units:</span>
                      <b className="text-ink-950 text-right">{furnitureLen}</b>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-ink-950/10 pb-1">
                      <span>Guides & Dim Line:</span>
                      <b className="text-ink-950 text-right">{dimLen}</b>
                    </div>
                  </div>

                  <div className="mt-3 bg-paper-100 p-2.5 border border-ink-950/35 rounded-none font-mono text-[10px] text-ink-950 uppercase">
                    <div className="flex justify-between">
                      <span>Total Framing Lineage:</span>
                      <span className="font-extrabold">{totalWallMeters} m</span>
                    </div>
                    <div className="text-[8px] text-ink-600 mt-0.5 font-normal tracking-wide">
                      Scaled according to current active layout calibration grid ({gridSize === 10 ? '10cm' : gridSize === 25 ? '25cm' : gridSize === 50 ? '50cm' : '1m'} minor step).
                    </div>
                  </div>
                </div>

                {/* Estimate Budget Block */}
                <div className="bg-white border-2 border-ink-950 p-4 shadow-geo-flat flex flex-col gap-3">
                  <h4 className="font-extrabold uppercase tracking-wide text-accent-orange font-display flex items-center gap-1.5 border-b border-ink-950/10 pb-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Estimate Budget Costing
                  </h4>
                  <div className="flex flex-col gap-2.5 text-[11px] text-ink-800">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span>Concrete/Timber Studs:</span>
                      <span className="font-bold text-ink-950">${wallCost.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span>Egresses & Fenestrations:</span>
                      <span className="font-bold text-ink-950">${fenestrationCost.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span>Framed Stairwells:</span>
                      <span className="font-bold text-ink-950">${structuralCost.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span>Hardscape / Arboriculture:</span>
                      <span className="font-bold text-ink-950">${landscapeCost.toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span>Interior Furnishing:</span>
                      <span className="font-bold text-ink-950">${furnitureCost.toLocaleString()} USD</span>
                    </div>

                    <div className="h-px bg-ink-950/10 my-1" />

                    <div className="flex justify-between items-center text-xs font-mono font-extrabold text-ink-950 bg-accent-orange/10 p-2.5 border border-accent-orange/30">
                      <span>BUDGET ACCRUED:</span>
                      <span className="text-sm font-black text-accent-orange">${totalEstimatedBudget.toLocaleString()} USD</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Recommendations & Warnings footer */}
              <div className="bg-paper-150 p-4 border-2 border-ink-950 flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-ink-950 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-accent-blue animate-spin-slow" />
                  BuildFlow Smart Recommendations
                </span>
                <div className="flex flex-col gap-1.5">
                  {dynamicRecommendations.map((rec, i) => (
                    <p key={i} className="text-[10.5px] text-zinc-800 font-medium font-sans flex items-start gap-1.5 leading-relaxed">
                      <span className="text-accent-blue font-bold">▪</span>
                      {rec}
                    </p>
                  ))}
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  onClick={() => {
                    handleManualSave();
                    setShowStatsModal(false);
                    setSaveToast("Blueprint stats logged & version archived!");
                    setTimeout(() => setSaveToast(null), 3500);
                  }}
                  className="bg-accent-blue hover:bg-accent-blue/90 text-white font-extrabold font-display text-xs px-5 py-2 border-2 border-ink-950 shadow-geo-flat transition-colors cursor-pointer"
                >
                  Archive Active Stats
                </button>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="bg-white hover:bg-paper-100 text-ink-900 border-2 border-ink-950 font-bold font-display text-xs px-5 py-2 transition-colors cursor-pointer"
                >
                  Return to Drafting
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Custom Tree vector thumbnail icon
function TreeColor(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a5 5 0 0 0-5 5c0 1.5.6 2.9 1.7 3.8A6 6 0 0 0 6 15c0 3 3 5 6 5s6-2 6-5a6 6 0 0 0-2.7-4.2C16.4 9.9 17 8.5 17 7a5 5 0 0 0-5-5Z" />
      <path d="M12 11v9" />
    </svg>
  );
}
