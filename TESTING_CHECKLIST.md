# Modular Prompt Builder Testing Checklist

This document provides a comprehensive testing checklist for the Modular Prompt Builder application. These tests should be performed after any significant changes to ensure all features continue to work correctly.

## Core Functionality Tests

### Application Startup
- [ ] Application loads without errors
- [ ] Initial UI renders correctly
- [ ] Default mode (Notebook or Node) loads properly
- [ ] Sidebar panels are visible and properly sized

### Mode Switching
- [ ] Switch from Notebook to Node mode
- [ ] Switch from Node to Notebook mode
- [ ] Verify content is preserved when switching modes
- [ ] Verify UI elements update appropriately for each mode

## Notebook Mode Tests

### Cell Management
- [ ] Create a new cell
- [ ] Delete an existing cell
- [ ] Edit cell content
- [ ] Toggle between edit and view modes
- [ ] Verify markdown rendering in view mode

### Cell Drag and Drop
- [ ] Drag a cell up in the list
- [ ] Drag a cell down in the list
- [ ] Verify cell order updates correctly
- [ ] Verify no errors occur during drag operations

### Rich Text Editing
- [ ] Test bold formatting
- [ ] Test italic formatting
- [ ] Test strikethrough formatting
- [ ] Test inline code formatting
- [ ] Test heading formatting
- [ ] Test unordered list formatting
- [ ] Test ordered list formatting
- [ ] Test link insertion

### Cell Formatting
- [ ] Apply code block formatting
- [ ] Apply blockquote formatting
- [ ] Apply callout formatting
- [ ] Apply XML tag formatting
- [ ] Verify formatting is visible in view mode
- [ ] Verify formatting is preserved when switching to edit mode
- [ ] Test combining multiple formatting options
- [ ] Test removing formatting

### Format Cell Menu
- [ ] Open format menu
- [ ] Select different formatting options
- [ ] Verify menu closes when clicking outside
- [ ] Verify menu closes when selecting an option

## Node Mode Tests

### Node Creation
- [ ] Create a content node
- [ ] Create a format node
- [ ] Create a filter node
- [ ] Create a filter join node

### Node Connections
- [ ] Connect a content node to a format node
- [ ] Connect a format node to another format node
- [ ] Connect multiple nodes in a chain
- [ ] Verify connections are visually represented correctly

### Node Editing
- [ ] Edit content in a content node
- [ ] Edit properties of a format node
- [ ] Verify changes are reflected in the node display
- [ ] Test node deletion and connection cleanup

### Canvas Navigation
- [ ] Pan the canvas
- [ ] Zoom in/out
- [ ] Reset view
- [ ] Verify nodes remain properly positioned

## Snippet Functionality Tests

### Snippet Management
- [ ] Create a new snippet
- [ ] Edit an existing snippet
- [ ] Delete a snippet
- [ ] Verify snippet content is saved correctly

### Folder Management
- [ ] Create a new folder
- [ ] Create a nested folder
- [ ] Delete a folder
- [ ] Verify folder structure is maintained

### Snippet Search
- [ ] Search for a snippet by title
- [ ] Search for a snippet by content
- [ ] Search for a snippet by tag
- [ ] Verify search results are accurate

### Snippet Drag and Drop
- [ ] Drag a snippet to a notebook cell
- [ ] Drag a snippet to a node in node mode
- [ ] Verify snippet content is inserted correctly
- [ ] Verify frontmatter is properly handled (not included in insertion)

## Export Functionality Tests

### Markdown Export
- [ ] Export notebook content to markdown
- [ ] Export node content to markdown
- [ ] Verify formatting is preserved in exported markdown
- [ ] Verify cell order is maintained in exported content

### PDF Export
- [ ] Export notebook content to PDF
- [ ] Export node content to PDF
- [ ] Verify formatting is properly rendered in PDF
- [ ] Verify images and diagrams are included in PDF

## Integration Tests

### Formatting and Rich Text Integration
- [ ] Apply rich text formatting to a cell with existing cell formatting
- [ ] Verify both formatting types are preserved
- [ ] Test interactions between different formatting options

### Snippet and Cell Integration
- [ ] Insert a snippet into a formatted cell
- [ ] Apply formatting to a cell containing a snippet
- [ ] Verify content and formatting are preserved

### Mode Switching with Content
- [ ] Create content in notebook mode
- [ ] Switch to node mode and verify content is preserved
- [ ] Make changes in node mode
- [ ] Switch back to notebook mode and verify changes are preserved

## Performance Tests

### Large Document Handling
- [ ] Create a notebook with 50+ cells
- [ ] Test scrolling performance
- [ ] Test editing performance
- [ ] Test export performance with large documents

### Complex Node Graph
- [ ] Create a complex node graph with 20+ nodes
- [ ] Test connection performance
- [ ] Test canvas navigation with many nodes
- [ ] Test export with complex node structures

## Browser Compatibility Tests

### Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge

### Responsive Design
- [ ] Test at different window sizes
- [ ] Test on tablet-sized screens
- [ ] Verify UI elements adapt appropriately

## Error Handling Tests

### Input Validation
- [ ] Test with invalid input in text fields
- [ ] Test with extremely long content
- [ ] Test with special characters
- [ ] Verify appropriate error messages are displayed

### Recovery Scenarios
- [ ] Test application behavior after a browser refresh
- [ ] Test recovery from an unexpected error
- [ ] Verify no data loss occurs during error conditions

## Accessibility Tests

### Keyboard Navigation
- [ ] Navigate through all UI elements using keyboard
- [ ] Verify all actions can be performed with keyboard
- [ ] Test keyboard shortcuts

### Screen Reader Compatibility
- [ ] Verify all UI elements have appropriate ARIA labels
- [ ] Test navigation with a screen reader
- [ ] Verify important state changes are announced

## Security Tests

### Input Sanitization
- [ ] Test with potentially malicious input (script tags, etc.)
- [ ] Verify input is properly sanitized
- [ ] Test with unusual character encodings

### Data Handling
- [ ] Verify sensitive data is not exposed in the UI
- [ ] Test data persistence mechanisms
- [ ] Verify proper error handling for data operations

## Regression Testing

After completing the above tests, repeat the following for any areas that were modified:

1. Verify that fixed issues remain fixed
2. Ensure no new issues were introduced
3. Test edge cases specific to the modified components
4. Verify integration with other components still works correctly

## Test Reporting

For each test:
1. Document the test result (Pass/Fail)
2. If failed, document the specific issue observed
3. Include screenshots or recordings of any issues
4. Note the environment details (browser, OS, screen size)

This checklist should be used as a baseline for testing and expanded as new features are added to the application.
