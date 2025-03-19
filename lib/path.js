class PathManager {
    static parseStructure(input) {
        const lines = input.split('\n').filter(line => line.trim() !== '');
        const stack = [];
        const structure = {};
        
        lines.forEach(line => {
            const depth = (line.match(/^\s*/) || [''])[0].length;
            const name = line.trim().replace(/^\//, '');
            
            while (stack.length > depth/2) stack.pop();
            
            const currentPath = stack.length > 0 
                ? `${stack.join('/')}/${name}` 
                : name;
            
            structure[currentPath] = true;
            stack.push(name);
        });
        
        return Object.keys(structure);
    }

    static calculateRelativePath(from, to) {
        if (from === to) return './';
        
        const fromParts = from.split('/').filter(p => p);
        const toParts = to.split('/').filter(p => p);
        
        let commonDepth = 0;
        while (commonDepth < fromParts.length && 
               commonDepth < toParts.length && 
               fromParts[commonDepth] === toParts[commonDepth]) {
            commonDepth++;
        }
        
        const up = fromParts.slice(commonDepth).length;
        const down = toParts.slice(commonDepth);
        
        const path = [...Array(up).fill('..'), ...down].join('/');
        return path.startsWith('../') ? path : './' + path;
    }
}
