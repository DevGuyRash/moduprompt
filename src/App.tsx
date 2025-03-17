import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SnippetProvider } from './contexts/SnippetContext';
import { NotebookProvider } from './contexts/NotebookContext';
import { NodeEditorProvider } from './contexts/NodeEditorContext';
import { useNotebook, CellType } from './contexts/NotebookContext';
import { useNodeEditor, NodeType } from './contexts/NodeEditorContext';
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
  const { cells, addCell, updateCell } = useNotebook();
  const { nodes, addNode } = useNodeEditor();
  
  // When mode changes, synchronize content
  useEffect(() => {
    // Convert from notebook to node mode
    if (editorMode === EditorMode.NODE && cells.length > 0 && nodes.length === 0) {
      // Create separate nodes for each content cell
      const contentCells = cells.filter(cell => cell.type === CellType.CONTENT);
      
      // Position nodes in a grid-like layout
      contentCells.forEach((cell, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 100 + (col * 400);
        const y = 100 + (row * 300);
        
        addNode(NodeType.PROMPT, { x, y }, cell.content);
      });
    }
    
    // Convert from node to notebook mode
    if (editorMode === EditorMode.NOTEBOOK && nodes.length > 0 && cells.length === 0) {
      // For each node, create a cell
      nodes.forEach(node => {
        addCell(CellType.CONTENT, node.content);
      });
    }
  }, [editorMode, cells, nodes, addCell, addNode]);
  
  return null; // This is just a logic component, no UI
};

const App: React.FC = () => {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.NOTEBOOK);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showFormattingOptions, setShowFormattingOptions] = useState(false);

  const handleApplyFormatting = (formatterType: string, options?: any) => {
    // This will be implemented to apply formatting to the selected content
    console.log('Applying formatting:', formatterType, options);
    // The actual implementation will depend on which editor is active
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
                      onClick={() => setEditorMode(EditorMode.NOTEBOOK)}
                    >
                      Notebook Mode
                    </button>
                    <button 
                      className={editorMode === EditorMode.NODE ? 'active' : ''}
                      onClick={() => setEditorMode(EditorMode.NODE)}
                    >
                      Node Mode
                    </button>
                  </div>
                  <button 
                    className={`format-toggle ${showFormattingOptions ? 'active' : ''}`}
                    onClick={() => setShowFormattingOptions(!showFormattingOptions)}
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
                <SnippetPanel onSelectSnippet={() => {}} />
                
                <div className="editor-container">
                  {showFormattingOptions && (
                    <FormattingOptions onApplyFormatting={handleApplyFormatting} />
                  )}
                  
                  {editorMode === EditorMode.NOTEBOOK ? (
                    <NotebookEditor />
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
