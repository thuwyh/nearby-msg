'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let language='en';try{language=localStorage.getItem('nearby-workbench-language')==='zh-CN'?'zh-CN':'en';}catch{}
const L=(en,zh)=>language==='zh-CN'?zh:en;
let panel='events',evidence='provider',selected=null,busy=false,state=null,provider=null,requests=[],previewResult=null,detail=null;
const original=new Map();
$$('[data-zh]').forEach(e=>original.set(e,e.textContent));
$$('[data-zh-label]').forEach(e=>{const node=[...e.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(node)original.set(node,node.textContent);});
function translate(){
 document.documentElement.lang=language;$('#language').textContent=language==='en'?'中文':'EN';
 for(const [e,text] of original){if(e.nodeType===Node.TEXT_NODE)e.textContent=language==='zh-CN'?e.parentElement.dataset.zhLabel:text;else e.textContent=language==='zh-CN'?e.dataset.zh:text;}
 $('#connection').textContent=state?(provider?L('API + provider connected','API 与供应商已连接'):L('Provider offline','供应商未连接')):L('Connecting…','连接中…');
 if(state)renderState();renderEvidence();renderPreview();switchPanel(panel);
}
function notice(text,error=false){const el=$('#notice');el.hidden=false;el.textContent=text;el.classList.toggle('error',error);}
async function api(path,body,token){
 const method=body===undefined?'GET':'POST';let response,data;
 try{response=await fetch(path,{method,headers:{'content-type':'application/json',...(token?{'x-api-key':token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});data=await response.json();}
 catch(error){if(method==='POST')record({method,path,body,error:error.message});throw new Error(L('API unavailable. Check npm run dev, then refresh.','API 暂不可用。请检查 npm run dev，再刷新。'));}
 if(method==='POST')record({method,path,body,status:response.status,response:data});
 if(!response.ok)throw new Error(`${response.status}: ${data.error??JSON.stringify(data)}`);
 return data;
}
function record(entry){requests.unshift({...entry,at:new Date().toISOString()});requests=requests.slice(0,80);renderEvidence();}
function setBusy(value){busy=value;$$('form button,#dispatch,#load-scene,[data-advance],#refresh,.user-card button').forEach(b=>b.disabled=value);}
async function act(label,fn){if(busy)return;setBusy(true);try{const value=await fn();await refresh();notice(value?.notice??label);return value;}catch(error){notice(error.message,true);await refresh().catch(()=>{});}finally{setBusy(false);}}
async function refresh(){
 const [s,p]=await Promise.allSettled([api('/dev/state'),api('/dev/provider/records')]);
 if(s.status==='rejected'){$('#connection').textContent=L('API offline','API 未连接');throw s.reason;}
 state=s.value;provider=p.status==='fulfilled'?p.value:null;
 $('#connection').textContent=provider?L('API + provider connected','API 与供应商已连接'):L('Provider offline','供应商未连接');
 if(selected&&!state.messages.some(m=>m.id===selected)){selected=null;detail=null;}
 if(selected)detail=await api('/messages/'+encodeURIComponent(selected));
 renderState();renderEvidence();
 if(!provider)notice(L('Provider unavailable. Start both services with npm run dev.','供应商不可用，请通过 npm run dev 启动两个服务。'),true);
}
function switchPanel(next){panel=next;$('#control-title').textContent=$('[data-panel="'+next+'"]').textContent;$$('[id^="panel-"]').forEach(e=>e.hidden=e.id!=='panel-'+next);$$('[data-panel]').forEach(e=>{e.setAttribute('aria-pressed',String(e.dataset.panel===next));if(e.hasAttribute('data-context'))e.hidden=e.dataset.panel!==next;});}
const statusLabels={pending:['Queued','待发送'],reconciling:['Checking outcome','核实发送结果'],accepted:['Provider accepted','供应商已接受'],delivered:['Delivered','已送达'],failed:['Failed','失败'],suppressed:['Blocked','已拦截'],expired:['Expired','已过期'],held_out:['Holdout','实验对照组']};
const readableStatus=value=>statusLabels[value]?L(...statusLabels[value]):value;
const reasonLabels={queued:['Waiting to send','等待发送'],provider_accepted:['Awaiting delivery receipt','等待送达回执'],unknown:['Provider outcome unknown','供应商结果未知'],eligible:['Ready to send','可以发送'],quiet_hours:['Quiet hours','处于静默时段'],frequency_cap:['Daily limit reached','已达每日发送上限'],temporary_failure:['Temporary provider failure','供应商临时失败'],permanent_failure:['Permanent provider failure','供应商永久失败']};
const readableReason=value=>reasonLabels[value]?L(...reasonLabels[value]):value;
function renderState(){
 const jobSelect=$('#event-job'),priorJob=jobSelect.value;jobSelect.innerHTML=state.jobs.map(j=>'<option value="'+escapeHtml(j.id)+'">'+escapeHtml((state.users.find(u=>u.id===j.customerId)?.name??j.customerId)+' · '+j.service+' ('+j.id+')')+'</option>').join('');if(state.jobs.some(j=>j.id===priorJob))jobSelect.value=priorJob;

 $('#clock').textContent=state.now.replace('T',' ').replace('.000Z',' Z');
 $('#local-clock').textContent=new Intl.DateTimeFormat(language==='en'?'en-US':'zh-CN',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(state.now))+' · America/Los_Angeles';
 if(document.activeElement!==$('#clock-input'))$('#clock-input').value=state.now;
 $('#n-messages').textContent=state.messages.length;$('#n-pending').textContent=state.messages.filter(m=>['pending','reconciling'].includes(m.status)).length;
 $('#n-accepted').textContent=provider?provider.messages.length:'—';$('#n-calls').textContent=provider?provider.calls.length:'—';
 $$('.user-select').forEach(select=>{const before=select.value;select.innerHTML=state.users.map(u=>`<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`).join('');if(state.users.some(u=>u.id===before))select.value=before;});
 const allowed=['pending','reconciling','accepted','delivered','failed','suppressed','expired','held_out'];
 $('#messages').innerHTML=state.messages.map(m=>`<tr class="${m.id===selected?'selected':''}"><td><button data-message="${escapeHtml(m.id)}">${escapeHtml(state.users.find(u=>u.id===m.userId)?.name??m.userId)}</button><small>${escapeHtml(m.channel==='email'?L('Email','邮件'):L('SMS','短信'))} · ${escapeHtml(m.purpose==='transactional'?L('Service notice','服务通知'):L('Engagement','互动消息'))}<br>${escapeHtml(m.id.length>18?m.id.slice(0,16)+'…':m.id)}</small></td><td><span class="badge ${allowed.includes(m.status)?m.status:''}">${escapeHtml(readableStatus(m.status))}</span><small>${escapeHtml(readableReason(m.reason))}</small></td><td>${escapeHtml(m.attempts)}</td><td><small>${escapeHtml(m.nextAt)}<br>${m.expiresAt?escapeHtml(m.expiresAt):'—'}</small></td></tr>`).join('');
 $('#message-empty').hidden=state.messages.length>0;
 $('#users').innerHTML=state.users.map(u=>`<div class="user-card" data-user="${escapeHtml(u.id)}"><strong>${escapeHtml(u.name)} · ${escapeHtml(u.id)}</strong><small>${escapeHtml(u.zone)} · revision ${u.revision}</small><div class="consent-options"><label><input type="checkbox" data-consent="email" ${u.email?'checked':''}>email</label><label><input type="checkbox" data-consent="sms" ${u.sms?'checked':''}>sms</label><label><input type="checkbox" data-consent="dnc" ${u.dnc?'checked':''}>${L('Do not contact','禁止联系')}</label></div><button data-save-user="${escapeHtml(u.id)}">${L('Save preferences','保存授权')}</button></div>`).join('');
 renderDetail();
}
function renderDetail(){
 const el=$('#message-detail');el.hidden=!detail;if(!detail)return;const m=detail.message;
 const fields=[[L('Message ID','消息 ID'),m.id],[L('Provider ID','供应商消息 ID'),m.providerId],['Key',m.key],[L('Scheduled for','计划发送时间'),m.scheduledAt],[L('Accepted at','供应商接受时间'),m.acceptedAt],[L('Consent revision','授权版本'),m.consentRevision],[L('Experiment group','实验分组'),m.group],[L('Receipt sequence','回执序号'),m.receiptSeq]];
 el.innerHTML=`<h3>${L('Message details','消息详情')} · ${escapeHtml(readableStatus(m.status))}</h3><p>${escapeHtml(m.body)}</p><div class="detail-actions"><button data-detail="receipt">${L('Update delivery status','更新送达状态')}</button><button data-detail="retry">${L('Request a retry','请求重试')}</button></div><details><summary>${L('Technical details & raw response','技术详情与原始数据')}</summary><dl class="detail-grid">${fields.map(([k,v])=>`<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v??'—')}</dd>`).join('')}</dl><pre>${escapeHtml(JSON.stringify({message:m,attempts:detail.attempts,receipts:detail.receipts},null,2))}</pre></details>`;
}
function renderEvidence(){
 $$('[data-evidence]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.evidence===evidence)));
 const el=$('#evidence-content');
 if(evidence==='provider'){
  if(!provider){el.textContent=L('Provider records unavailable.','暂时无法读取供应商记录。');return;}
  el.innerHTML=`<p class="hint">${L('Accepted is not delivered. Send calls include retries.','接受不等于送达。发送调用包含重试。')}</p>`+[ ['Accepted messages / 已接受消息',provider.messages],['Send calls / 发送调用',provider.calls] ].map(([label,rows])=>`<details><summary>${label} (${rows.length})</summary>${rows.length?'<pre>'+escapeHtml(JSON.stringify(rows,null,2))+'</pre>':'<p class="hint">'+L('No records yet.','暂无记录。')+'</p>'}</details>`).join('');
 }else if(evidence==='audit'){el.innerHTML=state?.audit.length?'<pre>'+escapeHtml(JSON.stringify(state.audit,null,2))+'</pre>':'<p class="hint">'+L('No audit entries yet.','暂无审计记录。')+'</p>';}
 else el.innerHTML=requests.length?requests.map(r=>`<details><summary>${escapeHtml(r.at.slice(11,19))} · ${r.method} ${escapeHtml(r.path)} · ${escapeHtml(r.status??'network error')}</summary><pre>${escapeHtml(JSON.stringify(r,null,2))}</pre></details>`).join(''):'<p class="hint">'+L('Actions from this browser session will appear here.','此浏览器会话中的操作将显示在这里。')+'</p>';
}
function renderPreview(){const el=$('#preview-result');if(!previewResult){el.innerHTML='';return;}el.innerHTML='<h3>'+L('Preview response','预览响应')+'</h3>'+`<p>${L('Total','总数')}: ${escapeHtml(previewResult.total)} · ${escapeHtml(JSON.stringify(previewResult.counts))}</p>`+(previewResult.rows??[]).map(r=>`<div class="preview-row"><strong>${escapeHtml(r.userId)}</strong> · ${escapeHtml(r.decision.action)}<small>${escapeHtml(r.decision.reason)} · ${escapeHtml(r.decision.nextAt??'—')}</small></div>`).join('')+`<p class="hint">${L('Unsupported policies','未实现的规则')}: ${escapeHtml((previewResult.unsupported??[]).join(', ')||'—')}</p><details><summary>JSON</summary><pre>${escapeHtml(JSON.stringify(previewResult,null,2))}</pre></details>`;}
const fields=form=>Object.fromEntries(new FormData(form));
const iso=value=>{const d=new Date(value);if(!Number.isFinite(d.getTime()))throw new Error(L('Enter a valid ISO date.','请输入有效的 ISO 时间。'));return d.toISOString();};
const split=value=>value.split(',').map(x=>x.trim()).filter(Boolean);
function form(id,fn){$(id).addEventListener('submit',e=>{e.preventDefault();act(L('Saved. Check the resulting message state.','操作已保存，请查看消息结果。'),()=>fn(fields(e.currentTarget)));});}
$('#language').addEventListener('click',()=>{language=language==='en'?'zh-CN':'en';try{localStorage.setItem('nearby-workbench-language',language);}catch{}translate();});
$$('[data-panel]').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.panel)));
$$('[data-evidence]').forEach(b=>b.addEventListener('click',()=>{evidence=b.dataset.evidence;renderEvidence();}));
$('#load-scene').addEventListener('click',()=>$('#reset-dialog').showModal());
$('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());
$('#confirm-reset').addEventListener('click',()=>{$('#reset-dialog').close();act(L('Sample data reset. Create a notification to begin.','示例数据已重置，请生成一条业务通知。'),async()=>{await api('/dev/reset',{fixture:'baseline'});selected=null;detail=null;previewResult=null;renderPreview();$('#event-id').value=crypto.randomUUID();$('#retry-message').value='';$('#receipt-provider').value='';});});
$('#dispatch').addEventListener('click',()=>act(L('Dispatch complete. Check each message’s status below.','发送已执行，请查看消息列表中的状态。'),()=>api('/tick',{})));
$('#refresh').addEventListener('click',()=>act(L('Refreshed','已刷新'),async()=>{}));
$$('[data-advance]').forEach(b=>b.addEventListener('click',()=>act(L('Clock advanced','时钟已推进'),()=>api('/clock',{now:new Date(Date.parse(state.now)+Number(b.dataset.advance)*1000).toISOString()}))));
form('#clock-form',v=>api('/clock',{now:v.now}));
form('#event-form',async v=>{const messages=await api('/events',v);return {notice:messages.length?L(`${messages.length} message(s) created. Click “2. Send queued messages” next.`,`已生成 ${messages.length} 条消息，尚未发送。接下来点击「2. 执行发送」。`):L('The backend returned no messages for this event. See the request log for its response.','后端没有为这个事件生成消息。可展开详细记录查看接口响应。')};});
form('#job-form',v=>api('/dev/job',{...v,providers:split(v.providers)}));
form('#message-form',async v=>{const count=Number(v.count);if(!Number.isInteger(count)||count<1||count>10)throw new Error('Count must be 1–10');const scheduledAt=v.scheduledAt?iso(v.scheduledAt):state.now;for(let i=0;i<count;i++)await api('/dev/message',{userId:v.userId,channel:v.channel,purpose:v.purpose,scheduledAt,nextAt:scheduledAt,expiresAt:v.expiresAt?iso(v.expiresAt):null,experimentId:v.experimentId||null,body:v.body,template:v.purpose==='engagement'?'followup':'confirmation'});});
$('#users').addEventListener('click',e=>{const b=e.target.closest('[data-save-user]');if(!b)return;const card=b.closest('[data-user]');act(L('Preferences saved','授权已保存'),()=>api('/consent',{userId:b.dataset.saveUser,...Object.fromEntries([...card.querySelectorAll('[data-consent]')].map(x=>[x.dataset.consent,x.checked]))}));});
$('#fault-preset').addEventListener('change',e=>$('#fault-modes').value=e.target.value);
form('#fault-form',v=>api('/dev/provider/fault',{userId:v.userId,modes:split(v.modes)}));
$('#release').addEventListener('click',()=>act(L('Responses released','响应已释放'),()=>api('/dev/provider/release',{})));
form('#receipt-form',v=>api('/receipts',{...v,sequence:Number(v.sequence)}));
form('#preview-form',async v=>{previewResult=await api('/preview',{users:split(v.users),scheduledAt:v.scheduledAt?iso(v.scheduledAt):state.now,experimentId:v.experimentId||null});renderPreview();});
form('#retry-form',v=>api('/messages/'+encodeURIComponent(v.id)+'/retry',{requestId:v.requestId},v.actor));
for(const[name,target]of [['event','event-id'],['receipt','receipt-id'],['retry','retry-request']]){$('#'+target).value=crypto.randomUUID();$('#new-'+name).addEventListener('click',()=>$('#'+target).value=crypto.randomUUID());}
$('#messages').addEventListener('click',async e=>{const b=e.target.closest('[data-message]');if(!b)return;selected=b.dataset.message;try{detail=await api('/messages/'+encodeURIComponent(selected));$('#retry-message').value=selected;$('#receipt-provider').value=detail.message.providerId??'';renderState();}catch(error){notice(error.message,true);}});
$('#message-detail').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(!b||!detail)return;switchPanel(b.dataset.detail==='receipt'?'receipts':'retry');$('#retry-message').value=detail.message.id;$('#receipt-provider').value=detail.message.providerId??'';$('.controls').scrollIntoView({behavior:'smooth',block:'start'});});
async function start(){try{translate();switchPanel(panel);await refresh();}catch(error){notice(error.message,true);}}
start();
