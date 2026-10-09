import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['tools/simulator.mjs'],{stdio:'inherit'}),spawn(process.execPath,['--watch','--import','tsx','src/server.ts'],{stdio:'inherit'})];
function stop(){for(const p of children)p.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const p of children)p.on('exit',code=>{if(code)stop();});
