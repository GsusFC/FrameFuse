# Mouse Controls Brainstorm

## Feature Ideas for Mouse-Based Controls

### Proposed Control Scheme

**Select Mode (Ball Size):**
- Hold `Space` and Left-click a ball to select it and enter size-adjust mode.
- While holding `Space`, `Scroll` over the selected ball to adjust `ball_size`.
  - Range: `ball_size ∈ [min_size, max_size]` (define defaults).
  - Step: `step` per wheel tick; hold `Shift` for fine adjustment (e.g., step/5).
  - Visual: show an on-canvas HUD with current size; clamp at bounds.
  - **Wheel event handling:** Add wheel listener with `{ passive: false }` to enable `preventDefault()`. Call `event.preventDefault()` and `event.stopPropagation()` only while `Space` is held to prevent page scroll during size adjustment. Restore normal scroll behavior on `Space` keyup. Clamp values and ignore wheel events when not in size-adjust mode.
  - **Cross-platform considerations:** Test on major browsers (Chrome, Firefox, Safari, Edge) as `Space` key may trigger page scroll in some contexts. Handle browser-specific wheel event quirks and ensure consistent behavior across platforms.
**Connect Mode:**
- `Command + Drag` (macOS) or `Ctrl + Drag` (Windows/Linux) → Control `connection_factor`
- `Scroll` to fine-adjust connection factor
- **Note:** Avoid `Cmd/Ctrl+Shift` combinations and test chosen modifier in Chrome, Firefox, Safari, and Edge for conflicts. `Alt/Option` may be used only after conflict testing.

### Discussion
What do you think about moving the functionality to mouse controls?

This would provide a more intuitive interaction pattern for users.

#### Keyboard-only Fallback
- **Focus management:** Implement `Tab` navigation between interactive elements with visible focus indicators (WCAG 2.1 focus visible criterion)
- **Ball selection:** `Enter` or `Space` to select balls; arrow keys to navigate between balls
- **Size adjustment:** Use native `<input type="range">` elements for ball size controls to provide built-in keyboard navigation (Left/Right arrows, Home/End, PageUp/PageDown), proper value announcements, and automatic ARIA semantics. Alternative: If custom visual is required, implement complete ARIA slider behavior including roving tabindex, all keyboard shortcuts (Left/Right, Up/Down, Home/End, PageUp/PageDown, +/- with Shift for fine-grain), proper `aria-valuemin`/`aria-valuemax`/`aria-valuenow` (and `aria-valuetext` if needed), accessible naming/labeling, and live region updates for value changes.
- **Connection factor:** `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (macOS) to enter connect mode, then arrow keys to adjust
- **Shortcuts:** Document all keyboard shortcuts in help overlay; test with screen readers (NVDA, JAWS, VoiceOver)
- **Automated testing:** Include keyboard accessibility tests in CI/CD pipeline using axe-core or similar tools

#### Touch and Pen Parity
- **Touch gestures:** Two-finger drag for connection factor adjustment (avoid single-finger conflicts with scrolling)
- **Pen input:** Pressure sensitivity for fine adjustments; hover states for pen proximity detection
- **Hit targets:** Minimum 44px touch targets (iOS HIG); 48px recommended for accessibility
- **Gesture conflicts:** Test against native browser gestures (pinch-to-zoom, swipe navigation)
- **Mobile considerations:** Disable drag on touch devices if conflicts with scroll/pan; use modal overlays for adjustments
- **Tablet parity:** Ensure parity with desktop controls; test on iPad and Android tablets
- **Implementation:** Use Pointer Events API for unified touch/pen/mouse handling

#### Onboarding and Discoverability
- **Inline tooltips:** Show contextual hints on first interaction ("Hold Space + click to select", "Drag with Cmd/Ctrl to connect")
- **Progressive disclosure:** Reveal advanced features (fine adjustment, shortcuts) after basic usage
- **Help overlay:** `?` key or help button to show all controls with visual examples
- **Persistence:** Remember dismissed hints per user session; allow reset via settings
- **A/B testing:** Track feature discovery rates and user engagement with new controls
- **Documentation:** Link to full documentation from help overlay

#### Safety and Undo
- **Undo system:** `Cmd+Z` (macOS) or `Ctrl+Z` (Windows/Linux) for immediate undo; maintain 10-step history
- **Confirmation dialogs:** Warn before destructive actions (clearing all connections) with clear undo option
- **Rate limiting:** Prevent rapid-fire adjustments (>10 changes/second) to avoid accidental modifications
- **Bounds checking:** Hard limits on ball_size and connection_factor to prevent invalid states
- **Auto-save:** Save state every 5 seconds with manual save option; restore on page refresh
- **Error recovery:** Graceful degradation if WebGL context lost; clear error messages with recovery steps
