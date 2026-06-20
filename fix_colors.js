const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/media/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements to fix hardcoded white colors
content = content.replace(/text-white\/10/g, 'text-foreground/10');
content = content.replace(/text-white\/20/g, 'text-foreground/20');
content = content.replace(/text-white\/30/g, 'text-muted-foreground/50');
content = content.replace(/text-white\/40/g, 'text-muted-foreground/70');
content = content.replace(/text-white\/50/g, 'text-muted-foreground');
content = content.replace(/text-white\/60/g, 'text-muted-foreground');
content = content.replace(/text-white\/70/g, 'text-foreground/70');
content = content.replace(/text-white\/80/g, 'text-foreground/80');
content = content.replace(/text-white\/90/g, 'text-foreground/90');
content = content.replace(/text-white(?![\/\w])/g, 'text-foreground');

content = content.replace(/bg-white\/5(?![\/\w])/g, 'bg-foreground/5');
content = content.replace(/bg-white\/10(?![\/\w])/g, 'bg-foreground/10');
content = content.replace(/bg-white\/20(?![\/\w])/g, 'bg-foreground/20');

content = content.replace(/border-white\/5(?![\/\w])/g, 'border-border/50');
content = content.replace(/border-white\/10(?![\/\w])/g, 'border-border/60');
content = content.replace(/border-white\/20(?![\/\w])/g, 'border-border/80');
content = content.replace(/border-white\/30(?![\/\w])/g, 'border-border');

content = content.replace(/bg-zinc-950/g, 'bg-card');
content = content.replace(/bg-\[\#111\]/g, 'bg-card');
content = content.replace(/bg-black\/80/g, 'bg-background/80');
content = content.replace(/text-black\/80/g, 'text-foreground/80');
content = content.replace(/text-black\/50/g, 'text-muted-foreground');
content = content.replace(/text-black\/30/g, 'text-muted-foreground/50');
content = content.replace(/text-black/g, 'text-foreground');
content = content.replace(/bg-black\/10/g, 'bg-foreground/10');
content = content.replace(/bg-black\/5/g, 'bg-foreground/5');
content = content.replace(/bg-black\/20/g, 'bg-foreground/20');

// specifically for dark:text-white/80, remove dark: prefix and just use the responsive one
content = content.replace(/dark:text-white\/80/g, '');
content = content.replace(/dark:text-white\/50/g, '');
content = content.replace(/dark:text-white\/30/g, '');
content = content.replace(/dark:text-white/g, '');
content = content.replace(/dark:hover:text-white/g, '');
content = content.replace(/dark:hover:bg-white\/10/g, '');
content = content.replace(/dark:text-green-400/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Colors replaced successfully!');
