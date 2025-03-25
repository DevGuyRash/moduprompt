import React from 'react';
import { useNotebook, CellType } from '../../contexts/NotebookContext';
import { useNodeEditor, NodeType } from '../../contexts/NodeEditorContext';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import html2canvas from 'html2canvas';
import './ExportPanel.css';

interface ExportPanelProps {
  currentMode: 'notebook' | 'node';
}

const ExportPanel: React.FC<ExportPanelProps> = ({ currentMode }) => {
  const { cells } = useNotebook();
  const { nodes, connections } = useNodeEditor();
  
  const [pdfTheme, setPdfTheme] = React.useState('default');
  const [includeComments, setIncludeComments] = React.useState(false);
  const [renderingMethod, setRenderingMethod] = React.useState<'text' | 'html'>('html');
  
  /**
   * Applies formatting to content based on formatting options
   * @param {string} content - The raw content
   * @param {any} formatting - The formatting options
   * @returns {string} The formatted content
   */
  const getFormattedContent = (content: string, formatting: any) => {
    if (!formatting) return content;

    switch (formatting.type) {
      case 'code':
        const language = formatting.language || '';
        return `\`\`\`${language}\n${content}\n\`\`\``;
      case 'blockquote':
        // Add > to each line
        return content.split('\n').map(line => `> ${line}`).join('\n');
      case 'callout':
        const calloutType = formatting.calloutType || 'info';
        return `:::${calloutType}\n${content}\n:::`;
      case 'xml':
        const tag = formatting.xmlTag || 'div';
        return `<${tag}>\n${content}\n</${tag}>`;
      default:
        return content;
    }
  };
  
  const exportToMarkdown = () => {
    let markdownContent = '';
    
    if (currentMode === 'notebook') {
      // Filter out comment cells if not including them
      const visibleCells = includeComments 
        ? cells 
        : cells.filter(cell => cell.type !== CellType.COMMENT);
      
      // Combine all cell content with formatting applied
      markdownContent = visibleCells.map(cell => 
        getFormattedContent(cell.content, cell.formatting)
      ).join('\n\n');
    } else {
      // For node mode, we need to traverse the connections to get the right order
      // Start with nodes that have no incoming connections (source nodes)
      const sourceNodes = nodes.filter(node => 
        !connections.some(conn => conn.targetId === node.id)
      );
      
      // Simple implementation - just concatenate all node content with formatting
      markdownContent = nodes.map(node => {
        // Apply formatting if the node has formatting options
        if (node.formatOptions) {
          return getFormattedContent(node.content, node.formatOptions);
        }
        return node.content;
      }).join('\n\n');
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
  
  const exportToPdf = async () => {
    if (renderingMethod === 'html') {
      await exportToPdfWithHtml();
    } else {
      exportToPdfWithText();
    }
  };

  const exportToPdfWithHtml = async () => {
    // Create a temporary container for rendering markdown
    const container = document.createElement('div');
    container.className = `pdf-export-container theme-${pdfTheme}`;
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    
    // Apply theme styles
    switch (pdfTheme) {
      case 'dark':
        container.style.backgroundColor = '#2d2d2d';
        container.style.color = '#ffffff';
        break;
      case 'sepia':
        container.style.backgroundColor = '#f4ecd8';
        container.style.color = '#5b4636';
        break;
      case 'modern':
        container.style.fontFamily = 'Courier, monospace';
        break;
      default:
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#000000';
        break;
    }
    
    // Add title
    const title = document.createElement('h1');
    title.textContent = 'ModuPrompt Export';
    container.appendChild(title);
    
    // Add content
    if (currentMode === 'notebook') {
      // Filter out comment cells if not including them
      const visibleCells = includeComments 
        ? cells 
        : cells.filter(cell => cell.type !== CellType.COMMENT);
      
      // Add each cell content with formatting
      visibleCells.forEach((cell, index) => {
        // Create cell container
        const cellDiv = document.createElement('div');
        cellDiv.className = 'export-cell';
        cellDiv.style.marginBottom = '30px';
        
        // Apply formatting to content
        const formattedContent = getFormattedContent(cell.content, cell.formatting);
        
        // Add formatted title for code blocks, blockquotes, etc.
        if (cell.formatting) {
          const formatHeader = document.createElement('div');
          formatHeader.className = `format-header format-${cell.formatting.type}`;
          formatHeader.style.fontWeight = 'bold';
          formatHeader.style.marginBottom = '10px';
          
          switch (cell.formatting.type) {
            case 'code':
              formatHeader.textContent = `Code Block${cell.formatting.language ? ` (${cell.formatting.language})` : ''}`;
              formatHeader.style.fontFamily = 'monospace';
              break;
            case 'blockquote':
              formatHeader.textContent = 'Blockquote';
              formatHeader.style.fontStyle = 'italic';
              break;
            case 'callout':
              formatHeader.textContent = `${cell.formatting.calloutType?.toUpperCase() || 'INFO'} CALLOUT`;
              break;
            case 'xml':
              formatHeader.textContent = `XML (${cell.formatting.xmlTag || 'div'})`;
              break;
          }
          
          cellDiv.appendChild(formatHeader);
        }
        
        // Render markdown to HTML
        const contentDiv = document.createElement('div');
        contentDiv.className = 'cell-content';
        contentDiv.innerHTML = DOMPurify.sanitize(marked(formattedContent));
        
        // Apply special styling based on formatting
        if (cell.formatting) {
          switch (cell.formatting.type) {
            case 'code':
              contentDiv.style.backgroundColor = pdfTheme === 'dark' ? '#1e1e1e' : '#f5f5f5';
              contentDiv.style.padding = '10px';
              contentDiv.style.borderRadius = '4px';
              contentDiv.style.fontFamily = 'monospace';
              break;
            case 'blockquote':
              contentDiv.style.borderLeft = '4px solid #ccc';
              contentDiv.style.paddingLeft = '15px';
              contentDiv.style.fontStyle = 'italic';
              break;
            case 'callout':
              const calloutColors: Record<string, string> = {
                info: pdfTheme === 'dark' ? '#2c5282' : '#ebf8ff',
                warning: pdfTheme === 'dark' ? '#975a16' : '#fffbeb',
                success: pdfTheme === 'dark' ? '#276749' : '#f0fff4',
                error: pdfTheme === 'dark' ? '#9b2c2c' : '#fff5f5'
              };
              contentDiv.style.backgroundColor = calloutColors[cell.formatting.calloutType || 'info'];
              contentDiv.style.padding = '10px';
              contentDiv.style.borderRadius = '4px';
              break;
            case 'xml':
              contentDiv.style.fontFamily = 'monospace';
              break;
          }
        }
        
        cellDiv.appendChild(contentDiv);
        container.appendChild(cellDiv);
      });
    } else {
      // For node mode, add all node content with formatting
      nodes.forEach((node, index) => {
        if (node.type !== NodeType.PROMPT) return; // Only include prompt nodes
        
        // Create node container
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'export-node';
        nodeDiv.style.marginBottom = '30px';
        
        // Apply formatting if the node has formatting options
        let formattedContent = node.content;
        if (node.formatOptions) {
          formattedContent = getFormattedContent(node.content, node.formatOptions);
          
          // Add formatted title
          const formatHeader = document.createElement('div');
          formatHeader.className = `format-header format-${node.formatOptions.type}`;
          formatHeader.style.fontWeight = 'bold';
          formatHeader.style.marginBottom = '10px';
          
          switch (node.formatOptions.type) {
            case 'code':
              formatHeader.textContent = `Code Block${node.formatOptions.language ? ` (${node.formatOptions.language})` : ''}`;
              formatHeader.style.fontFamily = 'monospace';
              break;
            case 'blockquote':
              formatHeader.textContent = 'Blockquote';
              formatHeader.style.fontStyle = 'italic';
              break;
            case 'callout':
              formatHeader.textContent = `${node.formatOptions.calloutType?.toUpperCase() || 'INFO'} CALLOUT`;
              break;
            case 'xml':
              formatHeader.textContent = `XML (${node.formatOptions.xmlTag || 'div'})`;
              break;
          }
          
          nodeDiv.appendChild(formatHeader);
        }
        
        // Render markdown to HTML
        const contentDiv = document.createElement('div');
        contentDiv.className = 'node-content';
        contentDiv.innerHTML = DOMPurify.sanitize(marked(formattedContent));
        
        // Apply special styling based on formatting
        if (node.formatOptions) {
          switch (node.formatOptions.type) {
            case 'code':
              contentDiv.style.backgroundColor = pdfTheme === 'dark' ? '#1e1e1e' : '#f5f5f5';
              contentDiv.style.padding = '10px';
              contentDiv.style.borderRadius = '4px';
              contentDiv.style.fontFamily = 'monospace';
              break;
            case 'blockquote':
              contentDiv.style.borderLeft = '4px solid #ccc';
              contentDiv.style.paddingLeft = '15px';
              contentDiv.style.fontStyle = 'italic';
              break;
            case 'callout':
              const calloutColors: Record<string, string> = {
                info: pdfTheme === 'dark' ? '#2c5282' : '#ebf8ff',
                warning: pdfTheme === 'dark' ? '#975a16' : '#fffbeb',
                success: pdfTheme === 'dark' ? '#276749' : '#f0fff4',
                error: pdfTheme === 'dark' ? '#9b2c2c' : '#fff5f5'
              };
              contentDiv.style.backgroundColor = calloutColors[node.formatOptions.calloutType || 'info'];
              contentDiv.style.padding = '10px';
              contentDiv.style.borderRadius = '4px';
              break;
            case 'xml':
              contentDiv.style.fontFamily = 'monospace';
              break;
          }
        }
        
        nodeDiv.appendChild(contentDiv);
        container.appendChild(nodeDiv);
      });
    }
    
    // Add container to document
    document.body.appendChild(container);
    
    try {
      // Use html2canvas to render the container to an image
      const canvas = await html2canvas(container, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false
      });
      
      // Create PDF with proper dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      // Add the image to the PDF
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      // Save the PDF
      pdf.save(`moduprompt-export-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try the text-based method instead.');
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  };
  
  const exportToPdfWithText = () => {
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
      
      // Add each cell content with formatting
      visibleCells.forEach((cell, index) => {
        // Apply formatting to content
        const formattedContent = getFormattedContent(cell.content, cell.formatting);
        
        // Render markdown to HTML
        const htmlContent = marked(formattedContent) as string;
        // Sanitize HTML to prevent XSS
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);
        
        // Create a temporary element to hold the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedHtml;
        
        // Extract text content for PDF
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Simple text splitting for PDF
        const lines = doc.splitTextToSize(textContent, doc.internal.pageSize.width - 40);
        
        // Check if we need a new page
        if (y + lines.length * 7 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        
        // Add formatted title for code blocks, blockquotes, etc.
        if (cell.formatting) {
          let formatTitle = '';
          switch (cell.formatting.type) {
            case 'code':
              formatTitle = `Code Block${cell.formatting.language ? ` (${cell.formatting.language})` : ''}`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
            case 'blockquote':
              doc.setFont(fontFamily, 'italic');
              break;
            case 'callout':
              formatTitle = `${cell.formatting.calloutType?.toUpperCase() || 'INFO'} CALLOUT`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
            case 'xml':
              formatTitle = `XML (${cell.formatting.xmlTag || 'div'})`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
          }
        }
        
        // Reset font for content
        doc.setFont(fontFamily, 'normal');
        
        // Add cell content
        doc.text(lines, 20, y);
        y += lines.length * 7 + 15; // Add more space between cells
      });
    } else {
      // For node mode, add all node content with formatting
      nodes.forEach((node, index) => {
        if (node.type !== NodeType.PROMPT) return; // Only include prompt nodes
        
        // Apply formatting if the node has formatting options
        let formattedContent = node.content;
        if (node.formatOptions) {
          formattedContent = getFormattedContent(node.content, node.formatOptions);
        }
        
        // Render markdown to HTML
        const htmlContent = marked(formattedContent) as string;
        // Sanitize HTML to prevent XSS
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);
        
        // Create a temporary element to hold the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedHtml;
        
        // Extract text content for PDF
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        
        // Simple text splitting for PDF
        const lines = doc.splitTextToSize(textContent, doc.internal.pageSize.width - 40);
        
        // Check if we need a new page
        if (y + lines.length * 7 > doc.internal.pageSize.height - 20) {
          doc.addPage();
          y = 20;
        }
        
        // Add formatted title for code blocks, blockquotes, etc.
        if (node.formatOptions) {
          let formatTitle = '';
          switch (node.formatOptions.type) {
            case 'code':
              formatTitle = `Code Block${node.formatOptions.language ? ` (${node.formatOptions.language})` : ''}`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
            case 'blockquote':
              doc.setFont(fontFamily, 'italic');
              break;
            case 'callout':
              formatTitle = `${node.formatOptions.calloutType?.toUpperCase() || 'INFO'} CALLOUT`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
            case 'xml':
              formatTitle = `XML (${node.formatOptions.xmlTag || 'div'})`;
              doc.setFont(fontFamily, 'bold');
              doc.text(formatTitle, 20, y);
              y += 10;
              break;
          }
        }
        
        // Reset font for content
        doc.setFont(fontFamily, 'normal');
        
        // Add node content
        doc.text(lines, 20, y);
        y += lines.length * 7 + 15; // Add more space between nodes
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
        <div className="export-option">
          <label>Rendering Method:</label>
          <select 
            value={renderingMethod}
            onChange={(e) => setRenderingMethod(e.target.value as 'text' | 'html')}
          >
            <option value="html">HTML (Better Formatting)</option>
            <option value="text">Text (Fallback)</option>
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
