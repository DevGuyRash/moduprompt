import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { NodeData, NodeConnection, NodeType, useNodeEditor, FormatOptions } from '../../contexts/NodeEditorContext';
import Node from '../Node/Node';
import PromptNode from './PromptNode';
import FilterNode from './FilterNode';
import FormattingOptions from '../FormattingOptions/FormattingOptions';
import { FaPlus, FaFilter, FaObjectGroup, FaCode, FaSearchMinus, FaSearchPlus, FaHome, FaInfoCircle, FaComment } from 'react-icons/fa';
import './NodeCanvas.css';

interface ConnectionLineProps {
  connection: NodeConnection;
  nodes: NodeData[];
  onDelete?: (connection: NodeConnection) => void;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ connection, nodes, onDelete }) => {
  const sourceNode = nodes.find(node => node.id === connection.sourceId);
  const targetNode = nodes.find(node => node.id === connection.targetId);
  
  if (!sourceNode || !targetNode) return null;
  
  // Find the DOM elements for the handles
  const sourceElement = document.querySelector(
    `[data-node-id="${connection.sourceId}"] [data-handle-id="${connection.sourceHandle}"]`
  );
  const targetElement = document.querySelector(
    `[data-node-id="${connection.targetId}"] [data-handle-id="${connection.targetHandle}"]`
  );
  
  if (!sourceElement || !targetElement) return null;
  
  // Get the positions of the handles
  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  const canvasRect = document.querySelector('.canvas-content')?.getBoundingClientRect();
  
  if (!canvasRect) return null;
  
  const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
  const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
  const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
  const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
  
  // Create a bezier curve path
  const path = `M ${sourceX},${sourceY} C ${sourceX + 50},${sourceY} ${targetX - 50},${targetY} ${targetX},${targetY}`;
  
  return (
    <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
      <path d={path} stroke="#6c757d" strokeWidth="2" fill="none" />
    </svg>
  );
};

const NodeCanvas: React.FC = () => {
  const { 
    nodes, 
    connections, 
    addNode, 
    updateNode, 
    deleteNode, 
    moveNode,
    toggleNodeCollapse,
    addConnection,
    deleteConnection,
    createFormatNode
  } = useNodeEditor();
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string, handleId: string } | null>(null);
  const [temporaryConnection, setTemporaryConnection] = useState<{ sourceX: number, sourceY: number, targetX: number, targetY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  const [formatPosition, setFormatPosition] = useState({ x: 0, y: 0 });
  const [potentialTarget, setPotentialTarget] = useState<string | null>(null);
  const [showNavigationHint, setShowNavigationHint] = useState(false);
  const [navigationHint, setNavigationHint] = useState('');
  const [nodeEditingStates, setNodeEditingStates] = useState<Record<string, boolean>>({});
  const navigationHintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  
  const [{ isOver }, drop] = useDrop({
    accept: 'NODE',
    drop: (item: { id: string }, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta && item.id) {
        const node = nodes.find(n => n.id === item.id);
        if (node) {
          const x = Math.round(node.position.x + delta.x / scale);
          const y = Math.round(node.position.y + delta.y / scale);
          moveNode(item.id, { x, y });
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });
  
  // Show navigation hint
  const showHint = (message: string) => {
    setNavigationHint(message);
    setShowNavigationHint(true);
    
    // Clear any existing timeout
    if (navigationHintTimeoutRef.current) {
      clearTimeout(navigationHintTimeoutRef.current);
    }
    
    // Hide hint after 3 seconds
    navigationHintTimeoutRef.current = setTimeout(() => {
      setShowNavigationHint(false);
    }, 3000);
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationHintTimeoutRef.current) {
        clearTimeout(navigationHintTimeoutRef.current);
      }
    };
  }, []);
  
  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only handle clicks directly on the canvas, not on nodes
    if (e.target === canvasContentRef.current) {
      setSelectedNodeId(null);
      if (showFormatOptions) {
        setShowFormatOptions(false);
      }
    }
  };
  
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Start dragging with left mouse button on the canvas itself (not on nodes)
    if (e.button === 0 && (e.target === canvasContentRef.current || e.currentTarget === canvasContentRef.current)) {
      e.preventDefault();
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Set cursor to grabbing
      if (canvasContentRef.current) {
        canvasContentRef.current.style.cursor = 'grabbing';
      }
      
      // Show navigation hint
      showHint('Drag to pan canvas');
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas && !isDraggingConnection) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition({
        x: position.x + dx,
        y: position.y + dy
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    // Update temporary connection line if dragging a connection
    if (isDraggingConnection && connectionStart) {
      const sourceElement = document.querySelector(
        `[data-node-id="${connectionStart.nodeId}"] [data-handle-id="${connectionStart.handleId}"]`
      );
      
      if (sourceElement) {
        const sourceRect = sourceElement.getBoundingClientRect();
        const canvasRect = canvasContentRef.current?.getBoundingClientRect();
        
        if (canvasRect) {
          const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
          const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
          const targetX = e.clientX - canvasRect.left;
          const targetY = e.clientY - canvasRect.top;
          
          setTemporaryConnection({ sourceX, sourceY, targetX, targetY });
          
          // Check if we're over a potential input handle
          const element = document.elementFromPoint(e.clientX, e.clientY);
          const inputHandle = element?.closest('.input-handle');
          
          // Remove previous potential target highlight
          if (potentialTarget) {
            const prevTarget = document.querySelector(`[data-handle-id="${potentialTarget}"].input-handle`);
            prevTarget?.classList.remove('connection-target');
          }
          
          if (inputHandle) {
            const handleId = inputHandle.getAttribute('data-handle-id');
            const nodeId = inputHandle.closest('[data-node-id]')?.getAttribute('data-node-id');
            
            // Don't highlight if trying to connect to the same node
            if (handleId && nodeId && nodeId !== connectionStart.nodeId) {
              inputHandle.classList.add('connection-target');
              setPotentialTarget(handleId);
            } else {
              setPotentialTarget(null);
            }
          } else {
            setPotentialTarget(null);
          }
        }
      }
    }
  };
  
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setIsDraggingCanvas(false);
    if (isDraggingConnection) {
      // Check if we're over an input handle
      const element = document.elementFromPoint(e.clientX, e.clientY);
      const inputHandle = element?.closest('.input-handle');
      
      if (inputHandle && connectionStart) {
        const nodeId = inputHandle.closest('[data-node-id]')?.getAttribute('data-node-id');
        const handleId = inputHandle.getAttribute('data-handle-id');
        
        if (nodeId && handleId && connectionStart.nodeId !== nodeId) {
          // Create a new connection
          addConnection({
            sourceId: connectionStart.nodeId,
            targetId: nodeId,
            sourceHandle: connectionStart.handleId,
            targetHandle: handleId
          });
          
          // Show connection created hint
          showHint('Connection created');
        }
      }
      
      // Remove any potential target highlights
      if (potentialTarget) {
        const prevTarget = document.querySelector(`[data-handle-id="${potentialTarget}"].input-handle`);
        prevTarget?.classList.remove('connection-target');
        setPotentialTarget(null);
      }
      
      setIsDraggingConnection(false);
      setConnectionStart(null);
      setTemporaryConnection(null);
    }
    
    // Reset cursor to grab
    if (canvasContentRef.current) {
      canvasContentRef.current.style.cursor = 'grab';
    }
  };
  
  const handleCanvasMouseLeave = () => {
    setIsDraggingCanvas(false);
    
    // Reset cursor
    if (canvasContentRef.current) {
      canvasContentRef.current.style.cursor = 'grab';
    }
  };
  
  const handleNodeSelect = (id: string) => {
    setSelectedNodeId(id);
    
    // Get node position for format options panel
    const node = nodes.find(n => n.id === id);
    if (node) {
      setFormatPosition(node.position);
    }
  };
  
  const handleConnectionStart = (nodeId: string, handleId: string) => {
    setIsDraggingConnection(true);
    setConnectionStart({ nodeId, handleId });
    
    // Show hint
    showHint('Drag to connect nodes');
  };
  
  const handleConnectionEnd = (nodeId: string, handleId: string) => {
    if (connectionStart) {
      // Create a new connection
      addConnection({
        sourceId: connectionStart.nodeId,
        targetId: nodeId,
        sourceHandle: connectionStart.handleId,
        targetHandle: handleId
      });
      
      // Show connection created hint
      showHint('Connection created');
    }
    
    setIsDraggingConnection(false);
    setConnectionStart(null);
    setTemporaryConnection(null);
  };
  
  const handleDisconnect = (nodeId: string, handleId: string, isInput: boolean) => {
    // Find the connection to delete
    const connectionToDelete = connections.find(conn => {
      if (isInput) {
        return conn.targetId === nodeId && conn.targetHandle === handleId;
      } else {
        return conn.sourceId === nodeId && conn.sourceHandle === handleId;
      }
    });
    
    if (connectionToDelete) {
      deleteConnection(connectionToDelete.sourceId, connectionToDelete.targetId);
      
      // Show hint
      showHint('Connection deleted');
    }
  };
  
  const handleAddNode = (type: NodeType) => {
    // Calculate position in the center of the visible canvas
    const canvasRect = canvasContentRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const centerX = (canvasRect.width / 2 - position.x) / scale;
    const centerY = (canvasRect.height / 2 - position.y) / scale;
    
    // Add the node
    const nodeId = addNode(type, { x: centerX, y: centerY });
    
    // Select the new node
    setSelectedNodeId(nodeId);
    
    // Show hint
    showHint(`${type} node added`);
    
    // Set editing state for prompt and filter join nodes
    if (type === NodeType.PROMPT || type === NodeType.FILTER_JOIN) {
      setNodeEditingStates(prev => ({
        ...prev,
        [nodeId]: true
      }));
    }
  };
  
  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && scale < 2) {
      setScale(prev => prev + 0.1);
      showHint('Zoomed in');
    } else if (direction === 'out' && scale > 0.5) {
      setScale(prev => prev - 0.1);
      showHint('Zoomed out');
    }
  };
  
  const handleResetView = () => {
    // Center the view to fit all nodes
    if (nodes.length === 0) {
      // If no nodes, just reset to default position
      setScale(1);
      setPosition({ x: 0, y: 0 });
      showHint('View reset');
      return;
    }
    
    // Calculate the bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 300); // Approximate node width
      maxY = Math.max(maxY, node.position.y + 200); // Approximate node height
    });
    
    // Calculate the center of the bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate the canvas center
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const canvasCenterX = canvasRect.width / 2;
    const canvasCenterY = canvasRect.height / 2;
    
    // Set the position to center the nodes
    setScale(1); // Reset zoom level
    setPosition({
      x: canvasCenterX - centerX,
      y: canvasCenterY - centerY
    });
    
    showHint('Centered view on all nodes');
  };
  
  const handleFormatChange = (formatOptions: FormatOptions) => {
    if (selectedNodeId) {
      // Create a format node
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node) {
        const formatNodeId = createFormatNode(
          formatOptions, 
          { x: node.position.x - 200, y: node.position.y }
        );
        
        // Connect format node to selected node
        addConnection({
          sourceId: formatNodeId,
          targetId: selectedNodeId,
          sourceHandle: 'output',
          targetHandle: 'format'
        });
        
        showHint('Format node created');
      }
      
      setShowFormatOptions(false);
    }
  };
  
  const handleNodeContentChange = (id: string, content: string) => {
    updateNode(id, { content });
  };
  
  const handleNodeFormatChange = (id: string, formatOptions: FormatOptions) => {
    updateNode(id, { formatOptions });
  };
  
  const handleToggleNodeEdit = (id: string) => {
    setNodeEditingStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Connect the drop ref to our canvas ref
  drop(canvasRef);
  
  return (
    <div 
      ref={canvasRef}
      className="canvas-container"
    >
      <div className="canvas-toolbar">
        <div className="toolbar-section">
          <button 
            className="toolbar-button"
            onClick={() => handleAddNode(NodeType.PROMPT)}
            title="Add Prompt Node"
          >
            <FaPlus /> Prompt
          </button>
          <button 
            className="toolbar-button"
            onClick={() => handleAddNode(NodeType.FILTER)}
            title="Add Filter Node"
          >
            <FaFilter /> Filter
          </button>
          <button 
            className="toolbar-button"
            onClick={() => {
              // Add a comment node
              const canvasRect = canvasContentRef.current?.getBoundingClientRect();
              if (!canvasRect) return;
              
              const centerX = (canvasRect.width / 2 - position.x) / scale;
              const centerY = (canvasRect.height / 2 - position.y) / scale;
              
              // Add the node with comment type
              const nodeId = addNode(NodeType.PROMPT, { x: centerX, y: centerY });
              
              // Set comment formatting
              updateNode(nodeId, { 
                formatOptions: { 
                  type: 'comment',
                  language: '',
                  calloutType: 'info',
                  xmlTag: ''
                } 
              });
              
              // Select the new node and set to editing mode
              setSelectedNodeId(nodeId);
              setNodeEditingStates(prev => ({
                ...prev,
                [nodeId]: true
              }));
              
              showHint('Comment node added');
            }}
            title="Add Comment Node"
          >
            <FaComment /> Comment
          </button>
        </div>
        
        <div className="toolbar-section">
          <button 
            className="toolbar-button"
            onClick={() => handleZoom('in')}
            title="Zoom In"
          >
            <FaSearchPlus />
          </button>
          <button 
            className="toolbar-button"
            onClick={() => handleZoom('out')}
            title="Zoom Out"
          >
            <FaSearchMinus />
          </button>
          <button 
            className="toolbar-button"
            onClick={handleResetView}
            title="Reset View"
          >
            <FaHome />
          </button>
        </div>
        
        <div className="toolbar-section">
          <button 
            className="toolbar-button help-button"
            onClick={() => {
              const helpText = `
Node Editor Help:

• Nodes: Create prompt and filter nodes using the toolbar buttons
• Navigation: Pan by dragging the canvas, zoom with + and - buttons
• Connections: Drag from output handle (right) to input handle (left)
• Selection: Click on node headers to select and move nodes
• Formatting: Use filter nodes to apply formatting to connected prompt nodes
• Reset View: Click the home button to center all nodes in view

Tip: Switch between Cell mode and Node mode to see different views of your content
              `;
              showHint(helpText);
            }}
            title="Show Help"
          >
            <FaInfoCircle />
          </button>
        </div>
      </div>
      
      <div 
        ref={canvasContentRef}
        className="canvas-content"
        style={{ 
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: isDraggingCanvas ? 'grabbing' : 'grab'
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
      >
        {/* Render nodes */}
        {nodes.map(node => {
          const isEditing = nodeEditingStates[node.id] || false;
          
          if (node.type === NodeType.PROMPT) {
            return (
              <PromptNode
                key={node.id}
                id={node.id}
                content={node.content}
                isEditing={isEditing}
                formatOptions={node.formatOptions}
                onContentChange={handleNodeContentChange}
                onFormatChange={handleNodeFormatChange}
                onToggleEdit={() => handleToggleNodeEdit(node.id)}
              />
            );
          } else if (node.type === NodeType.FILTER) {
            return (
              <FilterNode
                key={node.id}
                id={node.id}
                content={node.content}
                formatOptions={node.formatOptions}
                onFormatChange={handleNodeFormatChange}
              />
            );
          } else {
            return (
              <Node
                key={node.id}
                node={node}
                updateNode={updateNode}
                deleteNode={deleteNode}
                toggleNodeCollapse={toggleNodeCollapse}
                selected={selectedNodeId === node.id}
                onSelect={handleNodeSelect}
                onConnectionStart={handleConnectionStart}
                onConnectionEnd={handleConnectionEnd}
                onDisconnect={handleDisconnect}
              />
            );
          }
        })}
        
        {/* Render connections */}
        {connections.map((connection, index) => (
          <ConnectionLine 
            key={`${connection.sourceId}-${connection.targetId}-${index}`}
            connection={connection}
            nodes={nodes}
            onDelete={() => deleteConnection(connection.sourceId, connection.targetId)}
          />
        ))}
        
        {/* Render temporary connection line when dragging */}
        {temporaryConnection && (
          <svg className="connection-line" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <path 
              d={`M ${temporaryConnection.sourceX},${temporaryConnection.sourceY} C ${temporaryConnection.sourceX + 50},${temporaryConnection.sourceY} ${temporaryConnection.targetX - 50},${temporaryConnection.targetY} ${temporaryConnection.targetX},${temporaryConnection.targetY}`} 
              stroke="#6c757d" 
              strokeWidth="2" 
              strokeDasharray="5,5"
              fill="none" 
            />
          </svg>
        )}
        
        {/* Render formatting options panel if a format node is selected */}
        {showFormatOptions && selectedNodeId && (
          <div 
            className="format-options-panel"
            style={{ 
              position: 'absolute',
              left: formatPosition.x + 300, // Position to the right of the node
              top: formatPosition.y,
              transform: 'scale(1)',
              transformOrigin: 'top left'
            }}
          >
            <FormattingOptions 
              cellId={selectedNodeId}
              currentMode="node"
              onCreateFormat={handleFormatChange}
            />
          </div>
        )}
      </div>
      
      {/* Navigation hint */}
      <div className={`canvas-navigation-hint ${showNavigationHint ? 'visible' : ''}`}>
        {navigationHint}
      </div>
    </div>
  );
};

export default NodeCanvas;
