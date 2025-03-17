import React, { useState } from 'react';
import './styles/App.css';

enum EditorMode {
  NOTEBOOK = 'notebook',
  NODE = 'node'
}

const App: React.FC = () => {
  const [editorMode, setEditorMode] = useState<EditorMode>(EditorMode.NOTEBOOK);

  return (
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
        {editorMode === EditorMode.NOTEBOOK ? (
          <div className="notebook-editor">
            <p>Notebook Editor Mode (Coming Soon)</p>
          </div>
        ) : (
          <div className="node-editor">
            <p>Node Editor Mode (Coming Soon)</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
