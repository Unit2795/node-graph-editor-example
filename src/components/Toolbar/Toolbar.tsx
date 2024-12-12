import './Toolbar.css'
import {NodeType, useToolbarDragging} from "./toolbarState.ts";

const Toolbar = () => {
	const {setDragging} = useToolbarDragging();

	const isDragging = (isDragging: boolean, nodeType: NodeType) => () => {
		setDragging(isDragging, nodeType);
	};

    return (
		<div className="toolbar">
			<div draggable className="draggable event" onDragStart={isDragging(true, NodeType.EVENT)}>E</div>
			<div draggable className="draggable action" onDragStart={isDragging(true, NodeType.ACTION)}>A</div>
		</div>
	);
};

export default Toolbar;