import { PageRepository } from "../core/PageRepository.js";

const repo = new PageRepository();

const listEl = document.getElementById("doc-list");
const emptyStateEl = document.getElementById("empty-state");
const newDocBtn = document.getElementById("new-doc-btn");
const emptyNewDocBtn = document.getElementById("empty-new-doc-btn");

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function openDocument(id) {
  window.location.href = `./index.html?id=${encodeURIComponent(id)}`;
}

async function createAndOpen() {
  const id = await repo.createPage();
  openDocument(id);
}

function renderList(pages) {
  listEl.innerHTML = "";
  const hasPages = pages.length > 0;

  emptyStateEl.classList.toggle("hidden", hasPages);
  listEl.classList.toggle("hidden", !hasPages);

  pages.forEach((page) => {
    const li = document.createElement("li");
    li.className = "doc-item";
    li.dataset.id = page.id;

    const main = document.createElement("div");
    main.className = "doc-item-main";

    const titleRow = document.createElement("div");
    titleRow.className = "doc-title-row";
    titleRow.style.display = "flex";
    titleRow.style.alignItems = "center";
    titleRow.style.gap = "8px";

    const iconSpan = document.createElement("span");
    iconSpan.style.display = "inline-flex";
    iconSpan.style.color = "var(--accent)";
    iconSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`;

    const titleEl = document.createElement("span");
    titleEl.className = "doc-title";
    titleEl.textContent = page.title || "Untitled";

    titleRow.appendChild(iconSpan);
    titleRow.appendChild(titleEl);

    const metaEl = document.createElement("span");
    metaEl.className = "doc-meta";
    metaEl.textContent = page.updatedAt
      ? `Edited ${formatDate(page.updatedAt)}`
      : "";

    main.appendChild(titleRow);
    main.appendChild(metaEl);
    main.addEventListener("click", () => openDocument(page.id));

    const actions = document.createElement("div");
    actions.className = "doc-item-actions";

    const renameBtn = document.createElement("button");
    renameBtn.className = "doc-item-action-btn";
    renameBtn.type = "button";
    renameBtn.title = "Rename";
    renameBtn.textContent = "Rename";
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRename(li, titleEl, page);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "doc-item-action-btn doc-item-action-btn-danger";
    deleteBtn.type = "button";
    deleteBtn.title = "Delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteDocument(page);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(main);
    li.appendChild(actions);
    listEl.appendChild(li);
  });
}

function startRename(li, titleEl, page) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "doc-title-input";
  input.value = page.title || "";
  input.placeholder = "Untitled";

  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let settled = false;
  const commit = async () => {
    if (settled) return;
    settled = true;
    const newTitle = input.value.trim();
    await repo.renamePage(page.id, newTitle);
    refresh();
  };
  const cancel = () => {
    if (settled) return;
    settled = true;
    refresh();
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      input.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });
}

async function deleteDocument(page) {
  const confirmed = window.confirm(
    `Delete "${page.title || "Untitled"}"? This can't be undone.`,
  );
  if (!confirmed) return;
  await repo.deletePage(page.id);
  refresh();
}

async function refresh() {
  const pages = await repo.listPages();
  renderList(pages);
}

newDocBtn.addEventListener("click", createAndOpen);
emptyNewDocBtn.addEventListener("click", createAndOpen);

refresh();
