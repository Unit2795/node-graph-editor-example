import './Grid.css';
import '../Toolbar/Toolbar.css';
import {useEffect, useRef, useState, MouseEvent} from "react";
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
	const svgRef = useRef<SVGSVGElement>(null);
	const [nodes, setNodes] = useState<Node[]>([]);
	const [connections, setConnections] = useState<NodeConnection[]>([]);
	const [selectedNodes, setSelectedNodes] = useState<number[]>([]);

	const [draggedNode, setDraggedNode] = useState<Node | null>(null);
	const [isOverGrid, setIsOverGrid] = useState(false);
	const [isDraggingExisting, setIsDraggingExisting] = useState(false);

	const dragging = useToolbarDragging();
	const showGhostNode = dragging.isDragging && (isOverGrid || isDraggingExisting);

	// -----------------------------------------------
	// Helper functions
	// -----------------------------------------------

	const getSvgCoordinates = (e: MouseEvent | DragEvent) => {
		if (!svgRef.current) return null;
		const rect = svgRef.current.getBoundingClientRect();

		const x = (e.clientX - rect.left);
		const y = (e.clientY - rect.top);

		return {x, y};
	};

	const getGridPositionFromEvent = (e: MouseEvent | DragEvent) => {
		const coords = getSvgCoordinates(e);
		if (!coords) return null;

		const gridX = Math.floor(coords.x / SQUARE_SIZE);
		const gridY = Math.floor(coords.y / SQUARE_SIZE);

		return {
			x: gridX * SQUARE_SIZE,
			y: gridY * SQUARE_SIZE,
			gridX,
			gridY
		};
	};

	const isPositionOccupied = (gridX: number, gridY: number) => {
		return nodes.some(node =>
			node.gridX === gridX &&
			node.gridY === gridY &&
			(!draggedNode || draggedNode.id !== node.id)
		);
	};

	const moveNodeToPosition = (nodeId: number, pos: {x: number; y: number; gridX: number; gridY: number}) => {
		setNodes(prev =>
			prev.map(node =>
				node.id === nodeId
					? {...node, ...pos}
					: node
			)
		);
	};

	const resetDraggedNodePosition = () => {
		if (!draggedNode) return;
		setNodes(prev =>
			prev.map(node =>
				node.id === draggedNode.id
					? {...node, x: draggedNode.originalX, y: draggedNode.originalY}
					: node
			)
		);
	};

	const addNewNode = (pos: {x: number; y: number; gridX: number; gridY: number}) => {
		setNodes(prev => [
			...prev,
			{
				id: Date.now(),
				nodeType: dragging.nodeType,
				originalX: pos.x,
				originalY: pos.y,
				...pos
			}
		]);
	};

	const toggleNodeSelection = (nodeId: number) => {
		setSelectedNodes(prev => {
			if (prev.includes(nodeId)) {
				return prev.filter(id => id !== nodeId);
			}
			return [...prev, nodeId];
		});
	};

	// -----------------------------------------------
	// Connection logic
	// -----------------------------------------------

	const modifyConnections = () => {
		// Connections can only be created between two nodes
		if (selectedNodes.length !== 2) return;

		const [firstId, secondId] = selectedNodes;
		const fromNode = nodes.find(n => n.id === firstId);
		const toNode = nodes.find(n => n.id === secondId);

		if (!fromNode || !toNode) return;

		// Check if connection already exists
		const existingIndex = connections.findIndex(
			conn =>
				(conn.fromId === firstId && conn.toId === secondId) ||
				(conn.fromId === secondId && conn.toId === firstId)
		);

		if (existingIndex !== -1) {
			// Connection exists, remove it
			setConnections(prev => prev.filter((_, i) => i !== existingIndex));
			setSelectedNodes([]);
			return;
		}

		// Create new connection if allowed
		handleNewConnection(fromNode, toNode);
	};

	const handleNewConnection = (fromNode: Node, toNode: Node) => {
		const [firstId, secondId] = selectedNodes;

		// Rules for connections:
		// - Event nodes can connect to Event or Action nodes.
		// - Action nodes cannot originate a connection, but can be the target of one.
		// - If connecting two event nodes, direction is from the first selected to the second selected.
		// If connecting event->action or action->event, ensure correct direction.

		const isFromEvent = fromNode.nodeType === NodeType.EVENT;
		const isToEvent = toNode.nodeType === NodeType.EVENT;
		const isFromAction = fromNode.nodeType === NodeType.ACTION;
		const isToAction = toNode.nodeType === NodeType.ACTION;

		// event -> event
		if (isFromEvent && isToEvent) {
			addConnection(firstId, secondId);
			return;
		}

		// event -> action
		if (isFromEvent && isToAction) {
			addConnection(firstId, secondId);
			return;
		}

		// action -> event (reverse direction)
		if (isFromAction && isToEvent) {
			addConnection(secondId, firstId);
			return;
		}
	};

	const addConnection = (fromId: number, toId: number) => {
		setConnections(prev => [...prev, {fromId, toId}]);
		setSelectedNodes([]);
	};

	// -----------------------------------------------
	// Keyboard event handling
	// -----------------------------------------------

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Delete') {
				// Delete selected nodes
				setNodes(prev => prev.filter(node => !selectedNodes.includes(node.id)));
				setSelectedNodes([]);
			} else if (e.key === 'Enter') {
				modifyConnections();
			}
		};

		document.addEventListener('keyup', handleKeyDown);
		return () => {
			document.removeEventListener('keyup', handleKeyDown);
		};
	}, [selectedNodes, nodes, connections]);

	// -----------------------------------------------
	// Mouse and Drag event handlers
	// -----------------------------------------------

	const handleGridDragOver = (e: React.DragEvent<SVGSVGElement>) => {
		e.preventDefault();
		if (!dragging.isDragging) return;

		const pos = getGridPositionFromEvent(e);
		if (pos && !isPositionOccupied(pos.gridX, pos.gridY)) {
			dragging.setPosition(pos.x, pos.y);
		}
	};

	const handleGridDrop = (e: React.DragEvent<SVGSVGElement>) => {
		e.preventDefault();
		const pos = getGridPositionFromEvent(e);
		if (!pos) return;

		// If valid and not occupied
		if (!isPositionOccupied(pos.gridX, pos.gridY)) {
			if (draggedNode) {
				// Move existing node
				moveNodeToPosition(draggedNode.id, pos);
				setDraggedNode(null);
			} else {
				// Add new node
				addNewNode(pos);
			}
		} else if (draggedNode) {
			// Reset if dropped on occupied cell
			resetDraggedNodePosition();
		}

		dragging.stopDragging();
		setIsOverGrid(false);
		setIsDraggingExisting(false);
	};

	const handleNodeMouseDown = (node: Node, e: React.MouseEvent) => {
		e.preventDefault();
		toggleNodeSelection(node.id);

		setDraggedNode({...node, originalX: node.x, originalY: node.y});
		dragging.setDragging(true, node.nodeType, {x: node.x, y: node.y});
		setIsDraggingExisting(true);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (draggedNode && dragging.isDragging) {
			const pos = getGridPositionFromEvent(e);
			if (pos && !isPositionOccupied(pos.gridX, pos.gridY)) {
				dragging.setPosition(pos.x, pos.y);
			}
		}
	};

	const handleMouseUp = (e: React.MouseEvent) => {
		if (draggedNode && dragging.isDragging) {
			handleGridDrop(e as unknown as React.DragEvent<SVGSVGElement>);
		}
		setDraggedNode(null);
		dragging.stopDragging();
		setIsOverGrid(false);
		setIsDraggingExisting(false);
	};

	const handleDragEnter = (e: React.DragEvent<SVGSVGElement>) => {
		e.preventDefault();
		setIsOverGrid(true);
	};

	const handleDragLeave = (e: React.DragEvent<SVGSVGElement>) => {
		if (!svgRef.current?.contains(e.relatedTarget as Node)) {
			setIsOverGrid(false);
		}
	};

	const handleMouseLeave = () => {
		if (!isDraggingExisting) {
			setIsOverGrid(false);
		}
	};

	// -----------------------------------------------
	// Connection Rendering
	// -----------------------------------------------

	const renderConnection = (connection: NodeConnection) => {
		// Find the source (from) and target (to) nodes for the current connection
		const fromNode = nodes.find(node => node.id === connection.fromId);
		const toNode = nodes.find(node => node.id === connection.toId);

		// Skip this connection if either node is missing
		if (!fromNode || !toNode) return null;

		// Calculate the center points of the source and target nodes
		const centerFromX = fromNode.x + SQUARE_SIZE / 2;
		const centerFromY = fromNode.y + SQUARE_SIZE / 2;
		const centerToX = toNode.x + SQUARE_SIZE / 2;
		const centerToY = toNode.y + SQUARE_SIZE / 2;

		// Parameters for the connection chevron
		const chevronWidth = 40;
		const inset = 20;
		const tipInset = 40;

		// Calculate the direction vector between the two points
		const dx = centerToX - centerFromX;
		const dy = centerToY - centerFromY;
		const length = Math.sqrt(dx * dx + dy * dy);

		if (length === 0) return null; // Avoid division by zero

		// Normalize the direction vector (unit vector)
		const unitX = dx / length;
		const unitY = dy / length;

		// Adjusted start/end points
		const fromX = centerFromX + unitX * inset;
		const fromY = centerFromY + unitY * inset;
		const toX = centerToX - unitX * tipInset;
		const toY = centerToY - unitY * tipInset;

		// Calculate the perpendicular vector to the direction (used for chevron width)
		const perpX = -unitY * (chevronWidth / 2);
		const perpY = unitX * (chevronWidth / 2);

		const points = [
			[fromX + perpX, fromY + perpY],
			[toX + perpX, toY + perpY],
			[toX + unitX * (chevronWidth / 2), toY + unitY * (chevronWidth / 2)],
			[toX - perpX, toY - perpY],
			[fromX - perpX, fromY - perpY]
		]
			.map(point => point.join(','))
			.join(' ');

		return (
			<g key={`${connection.fromId}-${connection.toId}`}>
				<polygon points={points} fill="#007BFF" />
			</g>
		);
	};

	return (
		<div className="grid">
			<svg
				ref={svgRef}
				width="100%"
				height="100%"
				onDragOver={handleGridDragOver}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				onDrop={handleGridDrop}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
			>
				{/* Nodes */}
				{nodes.map(node => {
					const isHiddenWhileDragging = draggedNode?.id === node.id ? 'none' : 'block';
					const isSelected = selectedNodes.includes(node.id);

					return (
						<g
							key={node.id}
							onMouseDown={(e) => handleNodeMouseDown(node, e)}
							style={{
								cursor: "grab",
								display: isHiddenWhileDragging
							}}
						>
							<rect
								x={node.x}
								y={node.y}
								width={SQUARE_SIZE}
								height={SQUARE_SIZE}
								rx="4"
								ry="4"
								style={{
									strokeWidth: "3",
									stroke: isSelected ? 'cyan' : 'none'
								}}
								className={node.nodeType === NodeType.EVENT ? "event" : "action"}
							/>
							<text
								style={{userSelect: 'none'}}
								x={node.x + SQUARE_SIZE / 2}
								y={node.y + SQUARE_SIZE / 2}
								dominantBaseline="middle"
								textAnchor="middle"
							>
								{node.nodeType === NodeType.EVENT ? "E" : "A"}
							</text>
						</g>
					);
				})}

				{/* Node Connections */}
				{connections.map(renderConnection)}

				{/* Ghost Node */}
				{showGhostNode && (
					<g>
						<rect
							x={dragging.position.x}
							y={dragging.position.y}
							width={SQUARE_SIZE}
							height={SQUARE_SIZE}
							rx="4"
							ry="4"
							className={dragging.nodeType === NodeType.EVENT ? "event" : "action"}
							style={{opacity: 0.5}}
						/>
						<text
							style={{userSelect: 'none'}}
							x={dragging.position.x + SQUARE_SIZE / 2}
							y={dragging.position.y + SQUARE_SIZE / 2}
							dominantBaseline="middle"
							textAnchor="middle"
						>
							{dragging.nodeType === NodeType.EVENT ? "E" : "A"}
						</text>
					</g>
				)}
			</svg>
		</div>
	);
};

export default Grid;
