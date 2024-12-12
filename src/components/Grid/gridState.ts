import {create} from "zustand";
import {NodeType} from "../Toolbar/toolbarState.ts";

interface GridNode {
	id: number;
	nodeType: NodeType;
	// Pixel location where the node is rendered
	x: number;
	y: number;
	// Actual grid column & row
	gridX: number;
	gridY: number;
	// Original position of the node before dragging
	originalX: number;
	originalY: number;
}

interface NodeConnection {
	fromId: number;
	toId: number;
}

interface GridNodes {
	nodes: GridNode[];
	connections: NodeConnection[];
	setNodes: (updater: (prev: GridNode[]) => GridNode[]) => void;
	setConnections: (updater: (prev: NodeConnection[]) => NodeConnection[]) => void;
	saveToFile: () => void
	loadFromFile: (file: File) => Promise<void>
}

export const useGridStore = create<GridNodes>((set, get) => ({
		nodes: [],
		connections: [],
		setNodes: (updater) =>
			set((state) => ({
				nodes: updater(state.nodes),
			})
		),
		setConnections: (updater) =>
			set((state) => ({
				connections: updater(state.connections),
			})
		),
		saveToFile: () => {
			const state = {
				nodes: JSON.parse(JSON.stringify(get().nodes)),
				connections: JSON.parse(JSON.stringify(get().connections)),
			};

			const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = 'grid_state.json';
			a.click();

			URL.revokeObjectURL(url);
		},

		loadFromFile: async (file: File) => {
			const text = await file.text();
			console.log(text);
			const { nodes, connections } = JSON.parse(text);

			set(() => ({
				nodes: nodes || [],
				connections: connections || []
			}));
		},
	})
);