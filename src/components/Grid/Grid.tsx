import './Grid.css'
import '../Toolbar/Toolbar.css'
import {useRef, useState} from "react";
import {NodeType, useToolbarDragging} from "../Toolbar/toolbarState.ts";

interface Node {
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

// Desired size of each node square in the grid (in pixels)
const SQUARE_SIZE = 40;

const Grid = () => {
	// Reference to the SVG grid that will contain our squares
	const svgRef = useRef<SVGSVGElement>(null);
	// Array of nodes that are rendered on the grid
	const [nodes, setNodes] = useState<Node[]>([]);
	// Node that is currently being dragged
	const [draggedNode, setDraggedNode] = useState<Node | null>(null);
	// Whether the cursor is currently over the grid
	const [isOverGrid, setIsOverGrid] = useState(false);
	// Whether the cursor is currently dragging an existing node
	const [isDraggingExisting, setIsDraggingExisting] = useState(false);
	// Custom hook to manage the toolbar dragging state
	const dragging = useToolbarDragging();
	// Whether to show the ghost node if a new or existing node
	const showGhostNode = dragging.isDragging && (isOverGrid || isDraggingExisting);

	const getGridPosition = (e) => {
		if (!svgRef.current) return;
		const rect = svgRef.current.getBoundingClientRect();

		// Calculate the mouse position relative to the SVG grid
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		// Calculate the grid column and row based on the mouse position
		const gridX = Math.floor(x / SQUARE_SIZE);
		const gridY = Math.floor(y / SQUARE_SIZE);

		// Return pixel coordinate snapped to grid, as well as the grid column and row
		return {
			x: gridX * SQUARE_SIZE,
			y: gridY * SQUARE_SIZE,
			gridX,
			gridY
		};
	};

	// Determine if the dragged node is being placed into an occupied position
	const isPositionOccupied = (gridX: number, gridY: number) => {
		return nodes.some(node =>
			node.gridX === gridX &&
			node.gridY === gridY &&
			(!draggedNode || draggedNode.id !== node.id)
		);
	};

	// Handle drag over event to update the ghost node position
	const handleDragOver = (e) => {
		e.preventDefault();
		if (dragging.isDragging) {
			const pos = getGridPosition(e);
			if (pos && !isPositionOccupied(pos.gridX, pos.gridY)) {
				dragging.setPosition(pos.x, pos.y);
			}
		}
	};

	const handleDrop = (e) => {
		e.preventDefault();
		const pos = getGridPosition(e);
		if (!pos) return;

		// Check if the position is valid (in bounds) and not occupied
		if (!isPositionOccupied(pos.gridX, pos.gridY)) {
			if (draggedNode) {
				// Moving existing square
				setNodes(nodes.map(node =>
					node.id === draggedNode.id
						? { ...node, ...pos }
						: node
				));
				setDraggedNode(null);
			} else {
				// Adding new node from toolbar
				setNodes([...nodes, {
					id: Date.now(),
					nodeType: dragging.nodeType,
					originalX: pos.x,
					originalY: pos.y,
					...pos
				}]);
			}
		} else if (draggedNode) {
			// Reset dragged node position if dropped on occupied cell
			setNodes(
				nodes.map(node =>
					node.id === draggedNode.id
						? { ...node, x: draggedNode.originalX, y: draggedNode.originalY }
						: node
				)
			);
		}

		dragging.stopDragging();
		setIsOverGrid(false);
		setIsDraggingExisting(false);
	};

	const handleNodeMouseDown = (node, e) => {
		e.preventDefault();
		setDraggedNode({ ...node, originalX: node.x, originalY: node.y });
		dragging.setDragging(true, node.nodeType, { x: node.x, y: node.y });
		setIsDraggingExisting(true);
	};

	const handleMouseMove = (e) => {
		if (draggedNode && dragging.isDragging) {
			const pos = getGridPosition(e);
			if (pos && !isPositionOccupied(pos.gridX, pos.gridY)) {
				dragging.setPosition(pos.x, pos.y);
			}
		}
	};

	const handleMouseUp = (e) => {
		if (draggedNode && dragging.isDragging) {
			handleDrop(e);
		}
		setDraggedNode(null);
		dragging.stopDragging();
		setIsOverGrid(false);
		setIsDraggingExisting(false);
	};

	const handleDragEnter = (e) => {
		e.preventDefault();
		setIsOverGrid(true);
	};

	const handleDragLeave = (e) => {
		if (!svgRef.current?.contains(e.relatedTarget)) {
			setIsOverGrid(false);
		}
	};

	const handleMouseLeave = () => {
		if (!isDraggingExisting) {
			setIsOverGrid(false);
		}
	};


    return (
		<div className="grid">
			<svg
				ref={svgRef}
				width="100%" height="100%"
				onDragOver={handleDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
			>
				{nodes.map(node => (
					<rect
						key={node.id}
						x={node.x}
						y={node.y}
						width={SQUARE_SIZE}
						height={SQUARE_SIZE}
						rx="4"
						ry="4"
						onMouseDown={(e) => handleNodeMouseDown(node, e)}
						className={(node.nodeType === NodeType.EVENT ? "event" : "action")}
						style={{
							display: draggedNode?.id === node.id ? 'none' : 'block'
						}}
					/>
				))}

				{showGhostNode && (
					<rect
						x={dragging.position.x}
						y={dragging.position.y}
						width={SQUARE_SIZE}
						height={SQUARE_SIZE}
						rx="4"
						ry="4"
						className={(dragging.nodeType === NodeType.EVENT ? "event" : "action")}
						style={{ opacity: 0.5 }}
					/>
				)}
			</svg>
		</div>
	);
};

export default Grid;