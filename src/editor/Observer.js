export class Observer {
  constructor(rootElement, callback) {
    this.rootElement = rootElement;
    this.callback = callback;
    this.observer = new MutationObserver((m) => this.listener(m));
    this.isPaused = false;
  }

  listener(mutations) {
    if (this.isPaused) return;
    const changes = {
      created: new Set(),
      deleted: new Set(),
    };
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.parentElement === this.rootElement)
          changes.created.add(node);
      });

      mutation.removedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          const id = node.dataset?.blockid;
          if (id) changes.deleted.add(id);
        }
      });
    });
    if (!this.isPaused && (changes.created.size || changes.deleted.size)) {
      this.callback("MUTATIONOBSERVER", {
        mutation: true,
        created: Array.from(changes.created),
        deleted: Array.from(changes.deleted),
      });
    }
  }

  start() {
    this.observer.observe(this.rootElement, {
      childList: true,
      subtree: true,
    });
  }
  pause() {
    if (!this.isPaused) this.isPaused = true;
  }
  resume() {
    if (this.isPaused) this.isPaused = false;
  }
  stop() {
    this.observer.disconnect();
  }
}
