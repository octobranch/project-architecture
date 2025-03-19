class ReferenceUpdater {
    static patterns = {
        html: [
            {regex: /(href|src)=["']([^"']*)["']/g, type: 'attribute'},
            {regex: /url\(["']?([^"')]*)["']?\)/g, type: 'css'}
        ],
        js: [
            {regex: /(import|from|require)\(?['"]([^'"]*)['"]\)?/g, type: 'module'},
            {regex: /fetch\(['"]([^'"]*)['"]\)/g, type: 'api'}
        ],
        css: [
            {regex: /@import\s+['"]([^'"]*)['"]/g, type: 'import'},
            {regex: /url\(['"]?([^'")]*)['"]?\)/g, type: 'asset'}
        ]
    };

    static updateContent(content, oldPath, newPath, currentFile) {
        const ext = currentFile.split('.').pop();
        if (!this.patterns[ext]) return content;

        const relativePath = PathManager.calculateRelativePath(
            currentFile.split('/').slice(0, -1).join('/') || '.',
            newPath
        );

        this.patterns[ext].forEach(({regex}) => {
            content = content.replace(regex, (match, p1, p2) => {
                const cleanPath = p2.split('#')[0].split('?')[0];
                return cleanPath === oldPath 
                    ? match.replace(p2, relativePath) 
                    : match;
            });
        });

        return content;
    }
}
