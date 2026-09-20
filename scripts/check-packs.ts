import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';

const root = new URL('..', import.meta.url).pathname;
const output = join(root, '.pack-check');
const packages = ['protocol', 'devframe', 'supacloud'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of packages) {
  const directory = join(root, 'packages', name);
  const result = await $`cd ${directory} && bun pm pack --destination ${output}`.quiet();
  const archive = result.stdout.toString().trim().split('\n')
    .find((line) => line.endsWith('.tgz'));
  if (!archive) throw new Error(`Could not pack ${name}`);
  const listing = await $`tar -tzf ${archive}`.text();
  if (listing.includes('/src/') || listing.includes('tsconfig') || listing.includes('tsbuildinfo')) {
    throw new Error(`${name} package contains source or TypeScript config`);
  }
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };
  if (!listing.includes('package/package.json')) {
    throw new Error(`${name} package manifest is missing`);
  }
}

await rm(output, { recursive: true, force: true });
console.log(`Validated publish archives: ${packages.join(', ')}`);
