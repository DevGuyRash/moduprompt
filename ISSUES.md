# Issues to Fix in ModuPrompt

## Notebook Mode Issues

1. **Drag and Drop Error**
   - When dragging and dropping one cell onto another, an error occurs: "Drop result must either be an object or undefined."
   - The UI should show a clear indicator for dropping above or below a cell, not directly on it.

2. **Formatting Not Applied in Export**
   - When exporting from notebook mode, formatting options chosen for individual cells don't apply.
   - Everything is output as plain text without the formatting.

3. **PDF Export Issues**
   - PDF export outputs plain text without rendering markdown.
   - Need to implement proper markdown rendering in PDF exports.

4. **Formatting UI Improvements Needed**
   - Code block should be a toggle that can be combined with other formatting options.
   - Code block and XML tags are both "wrappers" and only one should be selectable at a time.
   - Both wrappers should be able to exist within blockquotes and callouts.
   - Need UI for naming XML tags or specifying callout types for each cell.
   - The formatting at the top should apply to the entire document, not individual cells.

5. **Rich Text Editing Bar Needed**
   - Add an editor bar that appears per cell for rich text editing.
   - Should apply markdown-based changes (bold with `**`, italics with `*`, etc.).
   - Include strikethrough and other basic formatting options.

6. **Format Cell Menu Issues**
   - Clicking outside the Format Cell menu doesn't close it.
   - Need to implement click-outside behavior to dismiss the menu.

7. **Snippet Functionality Issues**
   - Cannot save prompt cells to snippets easily.
   - Cannot drag and drop or insert snippets effectively.
   - Need to improve snippet saving and usage workflow.

## Node Mode Issues

1. **Node Connection Issues**
   - Switching to Node Mode shows disconnected nodes without preserving sequential order.
   - Cannot drag and drop connections between nodes.
   - Clicking and dragging from an output moves the entire node instead of drawing a connection line.

2. **Node UI Improvements**
   - Add input and output labels to nodes.
   - Make inputs appear on the left and outputs on the right of nodes.

3. **Mode Switching Content Preservation**
   - Content added in node mode doesn't save when switching back to notebook mode.
   - Unconnected nodes should append to the end when switching to notebook mode.

4. **Filter Consistency Between Modes**
   - Filters applied in one mode need to exist in the other mode as well.
   - Need to maintain formatting consistency across mode switches.

5. **Filter Node Implementation**
   - Filter nodes shouldn't be editable like regular nodes.
   - Should use the same filter options as notebook mode (codeblock, XML, callout, blockquote).
   - When switching from notebook to node mode, create separate filter nodes as inputs per prompt node.
   - Identify common formatting patterns and create shared filter nodes where appropriate.

6. **Canvas Navigation**
   - Cannot zoom in/out or pan in node mode.
   - Need to implement canvas navigation controls.

7. **Snippet Integration in Node Mode**
   - Cannot save snippets or drag/drop them in node mode.
   - Need to implement snippet functionality in node mode.

8. **Filter Join Clarification**
   - The filter join node currently looks like an editable prompt node.
   - Need to clarify its purpose and functionality.

## General Improvements

1. **Cross-Mode Consistency**
   - Ensure formatting options are consistent between notebook and node modes.
   - Maintain relationships between formatted content when switching modes.

2. **Documentation Updates**
   - Update user guide to reflect the improved functionality once fixed.
   - Add examples of proper usage for both modes.

3. **UI/UX Enhancements**
   - Improve visual feedback for drag and drop operations.
   - Add tooltips and help text for complex features.
