export class EditorHandler {
    constructor(handle) {
        this.normalizer = handle.normalizer;
        this.denormalizer = handle.denormalizer;
        this.domManager = handle.domManager;
        this.documentManager = handle.documentManager;
        this.blockManager = handle.blockManager;
        this.selectionManager = handle.selectionManager;
        this.inputHandler = handle.inputHandler;
        this.keyDownHandler = handle.keyDownHandler;
        this.observationHandler = handle.observationHandler;
        this.styleManager = handle.styleManager;
        this.suggestionManager = handle.suggestionManager;
        this._isActive = false;
    }

    processChanges = (source, payload) => {
        if (!this._isActive) return;
        this.handlers[source]?.(payload);
    };
    setup = async (id) => {
        const setup = await this.documentManager("SET_UP", { id });
        const frame = this.denormalizer(setup.contents);
        this.domManager("SET_UP", {
            frame,
            title: setup.title,
            caret: setup.meta?.caret || null,
        });
        const editorControls = {
            domManager: this.domManager,
            documentManager: this.documentManager,
            normalizer: this.normalizer,
            blockManager: this.blockManager,
            selectionManager: this.selectionManager,
            styleManager: this.styleManager,
            suggestionManager: this.suggestionManager,
        };
        this.handlers = {
            MUTATIONOBSERVER: this.observationHandler,
            KEYDOWN: this.keyDownHandler,
            INPUT: this.inputHandler,
            SELECTION: this.selectionManager,
            STYLER: this.styleManager,
            SUGGESTION: this.suggestionManager,
            DOCUMENTMANAGER: this.documentManager,
        };

        this.blockManager("SET_UP", { ...editorControls, ...setup.contents });
        this.inputHandler({ setup: true, ...editorControls });
        this.keyDownHandler({ setup: true, ...editorControls });
        this.observationHandler({ setup: true, ...editorControls });
        this.selectionManager({ setup: true, ...editorControls });
        this.styleManager({
            setup: true,
            ...editorControls,
            style: setup.meta.style,
        });
        this._isActive = true;
    };
    cleanup() {
        this.observationHandler = null;
        this.inputHandler = null;
        this.keyDownHandler = null;
        this.handlers = null;
        this._isActive = false;
    }
}
