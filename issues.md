# ModuPrompt Issues Task List

## Cell Mode Issues

- [x] **1. Text Selection/Cursor:** Cannot highlight text within cells; clicking resets the cursor to the beginning
- [x] **2. Toolbar Functionality:** Toolbar buttons (Bold, Italic, Strikethrough, Inline Code, Heading, Lists, Link) do not work correctly or apply formatting to selected text
- [x] **3. Cell Formatting Menu - Callout:** Incorrectly applies `:::` instead of proper Markdown callout syntax
- [x] **4. Cell Formatting Menu - Logic:** Needs redesign for checkboxes (mix-and-match) vs. exclusive selections (radio buttons/dropdown) and ordering of applied formats
- [x] **5. Cell Formatting Menu - Closing:** Menu does not close when clicking outside
- [x] **6. Cell Formatting Menu - Icons:** XML Tags and Save Snippet icons are identical
- [x] **7. Cell Formatting Menu - Visualization:** No visual indicator on the cell shows that formatting has been applied
- [ ] **8. UI/UX:** The overall user interface is perceived as unintuitive and visually unappealing
- [ ] **9. Snippet Saving:** Saving a snippet to a folder doesn't make it appear within that folder in the panel
- [x] **10. Folder Icons:** Icons for created folders are too small and lack clear distinction
- [x] **11. Snippet Insertion:** No apparent way to drag/insert snippets from the panel into the cells
- [x] **12. Comment Cell Styling:** Comment cells look identical to content cells, unlike Jupyter's distinct background/rendering
- [x] **13. Cell Grouping - Content View:** Cannot view the actual content of cells within an uncollapsed group; only shows "comments" and "content" tags
- [x] **14. Cell Grouping - Selection Mode:** No clear indication when the editor is in cell selection mode for grouping

## Node Mode Issues

- [ ] **15. Initial Synchronization:** Switching to Node mode only syncs cells once; nodes are incorrectly stacked vertically in the top-left, not on the canvas, and subsequent cell additions aren't reflected
- [ ] **16. Selection/Movement:** Cursor gets stuck as a hand; clicking anywhere moves all nodes as a group; individual node selection/movement is broken
- [ ] **17. Filter Node:** Does not work as intended; needs to replicate cell formatting logic (checkboxes, exclusives, ordering) and apply selected formatting to all connected prompt nodes
- [ ] **18. Filter Join Node:** Not implemented and should be removed
- [ ] **19. Toolbar Buttons:** Buttons in the Node mode toolbar are visually broken, jumbled, and appear randomized
- [ ] **20. Home Button:** Stacks all nodes in the top-left instead of centering the view to fit all nodes
- [ ] **21. Info Button:** Does not provide helpful information
- [ ] **22. CRITICAL - Synchronization:** State and content changes are not consistently synchronized between Cell and Node modes
- [ ] **23. Comments in Node Mode:** No way to add comments; they shouldn't be standard nodes, and their order preservation needs a different mechanism than Cell mode
- [ ] **24. Overall Formatting Dropdown:** Appears behind nodes instead of pushing the canvas down; needs the same logic rework as the cell formatting menu
