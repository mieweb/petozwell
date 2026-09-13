import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bundledPet = fileURLToPath(new URL('../ozwell/', import.meta.url));
const filenames = ['pet.json', 'spritesheet.png'];

export function resolveCodexHome(override, env = process.env, userHome = homedir()) {
  const input = override ?? env.CODEX_HOME;
  if (input === undefined) return path.join(userHome, '.codex');
  if (!input.trim()) throw new Error('CODEX_HOME must not be empty.');
  if (input === '~') return userHome;
  if (input.startsWith('~/') || input.startsWith('~\\')) return path.resolve(userHome, input.slice(2));
  return path.resolve(input);
}

async function inspect(target) {
  try { return await lstat(target); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function validateBundle(source) {
  const manifest = JSON.parse(await readFile(path.join(source, 'pet.json'), 'utf8'));
  const sprite = await readFile(path.join(source, 'spritesheet.png'));
  if (manifest.displayName !== 'Ozwell' || manifest.spriteVersionNumber !== 2 || manifest.spritesheetPath !== 'spritesheet.png') {
    throw new Error('The bundled Ozwell manifest is invalid.');
  }
  if (sprite.length < 33 || !sprite.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      sprite.toString('ascii', 12, 16) !== 'IHDR' || sprite.readUInt32BE(16) !== 1536 ||
      sprite.readUInt32BE(20) !== 2288 || sprite[24] !== 8 || sprite[25] !== 6) {
    throw new Error('The bundled sprite sheet must be a 1536 x 2288 RGBA PNG.');
  }
}

async function matches(source, destination) {
  for (const filename of filenames) {
    const target = path.join(destination, filename);
    const stat = await inspect(target);
    if (!stat?.isFile() || stat.isSymbolicLink()) return false;
    if (!(await readFile(path.join(source, filename))).equals(await readFile(target))) return false;
  }
  return true;
}

export async function installPet({ codexHome, force = false, dryRun = false, source = bundledPet }) {
  await validateBundle(source);
  const pets = path.join(codexHome, 'pets');
  const destination = path.join(pets, 'ozwell');
  const existing = await inspect(destination);
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new Error(`Refusing to replace a file or symbolic link at ${destination}.`);
  }
  if (existing && await matches(source, destination)) return { status: 'unchanged', destination };
  if (dryRun) return { status: 'dry-run', destination, conflict: Boolean(existing) };
  if (existing && !force) {
    throw new Error(`An existing Ozwell folder differs at ${destination}. Use --force to back it up and replace it.`);
  }

  await mkdir(pets, { recursive: true });
  // This lock prevents concurrent runs of this installer from replacing each other.
  const lock = path.join(pets, '.ozwell-install.lock');
  try { await mkdir(lock); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another Ozwell install may be running. If none is running, remove the stale lock at ${lock}.`);
    throw error;
  }
  let staging;
  let backup;
  try {
    const current = await inspect(destination);
    if (current && (!current.isDirectory() || current.isSymbolicLink())) throw new Error(`Destination changed: ${destination}`);
    if (current && await matches(source, destination)) return { status: 'unchanged', destination };
    if (current && !force) throw new Error(`Destination now exists at ${destination}. Rerun with --force to back it up.`);
    staging = await mkdtemp(path.join(pets, '.ozwell-install-'));
    for (const filename of filenames) {
      await copyFile(path.join(source, filename), path.join(staging, filename), constants.COPYFILE_EXCL);
    }
    if (current) {
      const backups = path.join(codexHome, 'pet-backups');
      await mkdir(backups, { recursive: true });
      const container = await mkdtemp(path.join(backups, 'ozwell-'));
      backup = path.join(container, 'ozwell');
      await rename(destination, backup);
    }
    try { await rename(staging, destination); staging = undefined; }
    catch (error) {
      if (backup) await rename(backup, destination);
      throw error;
    }
    return { status: 'installed', destination, backup };
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
