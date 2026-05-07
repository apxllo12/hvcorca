import re

with open('scripts/bundle.js', 'r') as f:
    content = f.read()

# Replace line comments in Lua content
old = '.map(l => "\t" + l).join("\n")'
new = '.map(l => "\t" + l.replace(/ --.*$/, "")).join("\n")'
content = content.replace(old, new)

with open('scripts/bundle.js', 'w') as f:
    f.write(content)

print('Done!')