import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SnippetProvider } from './contexts/SnippetContext';
import { NotebookProvider } from './contexts/NotebookContext';
import { NodeEditorProvider } from './contexts/NodeEditorContext';
import SnippetPanel from './components/SnippetPanel/SnippetPanel';
import NotebookEditor from './components/NotebookEditor/NotebookEditor';
import NodeCanvas from './components/NodeCanvas/NodeCanvas';
import ExportPanel from './components/ExportPanel/ExportPanel';
import './styles/App.css';

enum EditorMode {
  NOTEBOOK = 'notebook',
  NODE = 'node'
}

const App: React.FC = () => {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.NOTEBOOK);
  const [showExportPanel, setShowExportPanel] = useState(false);

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
                  {editorMode === EditorMode.NOTEBOOK ? (
                    <NotebookEditor />
                  ) : (
                    <NodeCanvas />
                  )}
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
