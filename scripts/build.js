const fs = require("fs");
const path = require("path");

// Custom build script - creates model without rojo
const outDir = "out";

function processDir(dir, parentPath = "") {
    const items = [];
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        const itemPath = parentPath ? `${parentPath}.${entry}` : entry;
        
        if (stat.isDirectory()) {
            const children = processDir(fullPath, itemPath);
            items.push({ type: "Folder", name: entry, children });
        } else if (entry.endsWith(".lua")) {
            const content = fs.readFileSync(fullPath, "utf8");
            items.push({ type: "ModuleScript", name: entry.replace(".lua", ""), content });
        }
    }
    
    return items;
}

function buildProject() {
    console.log("Building " + project.name + "...");
    
    // Check if out directory exists
    if (!fs.existsSync(outDir)) {
        console.error("Error: 'out' directory not found. Run 'npm run compile' first.");
        process.exit(1);
    }
    
    // Process all files  
    const root = { type: "Folder", name: project.name, children: processDir(outDir) };
    
    console.log("✓ Compiled project ready at ./" + outDir);
    console.log("✓ Run 'npm run bundle' to create latest.lua");
    
    return root;
}

const project = JSON.parse(fs.readFileSync("default.project.json", "utf8"));
buildProject();