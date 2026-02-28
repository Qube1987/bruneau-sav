const fs = require('fs');
const path = require('path');
const tables = new Set();
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (/\.(ts|tsx)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = content.matchAll(/\.from\(\s*['"]([^'"]+)['"]\s*\)/g);
            for (const match of matches) {
                tables.add(match[1]);
            }
        }
    }
}
walk('./src');
walk('./supabase/functions');
console.log(Array.from(tables).sort());
