import React from 'react';
import ReactMarkdown from 'react-markdown';
import { parseFrontmatter } from '../../utils/frontmatter';
import './MarkdownPreview.css';

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown, className }) => {
  const [content, setContent] = React.useState('');
  
  React.useEffect(() => {
    // Parse the markdown to remove frontmatter before rendering
    const { content: parsedContent } = parseFrontmatter(markdown);
    setContent(parsedContent);
  }, [markdown]);

  return (
    <div className={`markdown-preview ${className || ''}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
