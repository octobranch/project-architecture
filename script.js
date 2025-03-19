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

        const handleFile = (file) => {
            if (file.type === 'application/zip') {
                document.getElementById('processBtn').disabled = false;
                this.processZip(file);
            }
        };

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
            handleFile(e.dataTransfer.files[0]);
        });

        fileInput.addEventListener('change', (e) => {
            handleFile(e.target.files[0]);
        });
    }

    setupEventListeners() {
        document.getElementById('processBtn').addEventListener('click', () => {
            this.reorganizeProject();
        });

        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.generateZip();
        });

        document.getElementById('structureInput').addEventListener('input', (e) => {
            document.getElementById('processBtn').disabled = e.target.value.trim() === '';
        });
    }

    async processZip(file) {
        try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(file);
            
            this.originalFiles.clear();
            for (const [path, fileEntry] of Object.entries(loadedZip.files)) {
                if (!fileEntry.dir) {
                    this.originalFiles.set(path, await fileEntry.async('text'));
                }
            }
            
            this.updateTreeView('#originalTree', this.originalFiles);
        } catch (error) {
            console.error('Error processing ZIP:', error);
        }
    }

    async reorganizeProject() {
        try {
            const structureInput = document.getElementById('structureInput').value;
            const desiredPaths = PathManager.parseStructure(structureInput);
            
            this.createPathMappings(desiredPaths);
            await this.updateFileReferences();
            this.generateNewStructure();
            
            this.updateTreeView('#newTree', this.newStructure);
            document.getElementById('downloadBtn').disabled = false;
        } catch (error) {
            console.error('Reorganization error:', error);
        }
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
        this.newStructure.clear();
        
        for (const [oldPath, newPath] of this.pathMappings) {
            let content = this.originalFiles.get(oldPath);
            
            this.pathMappings.forEach((targetPath, sourcePath) => {
                content = ReferenceUpdater.updateContent(
                    content,
                    sourcePath,
                    targetPath,
                    newPath
                );
            });
            
            this.newStructure.set(newPath, content);
        }
    }

    generateNewStructure() {
        this.originalFiles.forEach((content, path) => {
            if (!this.newStructure.has(path)) {
                this.newStructure.set(path, content);
            }
        });
    }

    setupTreeViews() {
        this.initTree('#originalTree', this.originalFiles);
        this.initTree('#newTree', this.newStructure);
    }

    initTree(selector) {
        $(selector).jstree({
            core: {
                data: (node, cb) => {
                    const data = Array.from(this[selector === '#originalTree' ? 'originalFiles' : 'newStructure'].keys())
                        .map(path => ({ id: path, text: path, parent: '#' }));
                    cb(data);
                }
            },
            plugins: ['sort']
        });
    }

    updateTreeView(selector, data) {
        $(selector).jstree(true).settings.core.data = Array.from(data.keys())
            .map(path => ({ id: path, text: path, parent: '#' }));
        $(selector).jstree(true).refresh(true);
    }

    async generateZip() {
        const zip = new JSZip();
        
        this.newStructure.forEach((content, path) => {
            zip.file(path, content);
        });

        const zipContent = await zip.generateAsync({ type: 'blob' });
        saveAs(zipContent, 'reorganized-project.zip');
    }
}
