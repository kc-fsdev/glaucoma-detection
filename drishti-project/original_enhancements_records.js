Created At: 2026-10-26T11:12:57+05:30
Completed At: 2026-10-26T11:12:57+05:30
File Path: `file:///d:/final/drishti-project/drishti-project/static/enhancements.js`
Total Lines: 936
Total Bytes: 101780
Showing lines 100 to 250
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
100:   function updateAccountUI(){
101:     const link=$('accountLink'); if(link){link.textContent=currentUser?t('My account','எனது கணக்கு','मेरा खाता'):t('Sign in','உள்நுழை','साइन इन');}
102:   }
103:   function goLogin(message){showAccount(message);}
104: 
105:   // Demo mode (server offline): personal data is kept in this browser, per account.
106:   const demoKey=kind=>`drishti-demo-${kind}-${currentUser.email}`;
107:   function demoRead(kind){try{return JSON.parse(localStorage.getItem(demoKey(kind))||'[]');}catch{return [];}}
108:   function demoWrite(kind,rows){localStorage.setItem(demoKey(kind),JSON.stringify(rows));}
109:   const isDemo=()=>!!(currentUser&&currentUser.demo);
110: 
111: // Only the summary is saved - the image is left out to keep the request small.
112:   function resultPayload(r){
113:     return {
114:       id: r.id,
115:       idempotency_key: r.idempotency_key || r.id,
116:       result: r.result,
117:       score: r.score,
118:       confidence: r.confidence,
119:       cdr: r.cdr,
120:       iop: r.iop,
121:       details: r.details||[],
122:       source: r.source,
123:       date: r.date,
124:       model_version: r.model_version||'glaucoma-match-v1'
125:     };
126:   }
127: 
128:   async function saveAnalysis(payload){
129:     if(isDemo()){
130:       const rows=demoRead('analyses');
131:       rows.unshift({...payload,id:payload.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),created_at:new Date().toISOString()});
132:       demoWrite('analyses',rows);
133:       return {id:payload.id};
134:     }
135:     return await api('/api/public/analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
136:   }
137: 
138:   async function savePendingResult(){
139:     let raw=null;
140:     try{raw=sessionStorage.getItem('drishti-pending-result');}catch{}
141:     if(!raw||!currentUser) return;
142:     try{
143:       const payload=JSON.parse(raw);
144:       await saveAnalysis(payload);
145:       sessionStorage.removeItem('drishti-pending-result');
146:       if(window.lastResult && (window.lastResult.idempotency_key===payload.idempotency_key || window.lastResult.id===payload.id)){
147:         window.lastResult.saved=true;
148:         const btn=$('saveResult');
149:         if(btn){
150:           btn.textContent=t('✓ Saved in Journey','✓ கண் பயணத்தில் சேமிக்கப்பட்டது','✓ यात्रा में सहेजा गया');
151:           btn.disabled=true;
152:         }
153:       }
154:       const msg=t('Your screening result was saved to your Eye Journey.','உங்கள் பரிசோதனை முடிவு கண் பயணத்தில் சேமிக்கப்பட்டது.','आपका जाँच परिणाम आँखों की यात्रा में सहेज दिया गया।');
155:       setMsg($('saveMessage'),msg,'success');
156:       const a=$('accountMessage');if(a) a.textContent+=' '+msg;
157:       await loadJourneyPrivate();
158:     }catch(e){
159:       setMsg($('saveMessage'),e.message,'error');
160:     }
161:   }
162: 
163:   if($('saveResult')) $('saveResult').addEventListener('click',async()=>{
164:     const btn=$('saveResult');
165:     const r=window.lastResult;
166:     if(!r){
167:       setMsg($('saveMessage'),t('Run the screening first, then save the result.','முதலில் பரிசோதனையை இயக்கவும்.','पहले जाँच चलाएँ, फिर परिणाम सहेजें।'),'error');
168:       return;
169:     }
170:     if(r.saved){
171:       setMsg($('saveMessage'),t('This screening result is already saved in your Eye Journey.','இந்த முடிவு ஏற்கனவே சேமிக்கப்பட்டுள்ளது.','यह परिणाम पहले से सहेजा गया है।'),'success');
172:       btn.textContent=t('✓ Saved in Journey','✓ கண் பயணத்தில் சேமிக்கப்பட்டது','✓ यात्रा में सहेजा गया');
173:       btn.disabled=true;
174:       return;
175:     }
176: 
177:     const payload=resultPayload(r);
178:     if(!currentUser){
179:       try{sessionStorage.setItem('drishti-pending-result',JSON.stringify(payload));}catch{}
180:       showAccount(t('Sign in or create an account to save this result. It will be saved automatically after you sign in.','முடிவைச் சேமிக்க உள்நுழையவும்.','परिणाम सहेजने के लिए साइन इन करें।'));
181:       return;
182:     }
183: 
184:     btn.disabled=true;
185:     setMsg($('saveMessage'),t('Saving…','சேமிக்கிறது…','सहेजा जा रहा है…'));
186:     try{
187:       await saveAnalysis(payload);
188:       r.saved=true;
189:       btn.textContent=t('✓ Saved in Journey','✓ கண் பயணத்தில் சேமிக்கப்பட்டது','✓ यात्रा में सहेजा गया');
190:       btn.disabled=true;
191:       setMsg($('saveMessage'),isDemo()?t('Saved to your journey (demo mode - this browser only).','சேமிக்கப்பட்டது (மாதிரி முறை).','सहेजा गया (डेमो मोड)।'):t('Saved to your personal journey.','உங்கள் பயணத்தில் சேமிக்கப்பட்டது.','आपकी यात्रा में सहेज दिया गया।'),'success');
192:       await loadJourneyPrivate();
193:     }catch(e){
194:       btn.disabled=false;
195:       setMsg($('saveMessage'),e.status===401?t('Your session has expired. Please sign in again.','அமர்வு காலாவதியானது. மீண்டும் உள்நுழையவும்.','सत्र समाप्त हो गया। फिर से साइन इन करें।'):e.message,'error');
196:     }
197:   });
198: 
199:   function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
200: 
201:   // --------------------------------------------------------------------------
202:   // Feature Two: Complete Records Management (CRUD with persistent MySQL)
203:   // --------------------------------------------------------------------------
204:   let activeDeleteRecordId=null;
205: 
206:   async function renderRecords(){
207:     const list=$('recordList');
208:     if(!list) return;
209:     if(!currentUser){
210:       list.innerHTML=`<p class="empty">${t('Sign in to save and view your personal records. ','உங்கள் தனிப்பட்ட பதிவுகளைப் பார்க்க அல்லது சேமிக்க உள்நுழையவும்.','अपने निजी रिकॉर्ड देखने या सहेजने के लिए साइन इन करें।')}<a href="#account">${t('Sign in','உள்நுழை','साइन इन')}</a></p>`;
211:       return;
212:     }
213: 
214:     try{
215:       const rows=isDemo()?demoRead('records'):await api('/api/public/records');
216:       if(!rows.length){
217:         list.innerHTML=`<p class="empty">${t('No saved records yet. Add your first record above.','இன்னும் பதிவுகள் இல்லை. மேலே உங்கள் முதல் பதிவைச் சேர்க்கவும்.','अभी कोई रिकॉर्ड नहीं है। ऊपर अपना पहला रिकॉर्ड जोड़ें।')}</p>`;
218:         return;
219:       }
220: 
221:       list.innerHTML=`
222:         <table class="records-table">
223:           <thead>
224:             <tr>
225:               <th>${t('Record Title / Type','பதிவின் தலைப்பு / வகை','शीर्षक / प्रकार')}</th>
226:               <th>${t('Record Date','தேதி','तारीख')}</th>
227:               <th>${t('Attachment','இணைப்பு','अटैचमेंट')}</th>
228:               <th>${t('Actions','செயல்கள்','कार्रवाई')}</th>
229:             </tr>
230:           </thead>
231:           <tbody>
232:             ${rows.map(x=>{
233:               const hasAnalysis=x.analysis_result||x.analysis_status==='Analyzed';
234:               const isSuspect=String(x.analysis_result||'').toLowerCase().includes('suspect')||String(x.analysis_result||'').toLowerCase().includes('positive');
235:               const pillClass=hasAnalysis?(isSuspect?'suspect':'normal'):'none';
236:               const statusText=x.analysis_result||(x.analysis_status&&x.analysis_status!=='None'?x.analysis_status:t('Not analyzed','பகுப்பாய்வு இல்லை','विश्लेषण नहीं'));
237:               
238:               return `
239:                 <tr>
240:                   <td class="record-title-cell">
241:                     <b>${escapeHtml(x.title)}</b>
242:                     <small>${escapeHtml(x.record_type||'Eye report')} ${x.description?`· ${escapeHtml(x.description.slice(0,40))}${x.description.length>40?'…':''}`:''}</small>
243:                   </td>
244:                   <td>${(x.record_date && String(x.record_date).trim()) ? escapeHtml(x.record_date) : 'N/A'}</td>
245:                   <td>
246:                     ${x.filename?(isDemo()?`<small class="pill">${escapeHtml(x.filename)}</small>`:`<a class="btn-icon" href="/api/public/files/${encodeURIComponent(x.filename)}" target="_blank" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${t('Open','திற','खोलें')}</a>`):`<span class="muted tiny">${t('None','இல்லை','कोई नहीं')}</span>`}
247:                   </td>
248:                   <td>
249:                     <div class="record-action-btns">
250:                       <button type="button" class="btn-icon" data-view-record="${escapeHtml(x.id)}" title="${t('View Details','விவரங்களைப் பார்க்க','विवरण देखें')}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg> ${t('View','பார்','देखें')}</button>
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
