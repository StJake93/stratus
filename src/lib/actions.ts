// Scrollable regions must be reachable by keyboard (WCAG 2.1.1). This action adds tabindex="0"
// only while the element actually overflows, so short tables and snippets don't add extra tab stops.
export function scrollable(node: HTMLElement) {
  const update = () => {
    const overflows = node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
    if (overflows) node.setAttribute('tabindex', '0');
    else node.removeAttribute('tabindex');
  };
  const ro = new ResizeObserver(update);
  ro.observe(node);
  const mo = new MutationObserver(update);
  mo.observe(node, { childList: true, subtree: true, characterData: true });
  update();
  return {
    destroy() {
      ro.disconnect();
      mo.disconnect();
    }
  };
}
