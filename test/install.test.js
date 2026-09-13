import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, writeFile, symlink, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { installPet, resolveCodexHome } from '../lib/install.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'ozwell');

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'ozwell-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return path.join(dir, 'Codex home with spaces');
}

test('resolves explicit, environment and default homes in order', () => {
  const userHome = path.resolve('user-home');
  assert.equal(resolveCodexHome(undefined, {}, userHome), path.join(userHome, '.codex'));
  assert.equal(resolveCodexHome(undefined, { CODEX_HOME: 'custom' }, userHome), path.resolve('custom'));
  assert.equal(resolveCodexHome('override', { CODEX_HOME: 'custom' }, userHome), path.resolve('override'));
  assert.equal(resolveCodexHome('~/pet home', {}, userHome), path.join(userHome, 'pet home'));
  assert.throws(() => resolveCodexHome('', {}, userHome), /must not be empty/);
});

test('installs the exact assets and a second run preserves extra files', async t => {
  const codexHome = await fixture(t);
  const first = await installPet({ codexHome });
  assert.equal(first.status, 'installed');
  for (const name of ['pet.json', 'spritesheet.png']) {
    assert.deepEqual(await readFile(path.join(first.destination, name)), await readFile(path.join(source, name)));
  }
  const note = path.join(first.destination, 'my-note.txt');
  await writeFile(note, 'keep me');
  assert.equal((await installPet({ codexHome })).status, 'unchanged');
  assert.equal(await readFile(note, 'utf8'), 'keep me');
  assert.deepEqual(await readdir(path.join(codexHome, 'pets')), ['ozwell']);
});

test('dry run does not create the destination', async t => {
  const codexHome = await fixture(t);
  assert.equal((await installPet({ codexHome, dryRun: true })).status, 'dry-run');
  await assert.rejects(readdir(codexHome), { code: 'ENOENT' });
});

test('conflicts are preserved unless force creates a complete backup', async t => {
  const codexHome = await fixture(t);
  const destination = path.join(codexHome, 'pets', 'ozwell');
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, 'pet.json'), 'custom manifest');
  await writeFile(path.join(destination, 'personal.txt'), 'my data');
  await assert.rejects(installPet({ codexHome }), /--force/);
  assert.equal(await readFile(path.join(destination, 'pet.json'), 'utf8'), 'custom manifest');
  const dry = await installPet({ codexHome, dryRun: true });
  assert.equal(dry.conflict, true);
  const result = await installPet({ codexHome, force: true });
  assert.equal(await readFile(path.join(result.backup, 'personal.txt'), 'utf8'), 'my data');
  assert.equal(await readFile(path.join(result.backup, 'pet.json'), 'utf8'), 'custom manifest');
  assert.equal(JSON.parse(await readFile(path.join(destination, 'pet.json'), 'utf8')).displayName, 'Ozwell');
  assert.deepEqual(await readdir(path.join(codexHome, 'pets')), ['ozwell']);
});

test('refuses a symbolic-link destination even with force', async t => {
  const codexHome = await fixture(t);
  const outside = path.join(path.dirname(codexHome), 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'keep.txt'), 'untouched');
  await mkdir(path.join(codexHome, 'pets'), { recursive: true });
  await symlink(outside, path.join(codexHome, 'pets', 'ozwell'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installPet({ codexHome, force: true }), /symbolic link/);
  assert.equal(await readFile(path.join(outside, 'keep.txt'), 'utf8'), 'untouched');
});

test('a lock blocks another installer without removing its lock', async t => {
  const codexHome = await fixture(t);
  const lock = path.join(codexHome, 'pets', '.ozwell-install.lock');
  await mkdir(lock, { recursive: true });
  await assert.rejects(installPet({ codexHome }), /Another Ozwell install/);
  assert.deepEqual(await readdir(path.join(codexHome, 'pets')), ['.ozwell-install.lock']);
});

test('invalid bundled data fails before any destination files are created', async t => {
  const codexHome = await fixture(t);
  const brokenSource = path.join(path.dirname(codexHome), 'broken');
  await cp(source, brokenSource, { recursive: true });
  await writeFile(path.join(brokenSource, 'spritesheet.png'), 'not a PNG');
  await assert.rejects(installPet({ codexHome, source: brokenSource }), /RGBA PNG/);
  await assert.rejects(readdir(codexHome), { code: 'ENOENT' });
});

test('CLI honors CODEX_HOME and supports a path override containing spaces', async t => {
  const codexHome = await fixture(t);
  const other = path.join(path.dirname(codexHome), 'other home');
  const cli = path.join(root, 'bin', 'petozwell.js');
  const options = { encoding: 'utf8', env: { ...process.env, CODEX_HOME: codexHome } };
  const first = spawnSync(process.execPath, [cli], options);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Installed Ozwell/);
  const second = spawnSync(process.execPath, [cli, '--codex-home', other], options);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(JSON.parse(await readFile(path.join(other, 'pets', 'ozwell', 'pet.json'), 'utf8')).displayName, 'Ozwell');
  const invalid = spawnSync(process.execPath, [cli, '--unknown-option'], options);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unknown option/);
});
