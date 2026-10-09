'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const escapeHtml=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let language='en';try{language=localStorage.getItem('nearby-workbench-language')==='zh-CN'?'zh-CN':'en';}catch{}
const L=(en,zh)=>language==='zh-CN'?zh:en;
let resumedSession=null;
let view='customer',professionalId='pro-1';
let panel='overview',evidence='provider',selected=null,busy=false,state=null,provider=null,requests=[],previewResult=null,detail=null;
const original=new Map();
$$('[data-zh]').forEach(e=>original.set(e,e.textContent));
$$('[data-zh-label]').forEach(e=>{const node=[...e.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(node)original.set(node,node.textContent);});
function translate(){
 document.documentElement.lang=language;$('#language').textContent=language==='en'?'中文':'EN';
 for(const [e,text] of original){if(e.nodeType===Node.TEXT_NODE)e.textContent=language==='zh-CN'?e.parentElement.dataset.zhLabel:text;else e.textContent=language==='zh-CN'?e.dataset.zh:text;}
 $('#connection').textContent=state?(provider?L('API + messaging gateway connected','API 与消息供应商已连接'):L('Provider offline','供应商未连接')):L('Connecting…','连接中…');
 if(state)renderState();renderEvidence();renderPreview();switchPanel(panel);switchView(view);
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
function setBusy(value){busy=value;$$('form button,#dispatch,#load-scene,[data-advance],#refresh,.user-card button,[data-journey]').forEach(b=>b.disabled=value);}
async function act(label,fn){if(busy)return;setBusy(true);try{const value=await fn();await refresh();notice(value?.notice??label);return value;}catch(error){notice(error.message,true);await refresh().catch(()=>{});}finally{setBusy(false);}}
async function refresh(){
 const [s,p]=await Promise.allSettled([api('/dev/state'),api('/dev/provider/records')]);
 if(s.status==='rejected'){$('#connection').textContent=L('API offline','API 未连接');throw s.reason;}
 state=s.value;if(resumedSession===null)resumedSession=Boolean((state.journeys??[]).length||state.messages.length||state.users.some(u=>u.revision>1));provider=p.status==='fulfilled'?p.value:null;
 $('#connection').textContent=provider?L('API + messaging gateway connected','API 与消息供应商已连接'):L('Provider offline','供应商未连接');
 if(selected&&!state.messages.some(m=>m.id===selected)){selected=null;detail=null;}
 if(selected)detail=await api('/messages/'+encodeURIComponent(selected));
 renderState();renderEvidence();
 if(!provider)notice(L('Provider unavailable. Start both services with npm run dev.','供应商不可用，请通过 npm run dev 启动两个服务。'),true);
}
function switchPanel(next){panel=next;$('.controls').hidden=next==='overview';$('.work-grid').classList.toggle('overview',next==='overview');$('#control-title').textContent=$('[data-panel="'+next+'"]').textContent;$$('[id^="panel-"]').forEach(e=>e.hidden=e.id!=='panel-'+next);$$('[data-panel]').forEach(e=>{e.setAttribute('aria-pressed',String(e.dataset.panel===next));if(e.hasAttribute('data-context'))e.hidden=e.dataset.panel!==next;});}
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
 $('#users').innerHTML=state.users.map(preferenceCard).join('');
 renderDetail();renderPerspectives();
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
$('#confirm-reset').addEventListener('click',()=>{$('#reset-dialog').close();act(L('Fresh simulation ready. Submit Alex’s request to begin.','已开始全新模拟。请先由 Alex 提交维修需求。'),async()=>{await api('/dev/reset',{fixture:'baseline'});resumedSession=false;selected=null;detail=null;previewResult=null;renderPreview();switchView('customer');$('#event-id').value=crypto.randomUUID();$('#retry-message').value='';$('#receipt-provider').value='';});});
$('#dispatch').addEventListener('click',()=>act(L('Dispatch complete. Check each message’s status below.','发送已执行，请查看消息列表中的状态。'),()=>api('/tick',{})));
$('#refresh').addEventListener('click',()=>act(L('Refreshed','已刷新'),async()=>{}));
$$('[data-advance]').forEach(b=>b.addEventListener('click',()=>act(L('Clock advanced','时钟已推进'),()=>api('/clock',{now:new Date(Date.parse(state.now)+Number(b.dataset.advance)*1000).toISOString()}))));
form('#clock-form',v=>api('/clock',{now:v.now}));
form('#event-form',async v=>{const messages=await api('/events',v);return {notice:messages.length?L(`${messages.length} message(s) created. Click “Send queued messages” next.`,`已生成 ${messages.length} 条消息，尚未发送。接下来点击「执行发送」。`):L('The backend returned no messages for this event. See the request log for its response.','后端没有为这个事件生成消息。可展开详细记录查看接口响应。')};});
form('#job-form',v=>api('/dev/job',{...v,providers:split(v.providers)}));
form('#message-form',async v=>{const count=Number(v.count);if(!Number.isInteger(count)||count<1||count>10)throw new Error('Count must be 1–10');const scheduledAt=v.scheduledAt?iso(v.scheduledAt):state.now;for(let i=0;i<count;i++)await api('/dev/message',{userId:v.userId,channel:v.channel,purpose:v.purpose,scheduledAt,nextAt:scheduledAt,expiresAt:v.expiresAt?iso(v.expiresAt):null,experimentId:v.experimentId||null,body:v.body,template:v.purpose==='engagement'?'followup':'confirmation'});});
document.addEventListener('click',e=>{const b=e.target.closest('[data-save-user]');if(!b)return;const card=b.closest('[data-user]');act(L('Notification choices saved. Dispatch to observe whether the backend honors them.','通知设置已保存。再次执行发送，可观察后端是否遵守你的选择。'),()=>api('/consent',{userId:b.dataset.saveUser,...Object.fromEntries([...card.querySelectorAll('[data-consent]')].map(x=>[x.dataset.consent,x.checked]))}));});
$('#fault-preset').addEventListener('change',e=>$('#fault-modes').value=e.target.value);
form('#fault-form',v=>api('/dev/provider/fault',{userId:v.userId,modes:split(v.modes)}));
$('#release').addEventListener('click',()=>act(L('Responses released','响应已释放'),()=>api('/dev/provider/release',{})));
form('#receipt-form',v=>api('/receipts',{...v,sequence:Number(v.sequence)}));
form('#preview-form',async v=>{previewResult=await api('/preview',{users:split(v.users),scheduledAt:v.scheduledAt?iso(v.scheduledAt):state.now,experimentId:v.experimentId||null});renderPreview();});
form('#retry-form',v=>api('/messages/'+encodeURIComponent(v.id)+'/retry',{requestId:v.requestId},v.actor));
for(const[name,target]of [['event','event-id'],['receipt','receipt-id'],['retry','retry-request']]){$('#'+target).value=crypto.randomUUID();$('#new-'+name).addEventListener('click',()=>$('#'+target).value=crypto.randomUUID());}
$('#messages').addEventListener('click',async e=>{const b=e.target.closest('[data-message]');if(!b)return;selected=b.dataset.message;try{detail=await api('/messages/'+encodeURIComponent(selected));$('#retry-message').value=selected;$('#receipt-provider').value=detail.message.providerId??'';renderState();}catch(error){notice(error.message,true);}});
$('#message-detail').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(!b||!detail)return;switchPanel(b.dataset.detail==='receipt'?'receipts':'retry');$('#retry-message').value=detail.message.id;$('#receipt-provider').value=detail.message.providerId??'';$('.controls').scrollIntoView({behavior:'smooth',block:'start'});});

function switchView(next){
 view=next;
 $$('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
 $$('.perspective').forEach(section=>section.hidden=section.id!=='view-'+view);
}
function preferenceCard(user){
 if(!user)return '';
 return `<div class="user-card" data-user="${escapeHtml(user.id)}"><strong>${escapeHtml(user.name)}</strong><p class="hint">${L('These choices mean “Nearby may contact me”. Sample accounts initially allow both channels.','这些开关表示「我同意 Nearby 联系我」。示例账号初始允许邮件和短信。')}</p><div class="consent-options"><label><input type="checkbox" data-consent="email" ${user.email?'checked':''}>${L('Allow email notifications','允许邮件通知')}</label><label><input type="checkbox" data-consent="sms" ${user.sms?'checked':''}>${L('Allow SMS notifications','允许短信通知')}</label><label><input type="checkbox" data-consent="dnc" ${user.dnc?'checked':''}>${L('Stop all notifications (overrides both above)','停止所有通知（优先于上面两个开关）')}</label></div><button data-save-user="${escapeHtml(user.id)}">${L('Save notification choices','保存通知设置')}</button><p class="hint consent-example">${L('Example: switch email off and save while a message is queued. When sending next, the backend should block that email. Already accepted messages cannot be recalled.','例如：一封邮件还在排队时，关闭邮件开关并保存；之后发送时，后端应拦截它。已交给消息供应商的邮件无法撤回。')}</p><small>${escapeHtml(user.zone)} · ${L('Saved settings revision','已保存设置版本')} ${user.revision}</small></div>`;
}
function renderInbox(userId,target){
 const messages=state.messages.filter(m=>m.userId===userId&&m.status==='delivered');
 $(target).innerHTML=messages.length?messages.map(m=>`<article class="inbox-message"><span class="channel-label">${m.channel==='sms'?'SMS':L('Email','邮件')} · ${L('From Nearby','来自 Nearby')}</span><p>${escapeHtml(m.body)}</p><small>${escapeHtml(m.jobId)} · ${escapeHtml(m.id)}</small></article>`).join(''):`<div class="empty">${L('No delivered messages yet. After dispatch, the platform can submit a delivery receipt from message details.','还没有已送达消息。平台执行发送后，可在消息详情里提交送达回执。')}</div>`;
}
function notificationSummary(userId,jobId){
 const recipient=escapeHtml(state.users.find(u=>u.id===userId)?.name??userId);
 const messages=state.messages.filter(m=>m.userId===userId&&m.jobId===jobId);
 if(!messages.length)return `<p class="notification-status">${L('Messages to ','发给 ')}${recipient}${L(': none created.',' 的通知：尚未生成。')}</p>`;
 return `<div class="notification-status"><strong>${L('Messages to ','发给 ')}${recipient}${L('',' 的通知')}</strong>${messages.map(m=>`<p>${m.channel==='email'?L('Email','邮件'):'SMS'} · ${escapeHtml(readableStatus(m.status))} · ${L('Send attempts','发送尝试')} ${m.attempts}</p>`).join('')}</div>`;
}
function renderSession(){
 const journey=(state.journeys??[]).find(j=>j.id==='job-1');
 const isFresh=!journey&&!state.messages.length;
 const title=resumedSession?L('Continuing a saved simulation','正在继续上次保存的模拟'):isFresh?L('Fresh simulation · start as Alex','全新模拟 · 从 Alex 开始'):L('Current simulation','当前模拟');
 $('#session-summary').innerHTML=`<div><strong>${title}</strong><p>${resumedSession?L('Your earlier actions are stored locally. Refreshing or restarting does not clear them.','之前的操作保存在本地，刷新页面或重启服务不会清空。'):L('Act as Customer to submit a request, Platform to send its confirmation, then Customer to inspect delivery.','先以客户身份提交需求，再以平台身份发送确认邮件，最后回到客户视角查看结果。')}</p><span>${L('Messages created','已生成消息')} ${state.messages.length} · ${L('Gateway send calls','发送调用')} ${provider?provider.calls.length:'—'} · ${L('Delivered','已送达')} ${state.messages.filter(m=>m.status==='delivered').length}</span></div><button data-start-over>${L('Start over','从头开始')}</button>`;
}
const stageName=stage=>({draft:L('Not submitted','尚未提交'),submitted:L('Waiting for a match','等待匹配'),matched:L('Recipient list selected','已选好通知名单'),completed:L('Service completed','服务已完成')}[stage]);
function renderPerspectives(){
 renderSession();
 const job=state.jobs.find(j=>j.id==='job-1');
 if(!job){$('#customer-request').textContent=L('Sample request unavailable. Reset sample data to begin.','示例需求不存在，请重置示例数据。');return;}
 const journey=(state.journeys??[]).find(j=>j.id===job.id),stage=journey?.stage??'draft';
 const customer=state.users.find(u=>u.id===job.customerId);
 const pros=state.users.filter(u=>u.id!==job.customerId);
 if(!pros.some(u=>u.id===professionalId))professionalId=pros[0]?.id??'';
 $('#professional-picker').innerHTML=pros.map(u=>`<option value="${escapeHtml(u.id)}">${escapeHtml(u.name)} (${escapeHtml(u.id)})</option>`).join('');
 $('#professional-picker').value=professionalId;
 const matched=stage==='matched'||stage==='completed';
 const matchNames=(job.providers??[]).map(id=>state.users.find(u=>u.id===id)?.name??id).join(', ');
 const heading=`<span class="eyebrow">${escapeHtml(job.id)} · ${escapeHtml(stageName(stage))}</span><h2>${escapeHtml(job.service)} · ${L('Home service request','上门维修需求')}</h2>`;
 $('#customer-request').innerHTML=heading+`<p>${L('I need help fixing the plumbing at home.','我家需要维修水管，希望找到能上门处理的师傅。')}</p>`+(stage==='draft'?`<button class="primary" data-journey="submit">${L('Submit service request','提交维修需求')}</button>`:`<p>${matched?L('Chosen notification recipients (not delivery confirmation): ','平台选定的通知对象（不代表已发送）：')+escapeHtml(matchNames):L('Your request was submitted. The platform will select professionals next.','需求已提交，等待平台选择服务人员。')}</p><p class="hint">${L('Notifications appear in your inbox after delivery.','通知送达后会显示在你的收件箱中。')}</p>`);
 $('#customer-request').insertAdjacentHTML('beforeend',notificationSummary(job.customerId,job.id)+(stage!=='draft'?`<button data-go-view="platform">${L('Go to Platform to inspect and send','去平台查看并发送')}</button>`:''));
 $('#customer-preferences').innerHTML=preferenceCard(customer);
 renderInbox(job.customerId,'#customer-inbox');
 const isMatched=matched&&job.providers.includes(professionalId);
 $('#professional-request').innerHTML=`<h2>${L('Requests the platform selected me for','平台为我选中的需求')}</h2>`+(isMatched?`<div class="request-summary">${heading}<p>${L('Customer','客户')}：${escapeHtml(customer?.name??job.customerId)}</p><p class="hint">${L('You are on the platform’s selected list. Check your inbox separately for the SMS notification. Booking and job acceptance are outside this simulator.','你已在平台选定的名单中。短信是否送达，请查看收件箱；本模拟器不包含接单和预约流程。')}</p></div>`:`<p class="empty">${L('No requests matched to this professional. Select them in Platform to create a match.','尚未匹配到需求。平台选择这位服务人员后，这里才会出现需求。')}</p>`);
 $('#professional-request').insertAdjacentHTML('beforeend',notificationSummary(professionalId,job.id));
 $('#professional-preferences').innerHTML=preferenceCard(state.users.find(u=>u.id===professionalId));
 renderInbox(professionalId,'#professional-inbox');
 const timeline=['draft','submitted','matched','completed'];
 const steps=timeline.slice(1).map((st,i)=>`<li class="${timeline.indexOf(stage)>=i+1?'done':''}"><b>${i+1}</b>${[L('Customer submitted','客户提交'),L('Platform matched','平台匹配'),L('Service completed','服务完成')][i]}</li>`).join('');
 const action=stage==='draft'?`<p>${L('Alex has not submitted the request yet. Start in Customer.','Alex 尚未提交需求，请先进入客户视角。')}</p><button data-go-view="customer">${L('Go to Customer','进入客户视角')}</button>`:stage==='submitted'?`<form id="match-form"><p>${L('Select the professionals who should receive this plumbing request. Matching does not mean they have accepted the job.','选择应收到这条维修需求的服务人员。匹配不代表他们已经接单。')}</p><div class="match-options">${pros.map(u=>`<label><input type="checkbox" name="professional" value="${escapeHtml(u.id)}" ><strong>${escapeHtml(u.name)}</strong><span>${escapeHtml(u.id)}</span></label>`).join('')}</div><button class="primary" data-journey="match">${L('Confirm match','确认匹配')}</button></form>`:stage==='matched'?`<p>${L('Selected professionals','已选择服务人员')}：<strong>${escapeHtml(matchNames)}</strong></p><button data-journey="complete">${L('Mark service completed','确认服务完成')}</button><p class="hint">${L('This queues Alex’s next-day follow-up. Dispatch and delivery are separate steps below.','这将生成 Alex 的次日回访邮件。下方可单独执行发送和更新送达状态。')}</p>`:`<p>${L('The service is completed. Inspect the follow-up in the message list; use the simulated clock for tomorrow.','服务已完成。请在消息列表检查回访邮件，可推进模拟时钟到次日。')}</p>`;
 const recipientStatus=matched?`<div class="recipient-status">${job.providers.map(id=>`<section><strong>${escapeHtml(state.users.find(u=>u.id===id)?.name??id)}</strong>${notificationSummary(id,job.id)}</section>`).join('')}</div>`:'';
 const history=(journey?.history??[]).map(e=>`<li><strong>${escapeHtml(e.type)}</strong><small>${escapeHtml(e.at)} · ${escapeHtml(e.eventId)}</small></li>`).join('');
 $('#platform-request').innerHTML=`<div class="request-top"><div>${heading}<p>${L('Customer','客户')}：${escapeHtml(customer?.name??job.customerId)}</p></div><ol class="journey-steps">${steps}</ol></div>${action}${recipientStatus}${history?`<details class="journey-history"><summary>${L('Request event history','需求事件记录')}</summary><ul>${history}</ul></details>`:''}`;
}
$$('[data-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));
$$('[data-debug]').forEach(button=>$('#debug-buttons').append(button));
$('#professional-picker').addEventListener('change',e=>{professionalId=e.target.value;renderPerspectives();});
document.addEventListener('click',e=>{
 if(e.target.closest('[data-start-over]'))$('#reset-dialog').showModal();
 const link=e.target.closest('[data-go-view]');if(link)switchView(link.dataset.goView);
 const button=e.target.closest('[data-journey]');if(!button)return;e.preventDefault();
 const action=button.dataset.journey;
 const professionals=$$('#match-form input:checked').map(input=>input.value);
 act(L('Request updated. Inspect the resulting messages in Platform.','需求已更新，可在平台视角查看生成的消息。'),async()=>{
  const result=await api('/dev/journey',{action,professionals});
  $('#event-id').value=result.event.id;$('#event-type').value=result.event.type;$('#event-job').value=result.event.jobId;
  return {notice:result.messages.length?L(`Created ${result.messages.length} queued message(s). Nothing was sent by this action.`,`生成了 ${result.messages.length} 条待发消息；本次操作没有执行发送。`):L('Recipient list saved, but the backend created no notifications. Nothing was sent.','已保存通知名单，但后端没有生成通知，也没有发送。')};
 });
});
async function start(){try{translate();switchPanel(panel);await refresh();}catch(error){notice(error.message,true);}}
start();
