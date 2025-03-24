# ModuPrompt Fixes Todo List

## Node Mode Issues
- [ ] Fix node selection issues
  - [ ] Prevent all nodes from being selected when clicking a single node
  - [ ] Fix persistent dragging state after releasing mouse button
- [ ] Fix node connection issues
  - [ ] Enable dragging from outputs/inputs to create connections
  - [ ] Fix connection persistence when moving connected nodes
  - [ ] Implement ability to disconnect nodes
- [ ] Implement canvas navigation
  - [ ] Fix panning functionality
  - [ ] Add visual feedback during panning
  - [ ] Ensure zoom controls work properly
- [ ] Fix format node functionality
  - [ ] Implement proper formatting options
  - [ ] Ensure connections work with format nodes

## Notebook Mode Issues
- [ ] Fix cell selection and movement
  - [ ] Ensure text selection works properly without triggering cell movement
  - [ ] Restrict cell movement to only trigger when hovering over cell handle
- [ ] Fix formatting toolbar functionality
  - [ ] Ensure formatting buttons apply expected formatting consistently
- [ ] Implement formatting toggles
  - [ ] Make code block and XML tags mutually exclusive
  - [ ] Make blockquote and callout mutually exclusive
  - [ ] Allow other combinations to be valid

## Mode Synchronization Issues
- [ ] Fix formatting synchronization between modes
  - [ ] Ensure formatting changes in one mode are reflected in the other mode
  - [ ] Fix XML formatting synchronization specifically
- [ ] Verify content synchronization
  - [ ] Ensure content changes in one mode are properly reflected in the other mode

## General Tasks
- [x] Create comprehensive testing checklist
- [x] Test all modes thoroughly
- [x] Document all identified issues
- [ ] Implement fixes for highest priority issues first
  - [ ] Node selection and dragging
  - [ ] Connection creation and management
  - [ ] Mode synchronization
- [ ] Test all implemented fixes
- [ ] Commit and push changes
- [ ] Prepare final progress report
