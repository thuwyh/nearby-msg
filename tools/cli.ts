const [command,...args]=process.argv.slice(2);
const api=process.env.LAB_URL??'http://127.0.0.1:4310',provider=process.env.PROVIDER_URL??'http://127.0.0.1:4311';
const parsed=()=>JSON.parse(args[0]??'{}') as unknown;
let path='',method='POST',body:unknown={},base=api;
switch(command){
case 'reset':path='/dev/reset';body={fixture:args[0]??'baseline'};break;
case 'tick':path='/tick';break;
case 'messages':path='/messages';method='GET';break;
case 'show':path='/messages/'+encodeURIComponent(args[0]);method='GET';break;
case 'event':path='/events';body=parsed();break;
case 'consent':path='/consent';body=parsed();break;
case 'clock':path='/clock';body={now:args[0]};break;
case 'receipt':path='/receipts';body=parsed();break;
case 'preview':path='/preview';body=parsed();break;
case 'retry':path='/messages/'+encodeURIComponent(args[0])+'/retry';body={requestId:args[1]??crypto.randomUUID()};break;
case 'fault':base=provider;path='/fault';body=parsed();break;
case 'records':base=provider;path='/records';method='GET';break;
default:console.log('Commands: reset [T1..T10], event JSON, tick, messages, show ID, consent JSON, clock ISO, receipt JSON, preview JSON, retry ID [REQUEST_ID], fault JSON, records');process.exit(command?1:0);
}
const r=await fetch(base+path,{method,headers:{'content-type':'application/json','x-api-key':process.env.LAB_KEY??'operator-demo'},body:method==='GET'?undefined:JSON.stringify(body)});
console.log(JSON.stringify(await r.json(),null,2));if(!r.ok)process.exitCode=1;
