/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Point {
  x: number;
  y: number;
}

export type WallType = "exterior" | "interior" | "curved";
export type DoorType = "single" | "double" | "sliding" | "folding";
export type WindowType = "casement" | "sliding" | "awning" | "fixed";
export type StairType = "straight" | "L-shaped" | "U-shaped" | "spiral";
export type RoomType = "bedroom" | "living" | "kitchen" | "bathroom" | "dining" | "office" | "garage" | "corridor";
export type FurnitureType = "sofa" | "bed" | "table" | "chair" | "cabinet" | "wardrobe";
export type LandscapeType = "tree" | "fence" | "grass" | "road";
export type AnnotationType = "label" | "comment";

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  type: WallType;
  thickness: number;
  height: number;
  materialId: string;
  color: string;
  layerId: string;
}

export interface Door {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  type: DoorType;
  swingDirection: "left" | "right" | "inside" | "outside";
  angle: number;
  materialId: string;
  layerId: string;
}

export interface Window {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  type: WindowType;
  materialId: string;
  layerId: string;
}

export interface Stair {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  type: StairType;
  stepsCount: number;
  stepDepth: number;
  rotation: number;
  layerId: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  points: Point[]; // Polygon outline
  color: string;
  layerId: string;
}

export interface SketchPath {
  id: string;
  points: Point[];
  strokeWidth: number;
  strokeColor: string;
  opacity: number;
  mode: "pencil" | "pen" | "shape";
  shapeType?: "rectangle" | "circle" | "ellipse" | "polygon" | "triangle";
  layerId: string;
}

export interface Furniture {
  id: string;
  name: string;
  type: FurnitureType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  layerId: string;
  materialId?: string;
}

export interface Landscape {
  id: string;
  name: string;
  type: LandscapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  layerId: string;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  type: AnnotationType;
  author: string;
  timestamp: string;
  layerId: string;
}

export interface Dimension {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  text: string;
  type: "manual" | "auto";
}

export interface Layer {
  id: string;
  name: string;
  isVisible: boolean;
  isLocked: boolean;
}

export interface Material {
  id: string;
  name: string;
  color: string;
  texture: string; // CSS style or description
  reflectivity: number; // 0 to 1
  transparency: number; // 0 to 1
  roughness: number; // 0 to 1
}

export interface ProjectComment {
  id: string;
  x: number;
  y: number;
  author: string;
  text: string;
  timestamp: string;
  isResolved: boolean;
  replies: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }>;
}

export interface ProjectVersion {
  id: string;
  timestamp: string;
  name: string;
  data: ProjectState;
}

export interface ProjectState {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  rooms: Room[];
  sketches: SketchPath[];
  furniture: Furniture[];
  landscape: Landscape[];
  annotations: Annotation[];
  dimensions: Dimension[];
  layers: Layer[];
  comments: ProjectComment[];
  selectedLayerId: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  role: "guest" | "registered" | "pro"; // Interactive simulation of roles
  state: ProjectState;
  versions: ProjectVersion[];
}
