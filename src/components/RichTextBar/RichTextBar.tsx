import React from 'react';
import { 
  FaBold, FaItalic, FaStrikethrough, FaCode, 
  FaListUl, FaListOl, FaLink, FaHeading
} from 'react-icons/fa';
import './RichTextBar.css';

interface RichTextBarProps {
  onFormatText: (formatType: string, formatValue?: string) => void;
}

/**
 * Rich text editing toolbar component
 * Provides buttons for common markdown formatting options
 */
const RichTextBar: React.FC<RichTextBarProps> = ({ onFormatText }) => {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [showLinkInput, setShowLinkInput] = React.useState(false);

  /**
   * Handles link insertion
   */
  const handleLinkInsert = () => {
    if (linkUrl.trim()) {
      onFormatText('link', linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  return (
    <div className="rich-text-bar">
      <button 
        className="format-button" 
        onClick={() => onFormatText('bold')}
        title="Bold"
      >
        <FaBold />
      </button>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('italic')}
        title="Italic"
      >
        <FaItalic />
      </button>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('strikethrough')}
        title="Strikethrough"
      >
        <FaStrikethrough />
      </button>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('code-inline')}
        title="Inline Code"
      >
        <FaCode />
      </button>
      
      <div className="separator"></div>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('heading', '2')}
        title="Heading"
      >
        <FaHeading />
      </button>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('unordered-list')}
        title="Bullet List"
      >
        <FaListUl />
      </button>
      
      <button 
        className="format-button" 
        onClick={() => onFormatText('ordered-list')}
        title="Numbered List"
      >
        <FaListOl />
      </button>
      
      <div className="separator"></div>
      
      <button 
        className="format-button" 
        onClick={() => setShowLinkInput(!showLinkInput)}
        title="Insert Link"
      >
        <FaLink />
      </button>
      
      {showLinkInput && (
        <div className="link-input-container">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Enter URL"
            className="link-input"
          />
          <button 
            className="link-insert-button"
            onClick={handleLinkInsert}
          >
            Insert
          </button>
        </div>
      )}
    </div>
  );
};

export default RichTextBar;
