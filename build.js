#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get command-line arguments
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
// --- VERSION INJECTION LOGIC ---
import { readFileSync, writeFileSync } from 'fs';
const versionPlaceholder = '__VERSION__';
const versionFiles = [
  join(__dirname, 'commands', 'index.ts'),
  join(__dirname, 'commands', 'mcp.ts')
];
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;

const originalContents = {};
for (const file of versionFiles) {
  const content = readFileSync(file, 'utf8');
  originalContents[file] = content;
  if (content.includes(versionPlaceholder)) {
    const replaced = content.replaceAll(versionPlaceholder, version);
    writeFileSync(file, replaced, 'utf8');
  }
}

// After build, restore original files
async function restoreVersionPlaceholders() {
  for (const file of versionFiles) {
    if (originalContents[file]) {
      writeFileSync(file, originalContents[file], 'utf8');
    }
  }
}

// Helper to get all package dependencies
const getPackageDependencies = () => {
  try {
    const packageJsonPath = join(__dirname, 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(packageJsonContent);
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ];
  } catch (error) {
    console.warn('Failed to read package.json:', error.message);
    return []; // Return empty array if package.json can't be read
  }
};

// Common build configuration
const buildConfig = {
  entryPoints: ['index.ts'],
  bundle: true,
  outdir: 'dist',
  platform: 'node', 
  format: 'esm',
  sourcemap: true,
  external: getPackageDependencies(),
  target: 'node18', // Targeting Node.js 18+ for ESM support
  plugins: [
    {
      name: 'make-all-packages-external',
      setup(build) {
        // Regular packages from node_modules
        build.onResolve({ filter: /^[^./]/ }, args => {
          return { external: true };
        });
      },
    },
    {
      name: 'add-shebang',
      setup(build) {
        build.onEnd(async (result) => {
          const { promises: fs } = await import('fs');
          
// In watch mode, restore files on process exit
  process.on('SIGINT', async () => {
    await restoreVersionPlaceholders();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await restoreVersionPlaceholders();
    process.exit(0);
  });
          try {
            // Read the built file
            const outputFile = join(__dirname, 'dist', 'index.js');
            let content = await fs.readFile(outputFile, 'utf8');
            
            // Add shebang at the beginning if it doesn't exist
            if (!content.startsWith('#!/usr/bin/env node')) {
              content = '#!/usr/bin/env node\n' + content;
// Always restore the original files after build (even on error)
  await restoreVersionPlaceholders();
              await fs.writeFile(outputFile, content, 'utf8');
              console.log('Added shebang to index.js');
            }
            
            // Make the file executable
            await fs.chmod(outputFile, 0o755);
          } catch (error) {
            console.error('Error processing shebang:', error);
          }
        });
      }
    }
  ],
};

if (watch) {
  // Watch mode
  const context = await esbuild.context(buildConfig);
  await context.watch();
  console.log('Watching for changes...');
} else {
  // Build once
  await esbuild.build(buildConfig)
    .then(() => console.log('Build complete!'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

