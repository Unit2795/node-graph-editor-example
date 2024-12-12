import './Toolbar.css'
import {NodeType, useToolbarDragging} from "./toolbarState.ts";
import {useGridStore} from "../Grid/gridState.ts";
import {ChangeEvent} from "react";

const Toolbar = () => {
	const {setDragging} = useToolbarDragging();
	const {saveToFile, loadFromFile, nodes} = useGridStore();

	const isDragging = (isDragging: boolean, nodeType: NodeType) => () => {
		setDragging(isDragging, nodeType);
	};

	const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			loadFromFile(file);
		}
	};

    return (
		<div className="toolbar">
			<h1 className="title">Toolbar</h1>
			<div className={'nodes'}>
				<div className={'node'}>
					<div draggable className="draggable event" onDragStart={isDragging(true, NodeType.EVENT)}>E</div>
					<p>Event</p>
				</div>
				<div className={'node'}>
					<div draggable className="draggable action" onDragStart={isDragging(true, NodeType.ACTION)}>A</div>
					<p>Action</p>
				</div>
			</div>
			<div className={'buttons'}>
				<button onClick={() => {
					alert("- Drag nodes from the toolbar onto the page to place them.\n- Drag existing nodes to move them around.\n- Click on a node to select it, click it again to deselect it.\n- Press 'Delete' key or click delete button to remove selected nodes.\n- With two nodes selected, link them by pressing 'Enter' key. Events can connect to other Event or Action nodes. The first selected Event node will point to the second selected one. Events will always point to Actions.\n- Press Clear to deselect all nodes.")
				}}>Tutorial
				</button>
				{
					nodes.length > 0 && (
						<button onClick={() => {
							saveToFile();
						}}>Save</button>
					)
				}
				<label className="file-button">
					<input
						type="file"
						accept="application/json"
						onChange={handleFileImport}/>
					Import
				</label>
				{/*<button onClick={() => {
					loadFromFile();
				}}>Import
				</button>*/}
				{/*<button>Select All</button>
				<button>Delete</button>
				<button>Link</button>
				<button>Clear</button>*/}
			</div>
		</div>
	);
};

export default Toolbar;