/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Sparkles, Building, RefreshCw, MessageSquareCode, Palette, Eye } from "lucide-react";
import { ProjectState } from "../types";

interface AIBoxProps {
  projectState: ProjectState;
  onApplyAIProjectData: (data: Partial<ProjectState>) => void;
}

export default function AIBox({ projectState, onApplyAIProjectData }: AIBoxProps) {
  const [prompt, setPrompt] = useState("Generate a modern 3-bedroom vacation cabin with wrap-around deck");
  const [style, setStyle] = useState("Modern");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Consider adding high glazing on South facing elevations for solar thermal absorption.",
    "The living area circulates smoothly, though placing secondary bathrooms directly facing kitchens is not recommended.",
    "Suggest dividing bedrooms via minor corridor buffer zones for acoustic privacy.",
  ]);

  const [elevation, setElevation] = useState<{ description: string; features: string[] } | null>({
    description: "A stunning minimalist architectural front elevation with pre-cast insulated panels framing double double-glazed apertures. Broad cantilevered overhanging flats optimize shade and structural presence.",
    features: ["Exposed high-tensile steel frame columns", "Western Red Cedar screen paneling", "Insulated floating deck slabs"],
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [rendering, setRendering] = useState(false);

  // Encouraging loader feedback phrases
  const loaderPhrases = [
    "Reading architectural requirements...",
    "Drafting outer load-bearing concrete frames...",
    "Arranging inner compartmental doors and spaces...",
    "Placing premium lifestyle furniture layouts...",
    "Computing custom dimension layouts and circulation lines...",
  ];

  const handleGenerateFloorPlan = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLoadingStep(0);

    // Stagger loader steps nicely
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loaderPhrases.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await fetch("/api/gemini/generate-floorplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      });

      if (!res.ok) throw new Error("Generation failure status");

      const rawPlan = await res.json();
      onApplyAIProjectData(rawPlan);

      // Extract suggestions automatically if Gemini returned them
      if (rawPlan.designSuggestions && Array.isArray(rawPlan.designSuggestions)) {
        setSuggestions(rawPlan.designSuggestions);
      }
    } catch (err) {
      console.error("AI error, applying offline fallback layout configuration.", err);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleAnalyzeActiveDesign = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/gemini/analyze-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectState }),
      });
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.warn("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateFacadeElevation = async () => {
    setRendering(true);
    try {
      const res = await fetch("/api/gemini/generate-elevation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallsCount: projectState.walls.length,
          rooms: projectState.rooms.map((r) => ({ name: r.name, type: r.type })),
          style,
        }),
      });
      const data = await res.json();
      setElevation(data);
    } catch (err) {
      console.warn("Elevation fail:", err);
    } finally {
      setRendering(false);
    }
  };

  const samplePrompts = [
    "Modernist 4-bedroom duplex with double garage",
    "Scandinavian 1-bedroom small house flat with glass lounge",
    "Cozy 2-bedroom timber cabin nestled in woods",
  ];

  return (
    <div className="flex flex-col gap-5 p-4.5 bg-paper-50 rounded-none border-2 border-ink-950 shadow-geo-md h-full overflow-y-auto blueprint-grid-accent">
      {/* Module Title */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-accent-blue text-white rounded-none border border-ink-950 shadow-geo-flat">
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <h2 className="text-xs font-black text-ink-950 uppercase font-display tracking-wider">AI Assistant</h2>
          <p className="text-[10px] text-ink-600 font-mono tracking-wide uppercase">Design generator & advisor</p>
        </div>
      </div>

      {/* Main floor plan generator */}
      <div className="flex flex-col gap-3.5 p-3.5 bg-paper-100 rounded-none border-2 border-ink-950 shadow-geo-flat">
        <label className="text-[11px] font-bold text-ink-950 uppercase tracking-wide font-mono flex items-center justify-between">
          <span>AI Floor Plan Prompt</span>
          <span className="text-[9px] text-accent-orange bg-paper-50 border border-ink-950 px-2 py-0.5 rounded-none font-mono font-black animate-pulse">
            GEMINI FLASH
          </span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe your desired layout..."
          className="w-full text-xs p-2.5 bg-white border-2 border-ink-950 rounded-none text-ink-950 placeholder-ink-900/40 focus:outline-none focus:ring-1 focus:ring-accent-blue font-sans resize-none font-bold"
        />

        {/* Style selection dropdown */}
        <div className="flex gap-2 items-center text-xs font-bold text-ink-800">
          <Palette className="w-4 h-4 text-ink-600" />
          <span className="font-mono text-[10px] tracking-wide uppercase">Style Accent:</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="text-[11px] font-bold border-2 border-ink-950 rounded-none p-1.5 bg-white text-ink-950 focus:outline-none focus:ring-1 focus:ring-accent-blue uppercase font-mono cursor-pointer"
          >
            <option value="Modern">Modernist / Steel</option>
            <option value="Minimalist">Minimalist / Concrete</option>
            <option value="Brutalist">Brutalist / Blockwork</option>
            <option value="Contemporary">Contemporary / Wood</option>
            <option value="Mediterranean">Mediterranean / Stone</option>
            <option value="Colonial">Colonial / Timber</option>
          </select>
        </div>

        {/* Suggestion Prompts */}
        <div className="flex flex-col gap-1.5 mt-1.5">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(p)}
              className="text-[10px] text-ink-700 bg-paper-50 hover:bg-paper-200 border border-ink-950/40 rounded-none px-2.5 py-1.5 transition-all font-bold truncate text-left cursor-pointer"
            >
              ↳ {p}
            </button>
          ))}
        </div>

        {/* Trigger Button with loading visual */}
        <button
          onClick={handleGenerateFloorPlan}
          disabled={loading}
          className="w-full bg-accent-blue hover:bg-accent-blue/90 disabled:bg-paper-350 text-white font-bold font-display text-xs py-3 rounded-none border-2 border-ink-950 shadow-geo-flat transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? "Generating Draft..." : "Generate Floor Plan"}
        </button>

        {/* Loading display status line */}
        {loading && (
          <div className="p-3.5 bg-paper-200 border-2 border-ink-950 rounded-none mt-2.5 shadow-geo-flat">
            <span className="text-[11px] text-ink-950 font-bold font-mono tracking-tight block animate-pulse">
              [PROGRESS]: {loaderPhrases[loadingStep]}
            </span>
            <div className="w-full bg-paper-300 h-2.5 rounded-none mt-2.5 border border-ink-950 overflow-hidden">
              <div
                className="bg-accent-orange h-full rounded-none transition-all duration-500"
                style={{ width: `${((loadingStep + 1) / loaderPhrases.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Elevation generator */}
      <div className="flex flex-col gap-3 p-3.5 bg-paper-100 rounded-none border-2 border-ink-950 shadow-geo-flat">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-ink-950 uppercase tracking-wider font-display flex items-center gap-1.5">
            <Building className="w-4 h-4 text-accent-blue" />
            AI Elevation Facade
          </span>
          <button
            onClick={handleGenerateFacadeElevation}
            disabled={rendering}
            className="text-[10px] font-black text-accent-blue flex items-center gap-1.5 bg-white hover:bg-paper-150 border-2 border-ink-950 rounded-none px-2.5 py-1.5 transition-colors cursor-pointer font-mono shadow-none"
          >
            {rendering ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Eye className="w-2.5 h-2.5" />}
            Render Facade
          </button>
        </div>

        {elevation && (
          <div className="flex flex-col gap-2 bg-paper-50 p-3 rounded-none border border-ink-950 shadow-geo-flat">
            <p className="text-xs text-ink-800 leading-relaxed font-sans italic font-medium">
              "{elevation.description}"
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {elevation.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="text-[8.5px] font-mono font-bold text-ink-900 bg-paper-100 border border-ink-950/30 rounded-none px-2.5 py-1"
                >
                  ✦ {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Architectural Audit Suggestions */}
      <div className="flex flex-col gap-2.5 mt-auto">
        <label className="text-xs font-black text-ink-950 uppercase tracking-wider font-display flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MessageSquareCode className="w-4 h-4 text-ink-600" />
            Circulation Audit
          </span>
          <button
            onClick={handleAnalyzeActiveDesign}
            disabled={analyzing}
            className="text-[9px] bg-white hover:bg-paper-150 text-ink-950 border-2 border-ink-950 px-2.5 py-1 rounded-none transition-all font-bold cursor-pointer font-mono"
          >
            {analyzing ? "Analyzing..." : "Refresh Audit"}
          </button>
        </label>

        <div className="flex flex-col gap-2">
          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              className="p-3 bg-paper-50 border-l-4 border-accent-green text-ink-850 text-xs rounded-none border border-ink-950/10 leading-relaxed font-sans font-medium"
            >
              • {sug}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
