/**
 * jsdom implements <dialog> but not its methods (as of jsdom 25). Enough of
 * them for components that call showModal()/close(): toggle the `open`
 * attribute and fire `close` (asynchronously) the way browsers do. Top-layer rendering, focus
 * trapping and inertness aren't emulated -- check those in a real browser.
 */
export function installDialogShim() {
  // Suites that opt into the node environment have no DOM at all.
  if (typeof HTMLDialogElement === 'undefined') return;
  const proto = HTMLDialogElement.prototype;
  if (typeof proto.showModal === 'function') return;

  proto.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    // Browsers queue `close` as a task rather than firing it synchronously;
    // matching that keeps tests honest about late-arriving close events.
    setTimeout(() => this.dispatchEvent(new Event('close')));
  };
}
