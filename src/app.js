import { Normalizer } from "./core/Normalizer.js";
import { BlockManager } from "./core/BlockManager.js";
import { EditorHandler } from "./editor/EditorHandler.js";
import { DocumentManager } from "./core/DocumentManager.js";
import { DOMmanager } from "./editor/DOMmanager.js";
import { Denormalizer } from "./core/Denormalizer.js";
import { Listener } from "./editor/Listener.js";
import { Observer } from "./editor/Observer.js";
import { SelectionManager } from "./editor/SelectionManager.js";
import { ObservationHandler } from "./editor/ObservationHandler.js";
import { KeyDownHandler } from "./editor/KeyDownHandler.js";
import { InputHandler } from "./editor/InputHandler.js";
import { StyleManager } from "./style/StyleManager.js";
import { SuggestionManager } from "./suggestions/SuggestionManager.js";
import { OptionsMenu } from "./toolbar/OptionsMenu.js";
import { FindReplace } from "./ui/FindReplace.js";
import { StyleFactory } from "./style/StyleFactory.js";
import { Sidebar } from "./ui/Sidebar.js";
import { PageRepository } from "./core/PageRepository.js";

const editorEl = document.getElementById("editor");
const findReplace = new FindReplace({ editorEl });
const styleFactory = new StyleFactory();
const suggestion = new SuggestionManager();
const blockmanager = new BlockManager();
const selectionManager = new SelectionManager();
const styleManager = new StyleManager({
    styleFactory: styleFactory.manage.bind(styleFactory),
});
const documentManager = new DocumentManager({
    blockManager: blockmanager.manage.bind(blockmanager),
    selectionManager: selectionManager.manage.bind(selectionManager),
    styleManager: styleManager.manage.bind(styleManager),
});
const domManager = new DOMmanager();
const observationHandler = new ObservationHandler();

const denormalizer = new Denormalizer(styleFactory);
const normalizer = new Normalizer(styleFactory);
const inputHandler = new InputHandler();
const keyDownHandler = new KeyDownHandler();
const optionsMenu = new OptionsMenu({
    editorEl: editorEl,
    contentArea: document.querySelector("main"),
    suggestionManager: suggestion,
    findReplace,
    documentManager: documentManager.documentController.bind(documentManager),
});
const editorHandler = new EditorHandler({
    blockManager: blockmanager.manage.bind(blockmanager),
    selectionManager: selectionManager.manage.bind(selectionManager),
    styleManager: styleManager.manage.bind(styleManager),
    suggestionManager: suggestion.manage.bind(suggestion),
    normalizer: normalizer.normalizer.bind(normalizer),
    denormalizer: denormalizer.denormalizer.bind(denormalizer),
    domManager: domManager.manage.bind(domManager),
    documentManager: documentManager.documentController,
    observationHandler: observationHandler.handle.bind(observationHandler),
    inputHandler: inputHandler.handle.bind(inputHandler),
    keyDownHandler: keyDownHandler.handle.bind(keyDownHandler),
});
const listener = new Listener(document, editorHandler.processChanges);
const observer = new Observer(editorEl, editorHandler.processChanges);

const params = new URLSearchParams(window.location.search);
const requestedPageId = params.get("id");
const pageRepository = new PageRepository();

async function resolveCurrentPageId() {
    if (requestedPageId) return requestedPageId;

    const pages = await pageRepository.listPages();
    if (pages.length > 0) return pages[0].id;

    return pageRepository.createPage();
}

async function start() {
    const loadingEl = document.getElementById("app-loading");
    const shellEl = document.getElementById("app-shell");
    let sidebar;
    try {
        const currentPageId = await resolveCurrentPageId();
        sidebar = new Sidebar({ currentId: currentPageId });
        await editorHandler.setup(currentPageId);
        listener.start();
        observer.start();
    } finally {
        loadingEl?.classList.add("hidden");
        shellEl?.classList.remove("hidden");
        sidebar?.refresh();
    }
}
start();
suggestion.loadData();
