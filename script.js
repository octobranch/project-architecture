document.addEventListener('DOMContentLoaded', () => {
    const manager = new ProjectManager();
    manager.init();
});

class ProjectManager {
    constructor() {
        this.originalFiles = new Map();
        this.newStructure = new Map();
        this.pathMappings = new Map();
    }

    init() {
        this.setupDragDrop();
        this.setupEventListeners();
        this.setupTreeViews();
    }

    setupDragDrop() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this.handleFile(file);
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.handleFile(file);
        });
    }

    setupEventListeners() {
        document.getElementById('processBtn').addEventListener('click', () => this.reorganizeProject());
        document.getElementById('structureInput').addEventListener('input', () => {
            document.getElementById('processBtn').disabled = false;
        });
    }

    async handleFile(file) {
        document.getElementById('processBtn').disabled = false;
        await this.processZip(file);
    }

    async processZip(file) {
        const zip = new JSZip();
        const content = await zip.loadAsync(file);
        this.originalFiles.clear();

        for (const [path, file] of Object.entries(content.files)) {
            if (!file.dir) {
                this.originalFiles.set(path, await file.async('text'));
            }
        }

        this.updateTreeView('#originalTree', this.originalFiles);
    }

    async reorganizeProject() {
        const structureInput = document.getElementById('structureInput').value;
        const desiredPaths = PathManager.parseStructure(structureInput);
        
        this.createPathMappings(desiredPaths);
        await this.updateFileReferences();
        this.generateNewStructure();
        
        this.updateTreeView('#newTree', this.newStructure);
        document.getElementById('downloadBtn').disabled = false;
    }

    createPathMappings(desiredPaths) {
        this.pathMappings.clear();
        desiredPaths.forEach(newPath => {
            const oldPath = this.findBestMatch(newPath);
            if (oldPath) this.pathMappings.set(oldPath, newPath);
        });
    }

    findBestMatch(newPath) {
        const parts = newPath.split('/');
        while (parts.length > 0) {
            const candidate = parts.join('/');
            if (this.originalFiles.has(candidate)) return candidate;
            parts.pop();
        }
        return null;
    }

    async updateFileReferences() {
        for (const [oldPath, newPath] of this.pathMappings) {
            const content = this.originalFiles.get(oldPath);
            if (content) {
                let updatedContent = content;
                for (const [otherOld, otherNew] of this.pathMappings) {
                    updatedContent = ReferenceUpdater.updateContent(
                        updatedContent, 
                        otherOld, 
                        otherNew, 
                        newPath
                    );
                }
                this.newStructure.set(newPath, updatedContent);
            }
        }
    }

    generateNewStructure() {
        this.newStructure.clear();
        this.originalFiles.forEach((content, oldPath) => {
            const newPath = this.pathMappings.get(oldPath) || oldPath;
            this.newStructure.set(newPath, content);
        });
    }

    setupTreeViews() {
        this.initTree('#originalTree');
        this.initTree('#newTree');
    }

    initTree(selector) {
        $(selector).jstree({
            core: {
                data: (node, cb) => {
                    const data = Array.from(node.id === '#' ? this.originalFiles.keys() : this.newStructure.keys())
                        .map(path => ({ id: path, text: path, parent: '#' }));
                    cb(data);
                }
            }
        });
    }

    updateTreeView(container, data) {
        $(container).jstree(true).settings.core.data = Array.from(data.keys())
            .map(path => ({ id: path, text: path, parent: '#' }));
        $(container).jstree(true).refresh();
    }
}
