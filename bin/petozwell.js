#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { installPet, resolveCodexHome } from '../lib/install.js';

const help = `Usage: petozwell [install] [options]

Install Ozwell into your Codex pets folder.

Options:
  --codex-home <path>  Override CODEX_HOME (default: ~/.codex)
  --dry-run            Show the destination without changing files
  --force              Back up an existing Ozwell folder before replacing it
  --help, -h           Show this help
  --version, -v        Show the installer version

After installing, open Settings > Pets > Refresh and select Ozwell.
Use Wake Pet or /pet to show him. Installation does not change app settings.
`;

try {
  const { values, positionals } = parseArgs({
    options: {
      'codex-home': { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
  });
  if (values.help) {
    console.log(help);
  } else if (values.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
  } else {
    if (positionals.length > 1 || (positionals.length === 1 && positionals[0] !== 'install')) {
      throw new Error('Unknown command. Run petozwell --help for usage.');
    }
    const result = await installPet({
      codexHome: resolveCodexHome(values['codex-home']),
      force: values.force,
      dryRun: values['dry-run'],
    });
    if (result.status === 'dry-run') {
      console.log(`Would install Ozwell into ${result.destination}`);
      if (result.conflict) console.log('An existing installation differs. Use --force to back it up and replace it.');
    } else {
      console.log(`${result.status === 'unchanged' ? 'Ozwell is already installed at' : 'Installed Ozwell into'} ${result.destination}`);
      if (result.backup) console.log(`Previous installation saved at ${result.backup}`);
      console.log('Open Settings > Pets > Refresh, select Ozwell, then choose Wake Pet if needed.');
    }
  }
} catch (error) {
  console.error(`Ozwell: ${error.message}`);
  process.exitCode = 1;
}
