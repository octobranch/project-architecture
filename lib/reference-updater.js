class ReferenceUpdater {
    static patterns = {
        html: [
            {regex: /(href|src)=["']([^"']+)["']/g, type: 'attribute'},
            {regex: /url\(["']?([^"')]+)["']?\)/g, type: 'css'}
        ],
        js: [
            {regex: /(import|require)\(?['"]([^'"]+)['"]\)?/g, type: 'module'},
            {regex: /fetch\(['"]([^'"]+)['"]\)/g, type: 'api'}
        ],
        css: [
            {regex: /@import\s+['"]([^'"]+)['"]/g, type: 'import'},
            {regex: /url\(['"]?([^'")]+)['"]?\)/g, type: 'asset'}
        ]
    };

    static updateContent(content, oldPath, newPath, currentFile) {
        const ext = currentFile.split('.').pop();
        const relativePath = PathManager.calculateRelativePath(
            currentFile, 
            newPath
        );

        this.patterns[ext]?.forEach(pattern => {
            content = content.replace(pattern.regex, (match, p1, p2) => {
                if (p2 === oldPath) {
                    return match.replace(p2, relativePath);
                }
                return match;
            });
        });

        return content;
    }
}
