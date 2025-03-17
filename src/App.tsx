import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SnippetProvider } from './contexts/SnippetContext';
import { NotebookProvider } from './contexts/NotebookContext';
import { NodeEditorProvider } from './contexts/NodeEditorContext';
import SnippetPanel from './components/SnippetPanel/SnippetPanel';
import NotebookEditor from './components/NotebookEditor/NotebookEditor';
import NodeCanvas from './components/NodeCanvas/NodeCanvas';
import MarkdownPreview from './components/MarkdownPreview/MarkdownPreview';
import './styles/App.css';

enum EditorMode {
  NOTEBOOK = 'notebook',
  NODE = 'node'
}

const App: React.FC = () => {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.NOTEBOOK);
  const [selectedSnippetContent, setSelectedSnippetContent] = useState<string>('');

  const handleSelectSnippet = (snippet: any) => {
    setSelectedSnippetContent(snippet.content);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <SnippetProvider>
        <NotebookProvider>
          <NodeEditorProvider>
            <div className="app-container">
              <header className="app-header">
                <h1>ModuPrompt</h1>
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
              </header>
              <main className="app-content">
                <SnippetPanel onSelectSnippet={handleSelectSnippet} />
                
                <div className="editor-container">
                  {editorMode === EditorMode.NOTEBOOK ? (
                    <NotebookEditor />
                  ) : (
                    <NodeCanvas />
                  )}
                </div>
              </main>
            </div>
          </NodeEditorProvider>
        </NotebookProvider>
      </SnippetProvider>
    </DndProvider>
  );
};

export default App;
