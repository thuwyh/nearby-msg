import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['tools/simulator.mjs'],{stdio:'inherit'}),spawn(process.execPath,['--watch','--import','tsx','src/server.ts'],{stdio:'inherit'})];
console.log('Web workbench: http://127.0.0.1:'+(process.env.PORT??4310));
function stop(){for(const p of children)p.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const p of children)p.on('exit',code=>{if(code)stop();});
