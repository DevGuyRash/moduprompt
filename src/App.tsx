import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SnippetProvider } from './contexts/SnippetContext';
import { NotebookProvider } from './contexts/NotebookContext';
import { NodeEditorProvider } from './contexts/NodeEditorContext';
import { useNotebook, CellType, FormatOptions as NotebookFormatOptions } from './contexts/NotebookContext';
import { useNodeEditor, NodeType, FormatOptions as NodeFormatOptions } from './contexts/NodeEditorContext';
import SnippetPanel from './components/SnippetPanel/SnippetPanel';
import NotebookEditor from './components/NotebookEditor/NotebookEditor';
import NodeCanvas from './components/NodeCanvas/NodeCanvas';
import ExportPanel from './components/ExportPanel/ExportPanel';
import FormattingOptions from './components/FormattingOptions/FormattingOptions';
import './styles/App.css';

enum EditorMode {
  NOTEBOOK = 'notebook',
  NODE = 'node'
}

// Content converter component to handle mode switching
const ContentSynchronizer: React.FC<{ editorMode: EditorMode }> = ({ editorMode }) => {
  const { cells, addCell, updateCell, formatCell } = useNotebook();
  const { nodes, connections, convertCellsToNodes, clearNodes } = useNodeEditor();
  
  // When mode changes, synchronize content
  useEffect(() => {
    // Convert from notebook to node mode
    if (editorMode === EditorMode.NODE) {
      // Always convert cells to nodes when in node mode to ensure synchronization
      convertCellsToNodes(cells);
    }
    
    // Convert from node to notebook mode
    if (editorMode === EditorMode.NOTEBOOK && nodes.length > 0 && cells.length === 0) {
      // Sort nodes based on connections to maintain sequence
      const sortedNodes = [...nodes];
      
      // Find starting nodes (no incoming connections)
      const startNodeIds = nodes
        .filter(node => !connections.some(conn => conn.targetId === node.id))
        .map(node => node.id);
      
      // If we have a clear starting point
      if (startNodeIds.length > 0) {
        const orderedNodeIds: string[] = [];
        
        // For each starting node, follow connections to build ordered list
        const processNode = (nodeId: string) => {
          if (!orderedNodeIds.includes(nodeId)) {
            orderedNodeIds.push(nodeId);
            
            // Find outgoing connections
            const outgoingConnections = connections.filter(conn => conn.sourceId === nodeId);
            
            // Process connected nodes
            outgoingConnections.forEach(conn => {
              processNode(conn.targetId);
            });
          }
        };
        
        // Process all starting nodes
        startNodeIds.forEach(nodeId => processNode(nodeId));
        
        // Add any remaining nodes that weren't connected
        nodes.forEach(node => {
          if (!orderedNodeIds.includes(node.id)) {
            orderedNodeIds.push(node.id);
          }
        });
        
        // Create cells in the correct order
        orderedNodeIds.forEach(nodeId => {
          const node = nodes.find(n => n.id === nodeId);
          if (node && node.type === NodeType.PROMPT) {
            // Find any format nodes connected to this node
            const formatConnection = connections.find(
              conn => conn.targetId === node.id && conn.targetHandle === 'format'
            );
            
            let cellId = '';
            
            // Add the cell first
            addCell(CellType.CONTENT, node.content);
            
            // Get the last added cell's ID
            const lastCellId = cells[cells.length - 1]?.id;
            if (lastCellId) {
              cellId = lastCellId;
            }
            
            if (formatConnection && cellId) {
              // Get the format node
              const formatNode = nodes.find(n => n.id === formatConnection.sourceId);
              if (formatNode && formatNode.formatOptions) {
                // Apply formatting to the cell
                const notebookFormatOptions: NotebookFormatOptions = {
                  type: formatNode.formatOptions.type,
                  language: formatNode.formatOptions.language,
                  calloutType: formatNode.formatOptions.calloutType,
                  xmlTag: formatNode.formatOptions.xmlTag
                };
                
                formatCell(cellId, notebookFormatOptions);
              }
            }
          }
        });
        
        // Clear nodes after conversion
        clearNodes();
      } else {
        // Fallback: if no clear sequence, just add all prompt nodes as cells
        nodes.forEach(node => {
          if (node.type === NodeType.PROMPT) {
            addCell(CellType.CONTENT, node.content);
          }
        });
        
        // Clear nodes after conversion
        clearNodes();
      }
    }
  }, [editorMode, cells, nodes, connections, addCell, updateCell, formatCell, convertCellsToNodes, clearNodes]);
  
  return null; // This is just a logic component, no UI
};

const App: React.FC = () => {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.NOTEBOOK);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showFormattingOptions, setShowFormattingOptions] = useState(false);
  const [formatPosition, setFormatPosition] = useState({ x: 0, y: 0 });
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const { createFormatNode } = useNodeEditor();

  // Handle format button click
  const handleFormatClick = () => {
    // If in node mode, set the format position to the center of the canvas
    if (editorMode === EditorMode.NODE) {
      const canvasElement = document.querySelector('.node-canvas');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        setFormatPosition({
          x: rect.width / 2 - 100,
          y: rect.height / 2 - 100
        });
      }
    }
    setShowFormattingOptions(!showFormattingOptions);
  };

  // Handle format creation in node mode
  const handleCreateFormat = (formatOptions: NodeFormatOptions) => {
    if (editorMode === EditorMode.NODE) {
      createFormatNode(formatOptions, formatPosition);
      setShowFormattingOptions(false);
    }
  };

  // Handle mode switching
  const handleModeSwitch = (mode: EditorMode) => {
    // Only switch if the mode is different
    if (mode !== editorMode) {
      setEditorMode(mode);
      
      // Reset selected cell when switching modes
      setSelectedCellId(null);
      
      // Close formatting options panel when switching modes
      if (showFormattingOptions) {
        setShowFormattingOptions(false);
      }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <SnippetProvider>
        <NotebookProvider>
          <NodeEditorProvider>
            <div className="app-container">
              <header className="app-header">
                <h1>ModuPrompt</h1>
                <div className="header-actions">
                  <div className="mode-toggle">
                    <button 
                      className={editorMode === EditorMode.NOTEBOOK ? 'active' : ''}
                      onClick={() => handleModeSwitch(EditorMode.NOTEBOOK)}
                    >
                      Notebook Mode
                    </button>
                    <button 
                      className={editorMode === EditorMode.NODE ? 'active' : ''}
                      onClick={() => handleModeSwitch(EditorMode.NODE)}
                    >
                      Node Mode
                    </button>
                  </div>
                  <button 
                    className={`format-toggle ${showFormattingOptions ? 'active' : ''}`}
                    onClick={handleFormatClick}
                  >
                    Format
                  </button>
                  <button 
                    className={`export-toggle ${showExportPanel ? 'active' : ''}`}
                    onClick={() => setShowExportPanel(!showExportPanel)}
                  >
                    Export
                  </button>
                </div>
              </header>
              <main className="app-content">
                <SnippetPanel 
                  onSelectSnippet={() => {}} 
                  currentMode={editorMode === EditorMode.NOTEBOOK ? 'notebook' : 'node'} 
                />
                
                <div className="editor-container">
                  {showFormattingOptions && (
                    <div className="formatting-options-container">
                      <FormattingOptions 
                        currentMode={editorMode === EditorMode.NOTEBOOK ? 'notebook' : 'node'}
                        position={formatPosition}
                        cellId={selectedCellId}
                        onClose={() => setShowFormattingOptions(false)}
                        onCreateFormat={handleCreateFormat}
                      />
                    </div>
                  )}
                  
                  {editorMode === EditorMode.NOTEBOOK ? (
                    <NotebookEditor onSelectCell={setSelectedCellId} />
                  ) : (
                    <NodeCanvas />
                  )}
                  
                  <ContentSynchronizer editorMode={editorMode} />
                </div>
                
                {showExportPanel && (
                  <ExportPanel currentMode={editorMode === EditorMode.NOTEBOOK ? 'notebook' : 'node'} />
                )}
              </main>
            </div>
          </NodeEditorProvider>
        </NotebookProvider>
      </SnippetProvider>
    </DndProvider>
  );
};

export default App;
