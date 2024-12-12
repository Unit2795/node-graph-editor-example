import './Grid.css'
import '../Toolbar/Toolbar.css'
import {useRef, useState} from "react";
import {NodeType, useToolbarDragging} from "../Toolbar/toolbarState.ts";

interface Square {
	id: number;
	nodeType: NodeType;

	// Pixel location where the square is rendered
	x: number;
	y: number;

	// Actual grid column & row
	gridX: number;
	gridY: number;

	// Original position of the square before dragging
	originalX: number;
	originalY: number;
}

const SQUARE_SIZE = 40;
const GRID_WIDTH = 400;
const GRID_HEIGHT = 400;
const GRID_COLUMNS = Math.floor(GRID_WIDTH / SQUARE_SIZE);
const GRID_ROWS = Math.floor(GRID_HEIGHT / SQUARE_SIZE);

const Grid = () => {
	const svgRef = useRef<SVGSVGElement>(null);
	const [squares, setSquares] = useState<Square[]>([]);
	const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);
	const dragging = useToolbarDragging();

	const getGridPosition = (e) => {
		if (!svgRef.current) return;
		const rect = svgRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const gridX = Math.floor(x / SQUARE_SIZE);
		const gridY = Math.floor(y / SQUARE_SIZE);

		return {
			x: gridX * SQUARE_SIZE,
			y: gridY * SQUARE_SIZE,
			gridX,
			gridY
		};
	};

	// Determine if the dragged node is being placed into an occupied position
	const isPositionOccupied = (gridX: number, gridY: number) => {
		return squares.some(square =>
			square.gridX === gridX &&
			square.gridY === gridY &&
			(!draggedSquare || draggedSquare.id !== square.id)
		);
	};

	// Handle drag over event to update the ghost square position
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
			if (draggedSquare) {
				// Moving existing square
				setSquares(squares.map(square =>
					square.id === draggedSquare.id
						? { ...square, ...pos }
						: square
				));
				setDraggedSquare(null);
			} else {
				// Adding new square from toolbar
				setSquares([...squares, {
					id: Date.now(),
					nodeType: dragging.nodeType,
					originalX: pos.x,
					originalY: pos.y,
					...pos
				}]);
			}
		} else if (draggedSquare) {
			// Reset dragged square position if dropped on occupied cell
			setSquares(
				squares.map(square =>
					square.id === draggedSquare.id
						? { ...square, x: draggedSquare.originalX, y: draggedSquare.originalY }
						: square
				)
			);
		}

		dragging.stopDragging();
	};

	const handleSquareMouseDown = (square, e) => {
		e.preventDefault();
		setDraggedSquare({ ...square, originalX: square.x, originalY: square.y });
		dragging.setDragging(true, square.nodeType, { x: square.x, y: square.y });
	};

	const handleMouseMove = (e) => {
		if (draggedSquare && dragging.isDragging) {
			const pos = getGridPosition(e);
			if (pos && !isPositionOccupied(pos.gridX, pos.gridY)) {
				dragging.setPosition(pos.x, pos.y);
			}
		}
	};

	const handleMouseUp = (e) => {
		if (draggedSquare && dragging.isDragging) {
			handleDrop(e);
		}
		setDraggedSquare(null);
		dragging.stopDragging();
	};


    return (
		<div className="grid">
			<svg
				ref={svgRef}
				id="grid-svg"
				width={GRID_WIDTH}
				height={GRID_HEIGHT}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
			>
				{squares.map(square => (
					<rect
						key={square.id}
						x={square.x}
						y={square.y}
						width={SQUARE_SIZE}
						height={SQUARE_SIZE}
						rx="4"
						ry="4"
						onMouseDown={(e) => handleSquareMouseDown(square, e)}
						className={(square.nodeType === NodeType.EVENT ? "event" : "action")}
						style={{
							display: draggedSquare?.id === square.id ? 'none' : 'block'
						}}
					/>
				))}

				{dragging.isDragging && (
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