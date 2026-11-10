import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parse} from 'yaml';
import {at} from '../lib/files.mjs';
test('Workflows parse correctly; browser choices match typed Action inputs and failed Drive uploads retain artifacts',async()=>{
 for(const name of ['test.yml','deploy-studio.yml','render.yml']) {
  const workflow=parse(await fs.readFile(at('.github/workflows',name),'utf8'));
  assert.ok(workflow.name);assert.ok(workflow.on);assert.ok(workflow.jobs);
  assert.equal(workflow.permissions.contents,'read');
 }
 const render=parse(await fs.readFile(at('.github/workflows/render.yml'),'utf8'));
 assert.deepEqual(render.on.workflow_dispatch.inputs.upload_drive.options,['auto','yes','no']);
 assert.deepEqual(render.on.workflow_dispatch.inputs.voice_provider.options,['auto','edge','azure']);
 assert.equal(render.on.schedule[0].cron,'0 5 * * *');
 const upload=render.jobs.render.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@'));
 assert.ok(upload.if.includes('always()'));assert.equal(upload.with['retention-days'],3);
 assert.equal(render.concurrency['cancel-in-progress'],false);
});
