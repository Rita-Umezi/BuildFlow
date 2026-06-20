/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectState } from "../types";

export interface TemplatePreset {
  id: string;
  name: string;
  category: "Residential" | "Commercial" | "Public" | "Interior";
  description: string;
  state: ProjectState;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "studio-apartment",
    name: "Modern Studio Apartment",
    category: "Residential",
    description: "Compact 45m² open-concept layout with separated sleeping nook, kitchen bar, and bathroom.",
    state: {
      walls: [
        // Exterior perimeter bounding box
        { id: "ext-w1", startX: 100, startY: 100, endX: 600, endY: 100, type: "exterior", thickness: 20, height: 280, materialId: "concrete", color: "#475569", layerId: "layer-ground" },
        { id: "ext-w2", startX: 600, startY: 100, endX: 600, endY: 500, type: "exterior", thickness: 20, height: 280, materialId: "concrete", color: "#475569", layerId: "layer-ground" },
        { id: "ext-w3", startX: 600, startY: 500, endX: 100, endY: 500, type: "exterior", thickness: 20, height: 280, materialId: "concrete", color: "#475569", layerId: "layer-ground" },
        { id: "ext-w4", startX: 100, startY: 500, endX: 100, endY: 100, type: "exterior", thickness: 20, height: 280, materialId: "concrete", color: "#475569", layerId: "layer-ground" },
        // Interior bathroom wall separation
        { id: "int-w1", startX: 100, startY: 350, endX: 300, endY: 350, type: "interior", thickness: 12, height: 280, materialId: "plaster", color: "#64748b", layerId: "layer-ground" },
        { id: "int-w2", startX: 300, startY: 350, endX: 300, endY: 500, type: "interior", thickness: 12, height: 280, materialId: "plaster", color: "#64748b", layerId: "layer-ground" },
      ],
      rooms: [
        {
          id: "r-living",
          name: "Living & Workspace",
          type: "living",
          points: [
            { x: 100, y: 100 },
            { x: 400, y: 100 },
            { x: 400, y: 350 },
            { x: 100, y: 350 },
          ],
          color: "#f1f5f9",
          layerId: "layer-ground",
        },
        {
          id: "r-kitchen",
          name: "Bar Kitchen",
          type: "kitchen",
          points: [
            { x: 400, y: 100 },
            { x: 600, y: 100 },
            { x: 600, y: 300 },
            { x: 400, y: 300 },
          ],
          color: "#fef9c3",
          layerId: "layer-ground",
        },
        {
          id: "r-sleeping",
          name: "Sleeping Nook",
          type: "bedroom",
          points: [
            { x: 300, y: 350 },
            { x: 600, y: 350 },
            { x: 600, y: 500 },
            { x: 300, y: 500 },
          ],
          color: "#ffe4e6",
          layerId: "layer-ground",
        },
        {
          id: "r-bath",
          name: "Bathroom",
          type: "bathroom",
          points: [
            { x: 100, y: 350 },
            { x: 300, y: 350 },
            { x: 300, y: 500 },
            { x: 100, y: 500 },
          ],
          color: "#dbeafe",
          layerId: "layer-ground",
        },
      ],
      doors: [
        { id: "d-main", startX: 120, startY: 100, width: 90, height: 210, type: "single", swingDirection: "inside", angle: 90, materialId: "wood", layerId: "layer-ground" },
        { id: "d-bath", startX: 300, startY: 400, width: 80, height: 210, type: "single", swingDirection: "inside", angle: 90, materialId: "wood", layerId: "layer-ground" },
      ],
      windows: [
        { id: "win-front", startX: 450, startY: 100, width: 100, height: 120, type: "sliding", materialId: "glass", layerId: "layer-ground" },
        { id: "win-back", startX: 450, startY: 500, width: 120, height: 120, type: "casement", materialId: "glass", layerId: "layer-ground" },
        { id: "win-bath", startX: 100, startY: 420, width: 50, height: 80, type: "fixed", materialId: "glass", layerId: "layer-ground" },
      ],
      stairs: [],
      sketches: [],
      furniture: [
        { id: "f-sofa", name: "L-Sofa", type: "sofa", x: 140, y: 150, width: 140, height: 80, rotation: 0, color: "#64748b", layerId: "layer-ground" },
        { id: "f-table", name: "Coffee Table", type: "table", x: 160, y: 250, width: 80, height: 50, rotation: 0, color: "#94a3b8", layerId: "layer-ground" },
        { id: "f-bed", name: "King Bed", type: "bed", x: 420, y: 380, width: 130, height: 110, rotation: 90, color: "#c084fc", layerId: "layer-ground" },
        { id: "f-chair", name: "Kitchen Barstool", type: "chair", x: 420, y: 280, width: 40, height: 40, rotation: 0, color: "#fb923c", layerId: "layer-ground" },
      ],
      landscape: [
        { id: "l-shrub", name: "Balcony Fern", type: "tree", x: 620, y: 120, width: 50, height: 50, rotation: 0, color: "#22c55e", layerId: "layer-landscape" },
      ],
      annotations: [
        { id: "ann-1", x: 180, y: 330, text: "Exposed oak concrete finishes requested by client", type: "label", author: "Lead Architect", timestamp: "16:40", layerId: "layer-ground" },
      ],
      dimensions: [
        { id: "dim-1", startX: 100, startY: 70, endX: 600, endY: 70, text: "15.0 m", type: "auto" },
      ],
      layers: [
        { id: "layer-ground", name: "Ground Floor", isVisible: true, isLocked: false },
        { id: "layer-landscape", name: "Landscape Design", isVisible: true, isLocked: false },
      ],
      comments: [
        {
          id: "c-1",
          x: 200,
          y: 340,
          author: "Interior Design Lead",
          text: "Can we replace this partition wall with standard sliding glass dividers?",
          timestamp: "Jun 19 15:30",
          isResolved: false,
          replies: [
            { id: "r1", author: "Structural Lead", text: "Verified, this partition isn't load bearing. Excellent suggestion.", timestamp: "Jun 19 16:15" },
          ],
        },
      ],
      selectedLayerId: "layer-ground",
    },
  },
  {
    id: "bungalow-residential",
    name: "Classic 3-Bedroom Family Home",
    category: "Residential",
    description: "Generous 3Bedroom layout featuring an unblocked open living patio, formal dining area, and double car garage.",
    state: {
      walls: [
        { id: "b-w1", startX: 50, startY: 50, endX: 750, endY: 50, type: "exterior", thickness: 20, height: 280, materialId: "brick", color: "#b91c1c", layerId: "layer-ground" },
        { id: "b-w2", startX: 750, startY: 50, endX: 750, endY: 550, type: "exterior", thickness: 20, height: 280, materialId: "brick", color: "#b91c1c", layerId: "layer-ground" },
        { id: "b-w3", startX: 750, startY: 550, endX: 50, endY: 550, type: "exterior", thickness: 20, height: 280, materialId: "brick", color: "#b91c1c", layerId: "layer-ground" },
        { id: "b-w4", startX: 50, startY: 550, endX: 50, endY: 50, type: "exterior", thickness: 20, height: 280, materialId: "brick", color: "#b91c1c", layerId: "layer-ground" },
        // Divide into rooms
        { id: "b-int1", startX: 350, startY: 50, endX: 350, endY: 550, type: "interior", thickness: 12, height: 280, materialId: "plaster", color: "#64748b", layerId: "layer-ground" },
        { id: "b-int2", startX: 50, startY: 300, endX: 350, endY: 300, type: "interior", thickness: 12, height: 280, materialId: "plaster", color: "#64748b", layerId: "layer-ground" },
        { id: "b-int3", startX: 350, startY: 250, endX: 750, endY: 250, type: "interior", thickness: 12, height: 280, materialId: "plaster", color: "#64748b", layerId: "layer-ground" },
      ],
      rooms: [
        {
          id: "br-1",
          name: "Main Living Hall",
          type: "living",
          points: [
            { x: 50, y: 50 },
            { x: 350, y: 50 },
            { x: 350, y: 300 },
            { x: 50, y: 300 },
          ],
          color: "#f1f5f9",
          layerId: "layer-ground",
        },
        {
          id: "br-2",
          name: "Master Suite",
          type: "bedroom",
          points: [
            { x: 50, y: 300 },
            { x: 350, y: 300 },
            { x: 350, y: 550 },
            { x: 50, y: 550 },
          ],
          color: "#ffe4e6",
          layerId: "layer-ground",
        },
        {
          id: "br-3",
          name: "Kitchen & Dining",
          type: "kitchen",
          points: [
            { x: 350, y: 50 },
            { x: 750, y: 50 },
            { x: 750, y: 250 },
            { x: 350, y: 250 },
          ],
          color: "#fef9c3",
          layerId: "layer-ground",
        },
        {
          id: "br-4",
          name: "Junior Suite & Garage",
          type: "garage",
          points: [
            { x: 350, y: 250 },
            { x: 750, y: 250 },
            { x: 750, y: 550 },
            { x: 350, y: 550 },
          ],
          color: "#e2e8f0",
          layerId: "layer-ground",
        },
      ],
      doors: [
        { id: "b-d1", startX: 50, startY: 150, width: 100, height: 210, type: "double", swingDirection: "inside", angle: 90, materialId: "wood", layerId: "layer-ground" },
        { id: "b-d2", startX: 350, startY: 120, width: 90, height: 210, type: "single", swingDirection: "inside", angle: 90, materialId: "wood", layerId: "layer-ground" },
        { id: "b-d3", startX: 300, startY: 300, width: 80, height: 210, type: "single", swingDirection: "inside", angle: 90, materialId: "wood", layerId: "layer-ground" },
      ],
      windows: [
        { id: "b-win1", startX: 200, startY: 50, width: 100, height: 120, type: "casement", materialId: "glass", layerId: "layer-ground" },
        { id: "b-win2", startX: 550, startY: 50, width: 140, height: 120, type: "sliding", materialId: "glass", layerId: "layer-ground" },
      ],
      stairs: [],
      sketches: [],
      furniture: [
        { id: "b-f1", name: "Premium Sectional Sofa", type: "sofa", x: 100, y: 100, width: 150, height: 120, rotation: 0, color: "#475569", layerId: "layer-ground" },
        { id: "b-f2", name: "Dining Table 8-Seater", type: "table", x: 500, y: 110, width: 130, height: 80, rotation: 0, color: "#854d0e", layerId: "layer-ground" },
        { id: "b-f3", name: "Master Suite Bed", type: "bed", x: 100, y: 380, width: 150, height: 150, rotation: 180, color: "#be185d", layerId: "layer-ground" },
      ],
      landscape: [
        { id: "b-l1", name: "Boundary Oak", type: "tree", x: 740, y: 100, width: 100, height: 100, rotation: 0, color: "#166534", layerId: "layer-landscape" },
        { id: "b-l2", name: "Entry Hedge Decor", type: "tree", x: 20, y: 100, width: 60, height: 60, rotation: 0, color: "#14532d", layerId: "layer-landscape" },
      ],
      annotations: [],
      dimensions: [
        { id: "b-dim1", startX: 50, startY: 30, endX: 750, endY: 30, text: "21.0 m", type: "auto" },
        { id: "b-dim2", startX: 20, startY: 50, endX: 20, endY: 550, text: "15.0 m", type: "auto" },
      ],
      layers: [
        { id: "layer-ground", name: "Ground Floor", isVisible: true, isLocked: false },
        { id: "layer-landscape", name: "Landscape Design", isVisible: true, isLocked: false },
      ],
      comments: [],
      selectedLayerId: "layer-ground",
    },
  },
  {
    id: "ristorante-commercial",
    name: "Vibrant Gastro-Pub Café",
    category: "Commercial",
    description: "Commercial space layout optimized for pedestrian traffic, food prep workflow, dining covers, and washrooms.",
    state: {
      walls: [
        { id: "rc-w1", startX: 100, startY: 100, endX: 700, endY: 100, type: "exterior", thickness: 20, height: 320, materialId: "bricks", color: "#f97316", layerId: "layer-ground" },
        { id: "rc-w2", startX: 700, startY: 100, endX: 700, endY: 500, type: "exterior", thickness: 20, height: 320, materialId: "bricks", color: "#f97316", layerId: "layer-ground" },
        { id: "rc-w3", startX: 700, startY: 500, endX: 100, endY: 500, type: "exterior", thickness: 20, height: 320, materialId: "bricks", color: "#f97316", layerId: "layer-ground" },
        { id: "rc-w4", startX: 100, startY: 500, endX: 100, endY: 100, type: "exterior", thickness: 20, height: 320, materialId: "bricks", color: "#f97316", layerId: "layer-ground" },
        // Kitchen compartmental dividers
        { id: "rc-int1", startX: 100, startY: 320, endX: 380, endY: 320, type: "interior", thickness: 15, height: 320, materialId: "concrete", color: "#e2e8f0", layerId: "layer-ground" },
        { id: "rc-int2", startX: 380, startY: 320, endX: 380, endY: 500, type: "interior", thickness: 15, height: 320, materialId: "concrete", color: "#e2e8f0", layerId: "layer-ground" },
      ],
      rooms: [
        {
          id: "rcr-dining",
          name: "Main Dining Hall",
          type: "living",
          points: [
            { x: 100, y: 100 },
            { x: 700, y: 100 },
            { x: 700, y: 500 },
            { x: 380, y: 500 },
            { x: 380, y: 320 },
            { x: 100, y: 320 },
          ],
          color: "#fff7ed",
          layerId: "layer-ground",
        },
        {
          id: "rcr-kitchen",
          name: "Commercial Kitchen & Prep",
          type: "kitchen",
          points: [
            { x: 100, y: 320 },
            { x: 380, y: 320 },
            { x: 380, y: 500 },
            { x: 100, y: 500 },
          ],
          color: "#fecdd3",
          layerId: "layer-ground",
        },
      ],
      doors: [
        { id: "rc-d1", startX: 520, startY: 500, width: 120, height: 240, type: "double", swingDirection: "outside", angle: 0, materialId: "glass", layerId: "layer-ground" },
        { id: "rc-d2", startX: 380, startY: 380, width: 90, height: 210, type: "sliding", swingDirection: "inside", angle: 90, materialId: "steel", layerId: "layer-ground" },
      ],
      windows: [
        { id: "rc-win1", startX: 180, startY: 100, width: 150, height: 180, type: "sliding", materialId: "glass", layerId: "layer-ground" },
        { id: "rc-win2", startX: 420, startY: 100, width: 150, height: 180, type: "sliding", materialId: "glass", layerId: "layer-ground" },
      ],
      stairs: [],
      sketches: [],
      furniture: [
        { id: "rc-f1", name: "Guest Table 1", type: "table", x: 450, y: 180, width: 70, height: 70, rotation: 0, color: "#c2410c", layerId: "layer-ground" },
        { id: "rc-f2", name: "Guest Table 2", type: "table", x: 580, y: 180, width: 70, height: 70, rotation: 0, color: "#c2410c", layerId: "layer-ground" },
        { id: "rc-f3", name: "Barstool Row 1", type: "chair", x: 470, y: 260, width: 30, height: 30, rotation: 0, color: "#fb923c", layerId: "layer-ground" },
        { id: "rc-f4", name: "Industrial Prep Range", type: "table", x: 140, y: 380, width: 180, height: 60, rotation: 0, color: "#94a3b8", layerId: "layer-ground" },
      ],
      landscape: [],
      annotations: [],
      dimensions: [
        { id: "rc-dim1", startX: 100, startY: 75, endX: 700, endY: 75, text: "18.0 m", type: "auto" },
      ],
      layers: [
        { id: "layer-ground", name: "Ground Floor Layout", isVisible: true, isLocked: false },
      ],
      comments: [
        {
          id: "cmt-c1",
          x: 200,
          y: 400,
          author: "Health Safety Auditor",
          text: "Verify mechanical exhaust extraction points align with prep gas lines here.",
          timestamp: "Jun 19 14:02",
          isResolved: false,
          replies: [],
        },
      ],
      selectedLayerId: "layer-ground",
    },
  },
];
