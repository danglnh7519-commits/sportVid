import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {at} from '../lib/files.mjs';
await fs.mkdir(at('dist/client'),{recursive:true});
await build({entryPoints:[at('web/src/app.jsx')],bundle:true,minify:true,outdir:at('dist/client'),entryNames:'app',format:'esm',target:['es2022'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
await fs.copyFile(at('web/index.html'),at('dist/client/index.html'));
await fs.cp(at('web/public'),at('dist/client'),{recursive:true});
await build({entryPoints:[at('server/worker.mjs')],bundle:true,minify:true,outfile:at('dist/server/index.js'),format:'esm',platform:'browser',target:'es2022'});
console.log('Studio built: dist/client + dist/server/index.js');
