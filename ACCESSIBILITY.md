# Accessibility

Stratus targets **WCAG 2.2 Level AA** in both the light and dark themes, from phone to desktop widths.

## How it is checked

| Check | What it covers | How to run |
| --- | --- | --- |
| Contrast audit | Every text, link, status, provider and focus colour token against every surface it can sit on, including translucent surfaces composited over each background and data colours mixed toward ink in OKLab. 140 pairings, both themes. | `npm run audit:contrast` (exits 1 on any failure; `-- --all` lists every pairing) |
| axe-core | WCAG 2.0/2.1/2.2 A and AA rules plus best practices on every page type (dashboard, tracks, lessons, canvas, scenarios, compare, providers, progress) in both themes, at desktop and phone widths. | Start `npm run dev`, then in the browser console: `const { audit } = await import('/src/dev/a11y.ts'); await audit(['#/', '#/play'])` |
| Manual review | Keyboard-only walkthroughs, focus order and visibility, accessible names and announcements (via the accessibility tree), reduced motion, reflow at 375px, and hover and focus content. | By hand |
| Diagram layout audit | Measures every lesson diagram for overlapping tiles, labels, legends and edges, and for anything clipped by the stage. Checked at 375, 768, 901, 1024, 1280 and 1440px wide. | In the dev server console: `const { auditDiagrams } = await import('/src/dev/diagrams.ts'); await auditDiagrams()` |

Both browser harnesses live in `src/dev/` and are never imported by the app, so they are not part of the production build.

## What is in place

**Colour and contrast**
- Text uses dedicated `*-fg` tokens tuned per theme. Base colours are only used for fills and borders.
- Data-driven colours (tracks, providers, categories) are mixed toward the ink colour whenever they are used as text.
- Focus rings, input borders and slider tracks meet the 3:1 non-text contrast minimum.
- Status is never shown by colour alone: icons and text accompany every state.

**Keyboard and focus**
- A skip link, a visible focus ring on every control, and a logical focus order.
- On navigation, focus moves to the new page heading and the document title updates.
- Scroll containers (code, tables, terminals, diagrams) become focusable only while they overflow.
- Every canvas action that uses dragging has a keyboard alternative:
  - Palette items can be added with a button, which places the service automatically in a sensible spot.
  - The inspector moves a node into a container, resizes containers, and adds or removes connections.
  - Delete and Backspace remove the selection.

**Structure and semantics**
- Landmarks, one `h1` per page, and correctly nested heading levels inside lesson blocks.
- Tabs, accordions, carousels, sliders, switches and quizzes use the matching ARIA patterns and states.
- The tour uses a native modal `<dialog>`, so focus is trapped, Escape closes it and focus returns afterwards.
- Links are underlined, and links that open a new tab say so to screen readers.

**Status messages and timing**
- Toasts and simulator logs are announced through polite live regions. Errors are announced assertively.
- Error toasts stay until dismissed. Other toasts pause while hovered or focused.
- Auto-updating simulations have Pause and Resume controls, and start paused when reduced motion is preferred.

**Motion**
- The app respects `prefers-reduced-motion`, with an in-app override in the sidebar and on the Progress page.
- Flow animations on diagrams and the canvas are decorative.

**Pointer**
- Targets are at least 24 by 24 CSS pixels. Canvas connection handles draw at 12px but have a 28px hit area.
- Tooltips on the learning path appear on hover and focus, can be hovered, and can be dismissed with Escape.

**Diagrams**
- Each diagram has a text alternative that lists its groups, their members and every connection.
- Components with notes are buttons that expose their expanded state, and the note area is a live region.
- The layout engine keeps node labels, group legends, edge labels and edges from overlapping at every width. It does this by:
  - wrapping labels;
  - sliding legends along group borders;
  - routing edges around nodes;
  - growing the diagram's height when needed.
- On narrow screens a diagram scrolls sideways inside a focusable region, with a visible hint.

## Known limitations

- Diagrams need about 580px, so on phones they scroll horizontally rather than shrinking further.
- The free-play canvas is inherently spatial. Everything it does is available from the keyboard through the palette and the inspector, but arranging a large design is still easier with a pointer.
- External documentation links lead to AWS, HashiCorp, Microsoft and Google sites, whose accessibility is outside this project's control.

If you find a barrier, please open an issue describing the page, the browser and any assistive technology involved.
