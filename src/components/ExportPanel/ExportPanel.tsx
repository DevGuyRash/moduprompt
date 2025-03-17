import React from 'react';
import { useNotebook, CellType } from '../../contexts/NotebookContext';
import { useNodeEditor, NodeType } from '../../contexts/NodeEditorContext';
import { jsPDF } from 'jspdf';
import './ExportPanel.css';

interface ExportPanelProps {
  currentMode: 'notebook' | 'node';
}

const ExportPanel: React.FC<ExportPanelProps> = ({ currentMode }) => {
  const { cells } = useNotebook();
  const { nodes, connections } = useNodeEditor();
  
  const [pdfTheme, setPdfTheme] = React.useState('default');
  const [includeComments, setIncludeComments] = React.useState(false);
  
  const exportToMarkdown = () => {
    let markdownContent = '';
    
    if (currentMode === 'notebook') {
      // Filter out comment cells if not including them
      const visibleCells = includeComments 
        ? cells 
        : cells.filter(cell => cell.type !== CellType.COMMENT);
      
      // Combine all cell content
      markdownContent = visibleCells.map(cell => cell.content).join('\n\n');
    } else {
      // For node mode, we need to traverse the connections to get the right order
      // Start with nodes that have no incoming connections (source nodes)
      const sourceNodes = nodes.filter(node => 
        !connections.some(conn => conn.targetId === node.id)
      );
      
      // Simple implementation - just concatenate all node content
      // A more sophisticated implementation would follow the connections
      markdownContent = nodes.map(node => node.content).join('\n\n');
    }
    
    // Create a download link
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moduprompt-export-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const exportToPdf = () => {
    const doc = new jsPDF();
    
    // Apply theme
    let textColor = '#000000';
    let backgroundColor = '#ffffff';
    let fontFamily = 'Helvetica';
    
    switch (pdfTheme) {
      case 'dark':
        textColor = '#ffffff';
        backgroundColor = '#2d2d2d';
        break;
      case 'sepia':
        textColor = '#5b4636';
        backgroundColor = '#f4ecd8';
        break;
      case 'modern':
        fontFamily = 'Courier';
        break;
      default:
        break;
    }
    
    // Set background color
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
    
    // Set text color
    doc.setTextColor(textColor);
    
    // Set font
    doc.setFont(fontFamily);
    
    // Add title
    doc.setFontSize(24);
    doc.text('ModuPrompt Export', 20, 20);
    
    // Add content
    doc.setFontSize(12);
    let y = 40;
    
    if (currentMode === 'notebook') {
      // Filter out comment cells if not including them
      const visibleCells = includeComments 
        ? cells 
        : cells.filter(cell => cell.type !== CellType.COMMENT);
      
      // Add each cell content
      visibleCells.forEach((cell, index) => {
        // Simple text splitting for PDF
        const lines = doc.splitTextToSize(cell.content, doc.internal.pageSize.width - 40);
        
        // Check if we need a new page
        if (y + lines.length * 7 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        
        // Add cell content
        doc.text(lines, 20, y);
        y += lines.length * 7 + 10;
      });
    } else {
      // For node mode, just add all node content
      nodes.forEach((node, index) => {
        // Simple text splitting for PDF
        const lines = doc.splitTextToSize(node.content, doc.internal.pageSize.width - 40);
        
        // Check if we need a new page
        if (y + lines.length * 7 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        
        // Add node content
        doc.text(lines, 20, y);
        y += lines.length * 7 + 10;
      });
    }
    
    // Save the PDF
    doc.save(`moduprompt-export-${Date.now()}.pdf`);
  };
  
  return (
    <div className="export-panel">
      <h3>Export Options</h3>
      
      <div className="export-section">
        <h4>Markdown Export</h4>
        {currentMode === 'notebook' && (
          <div className="export-option">
            <label>
              <input 
                type="checkbox" 
                checked={includeComments} 
                onChange={() => setIncludeComments(!includeComments)} 
              />
              Include comment cells
            </label>
          </div>
        )}
        <button 
          className="export-button"
          onClick={exportToMarkdown}
        >
          Export to Markdown
        </button>
      </div>
      
      <div className="export-section">
        <h4>PDF Export</h4>
        <div className="export-option">
          <label>Theme:</label>
          <select 
            value={pdfTheme}
            onChange={(e) => setPdfTheme(e.target.value)}
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
            <option value="sepia">Sepia</option>
            <option value="modern">Modern</option>
          </select>
        </div>
        {currentMode === 'notebook' && (
          <div className="export-option">
            <label>
              <input 
                type="checkbox" 
                checked={includeComments} 
                onChange={() => setIncludeComments(!includeComments)} 
              />
              Include comment cells
            </label>
          </div>
        )}
        <button 
          className="export-button"
          onClick={exportToPdf}
        >
          Export to PDF
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
