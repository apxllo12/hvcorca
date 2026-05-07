const fs = require("fs");
const path = require("path");
const luamin = require("luamin");

// Bundle script - combines all Lua files into single latest.lua

const outDir = "out";
const publicDir = "public";
const runtimeFile = "scripts/runtime.lua";
const tempFile = "scripts/bundle.tmp";

function stripLuaComments(src) {
    let out = "";
    let i = 1;
    while (i <= src.length) {
        if (src[i] === "-" && src[i + 1] === "-" && src[i + 2] === "[") {
            i += 3;
            if (src[i] === "[" && src[i + 1] === "[") {
                while (!(src[i] === "]" && src[i + 1] === "]" && src[i + 2] === "\n")) i++;
                i += 3;
                continue;
            }
        }
        out += src[i];
        i++;
    }
    return out;
}

function minifyLua(src) {
    // First strip comments
    let cleaned = stripLuaComments(src);
    // Then use luamin
    try {
        return luamin.minify(cleaned);
    } catch (e) {
        console.warn("Minify warning:", e.message);
        return cleaned;
    }
}

function collectFiles(dir, basePath = "") {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relPath = basePath ? `${basePath}/${entry}` : entry;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...collectFiles(fullPath, relPath));
        } else if (entry.endsWith(".lua")) {
            files.push({ path: relPath, content: fs.readFileSync(fullPath, "utf8") });
        }
    }
    
    return files;
}

function generateOutput(files, version, isDebug = false, isMinify = false) {
    let body = [];
    let foldersAdded = new Set(["Havoc"]);
    
    function addFolder(path) {
        if (path && !foldersAdded.has(path) && path.startsWith("Havoc.")) {
            foldersAdded.add(path);
            const parts = path.split(".");
            const name2 = parts.pop();
            const parentPath = parts.join(".");
            
            // Recursively add parent first
            if (parts.length > 1) {
                addFolder(parentPath);
            }
            
            // Build line separately to avoid escaping issues
            const parent2 = parentPath === "Havoc" ? "nil" : parentPath;
            const line = 'newInstance("' + name2 + '", "Folder", "' + path + '", "' + parent2 + '")';
            body.push(line);
        }
    }
    
    // Add root folder
    body.push('newInstance("Havoc", "Folder", "Havoc", nil)');
    
    // Generate module creation code
    for (const f of files) {
        // Build proper path with Havoc prefix
        let fullPath = f.path.replace(/\\/g, ".");
        fullPath = fullPath.replace(".lua", "");
        if (!fullPath.startsWith("Havoc.")) {
            fullPath = "Havoc." + fullPath;
        }
        
        // Add parent folders
        addFolder(fullPath);
        
        const name = fullPath.split(".").pop();
        const parentPath = fullPath.split(".").slice(0, -1).join(".");
        
        const className = f.path.includes("main.client") ? "LocalScript" : "ModuleScript";
        
        // Indent content properly  
        const indented = f.content.split("\n").map(l => "\t" + l).join("\n");
        const line = `newModule("${name}", "${className}", "${fullPath}", "${parentPath === "Havoc" ? "nil" : parentPath}", function ()
return setfenv(function()
${indented}
end, newEnv(${JSON.stringify(fullPath)}))()
end)`;
        body.push(line);
    }
    
    return body.join("\n\n");
}

function bundle() {
    const args = process.argv.slice(2);
    const version = args[0] || process.env.VERSION || "v2.0";
    const isDebug = args.includes("debug");
    const isMinify = args.includes("minify");
    
    console.log("Bundling Havoc " + version + "...");
    
    if (!fs.existsSync(outDir)) {
        console.error("Error: 'out' directory not found. Run 'npm run compile' first.");
        process.exit(1);
    }
    
    // Collect files
    let files = collectFiles("include");
    files = files.concat(collectFiles(outDir));
    
    if (files.length === 0) {
        console.error("No files to bundle!");
        process.exit(1);
    }
    
    console.log("Bundling " + files.length + " files...");
    
    // Get runtime
    let runtime = fs.readFileSync(runtimeFile, "utf8");
    runtime = runtime.replace("__VERSION__", version);
    
    // Generate module definitions
    let modules = generateOutput(files, version, isDebug, isMinify);
    
    // Apply minification if needed
    if (isMinify) {
        console.log("Minifying...");
        modules = minifyLua(modules);
    }
    
    // Final output
    let output = runtime + "\n" + modules + "\nhInit()";
    
    // Write
    const outFile = path.join(publicDir, "latest.lua");
    fs.writeFileSync(outFile, output);
    console.log("✓ Bundled to " + outFile + " (" + output.length + " bytes)");
}

bundle();