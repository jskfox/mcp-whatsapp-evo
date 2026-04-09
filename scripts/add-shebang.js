#!/usr/bin/env node

/**
 * Post-build script to add shebang to CLI entry point
 */

import { readFileSync, writeFileSync } from 'fs';

const cliPath = new URL('../dist/cli.js', import.meta.url);

const content = readFileSync(cliPath, 'utf-8');

if (!content.startsWith('#!/usr/bin/env node')) {
  const withShebang = '#!/usr/bin/env node\n' + content;
  writeFileSync(cliPath, withShebang);
  console.log('Added shebang to dist/cli.js');
}
