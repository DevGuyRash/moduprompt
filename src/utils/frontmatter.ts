import { SnippetType } from '../types/snippet';

/**
 * Parses frontmatter from markdown content
 * @param markdown The markdown content with optional frontmatter
 * @returns Object containing the parsed frontmatter and the content without frontmatter
 */
export const parseFrontmatter = (markdown: string): { 
  frontmatter: Record<string, any>; 
  content: string 
} => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = markdown.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content: markdown };
  }
  
  const frontmatterStr = match[1];
  const content = markdown.replace(match[0], '');
  
  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, any> = {};
  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim();
      
      // Try to parse as JSON if it looks like an array or object
      if ((value.startsWith('[') && value.endsWith(']')) || 
          (value.startsWith('{') && value.endsWith('}'))) {
        try {
          frontmatter[key.trim()] = JSON.parse(value);
        } catch (e) {
          frontmatter[key.trim()] = value;
        }
      } else if (value === 'true') {
        frontmatter[key.trim()] = true;
      } else if (value === 'false') {
        frontmatter[key.trim()] = false;
      } else if (!isNaN(Number(value))) {
        frontmatter[key.trim()] = Number(value);
      } else {
        frontmatter[key.trim()] = value;
      }
    }
  });
  
  return { frontmatter, content };
};

/**
 * Generates a unique ID for new snippets
 */
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Creates a new snippet with default values
 */
export const createNewSnippet = (
  title: string, 
  content: string = '', 
  folder: string = ''
): SnippetType => {
  const now = Date.now();
  
  return {
    id: generateId(),
    title,
    content,
    folder,
    frontmatter: {},
    createdAt: now,
    updatedAt: now
  };
};

/**
 * Extracts folder path components from a full path
 * @param path Full folder path (e.g. "parent/child/grandchild")
 * @returns Array of all path segments including full paths (e.g. ["parent", "parent/child", "parent/child/grandchild"])
 */
export const extractFolderPaths = (path: string): string[] => {
  if (!path) return [];
  
  const segments = path.split('/');
  const paths: string[] = [];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    paths.push(currentPath);
  }
  
  return paths;
};
