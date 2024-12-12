import {create} from "zustand/index";

export enum NodeType {
	EVENT = "event",
	ACTION = "action"
}

interface DraggingState {
	isDragging: boolean;
	nodeType: NodeType;
	position: {
		x: number;
		y: number;
	}
	setDragging: (isDragging: boolean, nodeType: NodeType) => void;
	setPosition: (x: number, y: number) => void;
	stopDragging: () => void;
}

export const useToolbarDragging = create<DraggingState>((set) => ({
	isDragging: false,
	nodeType: NodeType.EVENT,
	position: {
		x: 0,
		y: 0
	},
	setDragging: (isDragging: boolean, nodeType: NodeType) => set({ isDragging, nodeType }),
	setPosition: (x: number, y: number) => set({ position: { x, y } }),
	stopDragging: () => set({ isDragging: false })
}))