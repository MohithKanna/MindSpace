import { PageRepository } from "../core/PageRepository.js";

export class Sidebar {
    constructor({ currentId }) {
        this.repo = new PageRepository();
        this.currentId = currentId;
        this.listEl = document.getElementById("sidebar-list");
        this.newBtn = document.getElementById("sidebar-new-btn");
        this.toggleBtn = document.getElementById("sidebar-toggle-btn");
        this.mobileMenuBtn = document.getElementById("mobile-menu-btn");
        this.appShell = document.getElementById("app-shell");

        this.newBtn?.addEventListener("click", () => this._createAndOpen());
        const onToggle = (e) => {
            e?.stopPropagation();
            this.toggleSidebar();
        };
        this.toggleBtn?.addEventListener("click", onToggle);
        this.mobileMenuBtn?.addEventListener("click", onToggle);

        this.refresh();
    }

    toggleSidebar() {
        if (!this.appShell) return;
        if (document.documentElement.classList.contains("focus-mode")) {
            document.documentElement.classList.remove("focus-mode");
        }

        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            this.appShell.classList.remove("sidebar-collapsed");
            this.appShell.classList.toggle("mobile-sidebar-open");
        } else {
            this.appShell.classList.remove("mobile-sidebar-open");
            this.appShell.classList.toggle("sidebar-collapsed");
        }
    }

    setCurrentId(id) {
        this.currentId = id;
        this._highlightCurrent();
    }

    refresh = async () => {
        const pages = await this.repo.listPages();
        this._render(pages);
    };

    _render(pages) {
        if (!this.listEl) return;
        this.listEl.innerHTML = "";

        pages.forEach((page) => {
            const li = document.createElement("li");
            li.className = "sidebar-item";
            li.dataset.id = page.id;
            if (page.id === this.currentId) li.classList.add("active");

            const link = document.createElement("a");
            link.href = `./index.html?id=${encodeURIComponent(page.id)}`;
            link.className = "sidebar-item-link";

            const iconSpan = document.createElement("span");
            iconSpan.className = "sidebar-item-icon";
            iconSpan.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;

            const titleSpan = document.createElement("span");
            titleSpan.className = "sidebar-item-title";
            titleSpan.textContent = page.title || "Untitled";

            link.appendChild(iconSpan);
            link.appendChild(titleSpan);
            li.appendChild(link);
            this.listEl.appendChild(li);
        });
    }

    _highlightCurrent() {
        if (!this.listEl) return;
        this.listEl.querySelectorAll(".sidebar-item").forEach((li) => {
            li.classList.toggle("active", li.dataset.id === this.currentId);
        });
    }

    _createAndOpen = async () => {
        if (this.newBtn) this.newBtn.disabled = true;
        try {
            const id = await this.repo.createPage();
            window.location.href = `./index.html?id=${encodeURIComponent(id)}`;
        } catch {
            if (this.newBtn) this.newBtn.disabled = false;
        }
    };
}
