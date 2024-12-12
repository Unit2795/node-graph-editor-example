import './Grid.css'
import '../Toolbar/Toolbar.css'
import {useEffect, useRef, useState} from "react";
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

interface NodeConnection {
	fromId: number;
	toId: number;
}

// Dimension in pixels of each node
const SQUARE_SIZE = 40;

const Grid = () => {
	// Reference to the SVG grid that will contain our squares
	const svgRef = useRef<SVGSVGElement>(null);
	const [nodes, setNodes] = useState<Node[]>([]);
	const [connections, setConnections] = useState<NodeConnection[]>([]);
	const [selectedNodes, setSelectedNodes] = useState<number[]>([]);

	const [draggedNode, setDraggedNode] = useState<Node | null>(null);
	const [isOverGrid, setIsOverGrid] = useState(false);
	const [isDraggingExisting, setIsDraggingExisting] = useState(false);

	const dragging = useToolbarDragging();
	const showGhostNode = dragging.isDragging && (isOverGrid || isDraggingExisting);


	useEffect(() => {
		function handleKeyDown(e) {
			// When user presses delete, the selected nodes are deleted removed
			if (e.key === 'Delete') {
				setNodes(nodes.filter(node => !selectedNodes.includes(node.id)));
				setSelectedNodes([]);
			}
			// When user presses enter, a connection is created between the two selected nodes
			else if (e.key === 'Enter' && selectedNodes.length === 2) {
				// An event node can only point to an action node or another event node, action nodes cannot point to anything
				// Only allow one connection between two nodes, if a connection already exists, remove it
				// NOTE: When connecting two event nodes, the connection is always from the first selected node to the second node
				const fromNode = nodes.find(node => node.id === selectedNodes[0]);
				const toNode = nodes.find(node => node.id === selectedNodes[1]);

				if (!fromNode || !toNode) return;

				// Check if a connection already exists
				const existingConnectionIndex = connections.findIndex(
					conn =>
						(conn.fromId === selectedNodes[0] && conn.toId === selectedNodes[1]) ||
						(conn.fromId === selectedNodes[1] && conn.toId === selectedNodes[0])
				);

				if (existingConnectionIndex !== -1) {
					// If a connection exists, remove it
					setConnections(connections.filter((_, index) => index !== existingConnectionIndex));
					setSelectedNodes([]);
				} else {
					if (fromNode.nodeType === NodeType.EVENT && toNode.nodeType === NodeType.EVENT) {
						setConnections([
							...connections,
							{ fromId: selectedNodes[0], toId: selectedNodes[1] }
						]);
						setSelectedNodes([]);
					} else if (fromNode.nodeType === NodeType.EVENT && toNode.nodeType === NodeType.ACTION) {
						setConnections([
							...connections,
							{ fromId: selectedNodes[0], toId: selectedNodes[1] }
						]);
						setSelectedNodes([]);
					} else if (fromNode.nodeType === NodeType.ACTION && toNode.nodeType === NodeType.EVENT) {
						setConnections([
							...connections,
							{ fromId: selectedNodes[1], toId: selectedNodes[0] }
						]);
						setSelectedNodes([]);
					}
				}
			}
		}

		document.addEventListener('keyup', handleKeyDown);

		// Don't forget to clean up
		return function cleanup() {
			document.removeEventListener('keyup', handleKeyDown);
		}
	}, [selectedNodes, nodes]);

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
		setSelectedNodes(state => {
			if (state.includes(node.id)) {
				return state.filter(id => id !== node.id);
			} else {
				return [...state, node.id];
			}
		})
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
					<g
						key={node.id}
						onMouseDown={(e) => handleNodeMouseDown(node, e)}
						style={{
							cursor: "grab",
							display: draggedNode?.id === node.id ? 'none' : 'block'
						}}>
						<rect
							key={node.id}
							x={node.x}
							y={node.y}
							width={SQUARE_SIZE}
							height={SQUARE_SIZE}
							rx="4"
							ry="4"
							style={{
								strokeWidth: "3",
								stroke: selectedNodes.includes(node.id) ? 'cyan' : 'none'
							}}
							className={(node.nodeType === NodeType.EVENT ? "event" : "action")}
						/>
						<text
							style={{
								userSelect: 'none',
							}}
							x={node.x + SQUARE_SIZE / 2}
							y={node.y + SQUARE_SIZE / 2}
							dominantBaseline="middle"
							textAnchor="middle">
							{node.nodeType === NodeType.EVENT ? "E" : "A"}
						</text>
					</g>
				))}

				{connections.map(connection => {
					// Find the source (from) and target (to) nodes for the current connection
					const fromNode = nodes.find(node => node.id === connection.fromId);
					const toNode = nodes.find(node => node.id === connection.toId);

					// Skip this connection if either node is missing
					// TODO: Handle remove node from state if connection is invalid?
					if (!fromNode || !toNode) return null;

					// Calculate the center points of the source and target nodes
					const centerFromX = fromNode.x + SQUARE_SIZE / 2;
					const centerFromY = fromNode.y + SQUARE_SIZE / 2;
					const centerToX = toNode.x + SQUARE_SIZE / 2;
					const centerToY = toNode.y + SQUARE_SIZE / 2;

					// Adjustable width of the chevron
					const width = 40;

					// Calculate the direction vector between the two points
					const inset = 20; // Distance to pull back the chevron from the center
					const tipInset = 40; // Distance to pull back the tip of the chevron from the center
					const dx = centerToX - centerFromX; // Horizontal difference
					const dy = centerToY - centerFromY; // Vertical difference
					const length = Math.sqrt(dx * dx + dy * dy); // Total length of the connection

					// Normalize the direction vector (unit vector)
					const unitX = dx / length;
					const unitY = dy / length;

					// Adjusted start and end points
					const fromX = centerFromX + unitX * inset; // Base X pulled inward
					const fromY = centerFromY + unitY * inset; // Base Y pulled inward
					const toX = centerToX - unitX * tipInset;  // Tip X pulled inward
					const toY = centerToY - unitY * tipInset;  // Tip Y pulled inward


					// Calculate the perpendicular vector to the direction (used for chevron width)
					const perpX = -unitY * (width / 2);
					const perpY = unitX * (width / 2);

					const points = [
						[fromX + perpX, fromY + perpY], // Top-left
						[toX + perpX, toY + perpY],     // Top-right
						[toX + unitX * (width / 2), toY + unitY * (width / 2)], // Arrow tip
						[toX - perpX, toY - perpY],     // Bottom-right
						[fromX - perpX, fromY - perpY]  // Bottom-left
					].map(point => point.join(',')).join(' ');

					return (
						<g key={connection.fromId + connection.toId}>
							<polygon points={points} fill="#007BFF" />
						</g>
					);
				})}

				{showGhostNode && (
					<g>
						<rect
							x={dragging.position.x}
							y={dragging.position.y}
							width={SQUARE_SIZE}
							height={SQUARE_SIZE}
							rx="4"
							ry="4"
							className={(dragging.nodeType === NodeType.EVENT ? "event" : "action")}
							style={{opacity: 0.5}}
						/>
						<text
							style={{
								userSelect: 'none',
							}}
							x={dragging.position.x + SQUARE_SIZE / 2}
							y={dragging.position.y + SQUARE_SIZE / 2}
							dominantBaseline="middle"
							textAnchor="middle">
							{dragging.nodeType === NodeType.EVENT ? "E" : "A"}
						</text>
					</g>
				)}
			</svg>
		</div>
	);
};

export default Grid;