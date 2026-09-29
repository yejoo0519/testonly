(function(){
 'use strict';
 const D=JormData,$=id=>document.getElementById(id),names={hp:'체력',atk:'공격',def:'방어',none:'없음'},chosen=new Set();
 let pendants=[{name:'미착용',options:[]}],worker=null,dirty=false;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=id=>Number($(id).value),v=id=>$(id).value,fmt=n=>Number.isFinite(n)?n.toLocaleString('ko-KR',{maximumFractionDigits:1}):'피해 없음';
 function changed(){dirty=true;if(!$('results').hidden)$('status').textContent='설정이 변경되었습니다. 아래 결과는 이전 조건입니다. 다시 계산해 주세요.';}
 D.types.forEach(t=>$('type').add(new Option(t,t)));
 Object.keys(D.gems).reverse().forEach(k=>$('gem').add(new Option('체력 '+D.gems[k].hp+' / 공격·방어 '+D.gemNames[k],k)));
 const spirit={opts:[{stat:'hp',type:'%'},{stat:'atk',type:'%'},{stat:'def',type:'%'},{stat:'hp',type:'+'}],bonus:'hp'};
 function renderSpirit(){
  $('spirits').innerHTML=SpiritInput.options(spirit,'jormSpOpt',[],(i,k,t)=>!k||!t?'—':t==='%'?Math.round(D.pct[i]*100)+'%':'+'+D.plus[k][i])+SpiritInput.bonus(spirit,'jormSpBonus',[]);
 }
 window.jormSpOpt=(i,field,value)=>{spirit.opts[i][field]=value;renderSpirit();changed()};
 window.jormSpBonus=value=>{spirit.bonus=value;renderSpirit();changed()};
 $('spPresets').onclick=e=>{const k=e.target.dataset.preset;if(!k)return;const patterns={last:['%','%','%','+'],all:['%','%','%','%'],'14':['+','%','%','+'],'24':['%','+','%','+']};spirit.opts.forEach((o,i)=>o.type=patterns[k][i]);renderSpirit();changed()};
 for(const kind of ['accessory','pendant','spirit'])$(kind+'Mode').onchange=()=>{const manual=v(kind+'Mode')==='manual';$(kind+'Manual').hidden=!manual;$(kind+'AutoNote').hidden=manual;changed()};
 document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-input-panel]').forEach(p=>p.hidden=p.dataset.inputPanel!==button.dataset.panel);
 });
 renderSpirit();
 function visible(){return D.accessories.map((a,i)=>({a,i})).filter(({a})=>a.n.includes(v('accSearch'))&&(!v('accLevel')||a.n.endsWith(' '+v('accLevel'))));}
 function syncAcc(){
  $('accCount').textContent=`${chosen.size}개 선택`;
  $('accessories').querySelectorAll('[data-acc]').forEach(el=>{el.checked=chosen.has(Number(el.dataset.acc))});
  const chips=$('selectedAcc');
  chips.querySelectorAll('[data-remove]').forEach(el=>{if(!chosen.has(Number(el.dataset.remove)))el.remove()});
  for(const i of chosen){if(chips.querySelector(`[data-remove="${i}"]`))continue;const b=document.createElement('button');b.type='button';b.dataset.remove=i;b.textContent=D.accessories[i].n+' ×';b.setAttribute('aria-label',D.accessories[i].n+' 제거');chips.append(b);}
 }
 function renderAcc(){
  if(!$('accessories').children.length)$('accessories').innerHTML=D.accessories.map((a,i)=>`<label class="acc-item" data-item="${i}"><input type="checkbox" data-acc="${i}">${a.img?`<img src="${esc(a.img)}" alt="" loading="lazy">`:''}<span>${esc(a.n)}<small>${['hp','atk','def'].map(k=>`<span class="${k}">${names[k]} ${Math.round(a[k]*100)}%</span>`).join(' · ')}</small></span></label>`).join('');
  const shown=new Set(visible().map(({i})=>i));
  $('accessories').querySelectorAll('[data-item]').forEach(el=>{el.hidden=!shown.has(Number(el.dataset.item))});syncAcc();
 }
 $('accessories').onchange=e=>{if(e.target.dataset.acc===undefined)return;const id=Number(e.target.dataset.acc);e.target.checked?chosen.add(id):chosen.delete(id);syncAcc();changed()};
 $('selectedAcc').onclick=e=>{if(e.target.dataset.remove===undefined)return;chosen.delete(Number(e.target.dataset.remove));syncAcc();changed()};
 $('accSearch').oninput=renderAcc;$('accLevel').onchange=renderAcc;
 $('selectVisible').onclick=()=>{visible().forEach(({i})=>chosen.add(i));syncAcc();changed()};$('clearAcc').onclick=()=>{chosen.clear();syncAcc();changed()};
 function roleChanged(){
  const tank=v('role')==='tank';$('element').replaceChildren(new Option(tank?'빛':'어둠',tank?'light':'dark'),new Option(tank?'비빛':'비어둠','other'));
  $('roleNote').textContent=tank?'빛 속성 보정을 반영한 생존 점수로 비교합니다. 표시 스탯과 탱킹 비밸에는 속성 보정을 더하지 않습니다.':'일반 명중 피해가 높은 세팅을 비교합니다. 동일 피해일 때 탱킹 비밸이 높은 순으로 표시합니다.';changed();
 }
 $('role').onchange=roleChanged;
 function pendOptions(type,val){const slots=type==='태양'?3:type==='달'?2:1,choices=[];function build(opts,start){if(opts.length===slots){choices.push({name:type,options:opts});return}for(let i=start;i<3;i++)build([...opts,{stat:['hp','atk','def'][i],val}],i)}build([],0);return choices;}
 let pendChoices=[];
 const pendLabel=p=>p.options.map(o=>`<span class="${o.stat}">${names[o.stat]} ${o.val}%</span>`).join(' / ');
 function renderChoices(){pendChoices=pendOptions(v('pendType'),n('pendValue'));$('pendChoices').innerHTML=pendChoices.map((p,i)=>`<button type="button" data-choice="${i}">${pendLabel(p)}<small>눌러서 추가</small></button>`).join('');}
 function addPendants(items){for(const p of items)if(!pendants.some(x=>JSON.stringify(x)===JSON.stringify(p)))pendants.push(JSON.parse(JSON.stringify(p)));renderPends();changed()}
 function renderPends(){
  $('pendCount').textContent=pendants.length+'개';
  $('pendants').innerHTML=pendants.map((p,i)=>`<div class="j-pendant"><header><strong>${esc(p.name)}</strong><button type="button" data-pend="${i}" aria-label="${esc(p.name)} 제거">제거</button></header>${p.options.map((o,j)=>`<div class="fields"><label>${j+1}옵 스탯<select data-pi="${i}" data-oi="${j}" data-field="stat">${['hp','atk','def'].map(k=>`<option value="${k}" ${k===o.stat?'selected':''}>${names[k]}</option>`).join('')}</select></label><label>수치<select data-pi="${i}" data-oi="${j}" data-field="val">${[6,5,4,3,2,1].map(x=>`<option value="${x}" ${x===o.val?'selected':''}>${x}%</option>`).join('')}</select></label></div>`).join('')}</div>`).join('');
 }
 $('pendType').onchange=renderChoices;$('pendValue').onchange=renderChoices;
 $('pendChoices').onclick=e=>{const b=e.target.closest('[data-choice]');if(b)addPendants([pendChoices[Number(b.dataset.choice)]])};
 $('sunSet').onclick=()=>addPendants(pendOptions('태양',6));$('moonSet').onclick=()=>addPendants(pendOptions('달',6));
 $('pendants').onclick=e=>{if(e.target.dataset.pend===undefined)return;pendants.splice(Number(e.target.dataset.pend),1);renderPends();changed()};
 $('pendants').onchange=e=>{const el=e.target;if(el.dataset.pi===undefined)return;pendants[Number(el.dataset.pi)].options[Number(el.dataset.oi)][el.dataset.field]=el.dataset.field==='val'?Number(el.value):el.value;changed()};
 renderChoices();
 function config(){return {role:v('role'),type:v('type'),grade:v('grade'),light:v('element')==='light',dark:v('element')==='dark',gem:v('gem'),enchant:v('enchant'),potion:$('potion').checked,collection:Object.fromEntries(['hp','atk','def'].map(k=>[k,n('col-'+k)])),spirit:spirit.opts.map(o=>({stat:v('spiritMode')==='auto'?'auto':(o.stat&&o.type?o.stat:'none'),type:v('spiritMode')==='auto'?'auto':(o.type||'%')})),bonus:v('spiritMode')==='auto'?'auto':(spirit.bonus||'none'),accessoryMode:v('accessoryMode'),pendantMode:v('pendantMode'),accessories:v('accessoryMode')==='auto'?D.accessories.map((_,i)=>i):[...chosen],pendants:pendants.map(p=>{const result={name:p.name,hp:0,atk:0,def:0};p.options.forEach(o=>result[o.stat]+=o.val);return result})};}
 let lastResult=null,resultType='all';
 function renderResults(){
  if(!lastResult)return;const {result,config:c}=lastResult;
  $('scoreHelp').hidden=c.role!=='tank';
  const entries=[['all','전체',result.rows],...Object.entries(result.byType).map(([t,rows])=>[t,t,rows])];
  $('resultTypes').innerHTML=entries.map(([id,label,rows])=>`<button type="button" data-result-type="${esc(id)}" aria-pressed="${resultType===id}"><span>${esc(label)}</span><strong>${rows.length?fmt(c.role==='tank'?rows[0].score:rows[0].dealt):'—'}</strong><small>${c.role==='tank'?'생존 점수':'일반 명중 피해'}</small></button>`).join('');
  const rows=resultType==='all'?result.rows:result.byType[resultType]||[];
  $('resultTitle').textContent=(resultType==='all'?'전체 타입':resultType)+' · TOP '+rows.length;
  $('resultList').innerHTML=rows.map((r,i)=>`<article class="j-result"><header><div><small>추천 ${i+1}</small><h3>${esc(r.type)}</h3></div><div class="j-metrics"><div class="primary"><small>${c.role==='tank'?'생존 점수':'일반 명중 피해'}</small><strong>${fmt(c.role==='tank'?r.score:r.dealt)}</strong></div><div><small>탱킹 비밸</small><strong>${fmt(r.tankBV)}</strong></div></div></header>
  <div class="j-final-stats">${['hp','atk','def'].map(k=>`<div class="${k}"><small>${names[k]}</small><b>${fmt(r.stats[k])}</b></div>`).join('')}</div>
  <div class="j-gear"><div><small>장신구</small><b>${esc(D.accessories[r.acc].n)}</b><div>인챈트 · ${names[r.enchant]}${r.enchant==='none'?'':' +21%'}</div></div>
  <div><small>젬 배분</small>${['hp','atk','def'].map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.gems[k]}개</span>`).join('')}</div>
  <div><small>펜던트 · ${esc(r.pend.name)}</small>${['hp','atk','def'].filter(k=>r.pend[k]).map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.pend[k]}%</span>`).join('')||'미착용'}</div>
  <div><small>정령</small><div class="j-spirit-result">${r.spirit.opts.map((o,j)=>`<span class="${o.stat}"><small>${j+1}옵</small>${names[o.stat]} ${o.stat==='none'?'':o.type==='%'?Math.round(D.pct[j+1]*100)+'%':'+'+D.plus[o.stat][j+1]}</span>`).join('')}</div><div class="${r.spirit.bonus}">부가옵 · ${names[r.spirit.bonus]}</div></div></div></article>`).join('')||'선택한 조건을 만족하는 조합이 없습니다.';
 }
 $('resultTypes').onclick=e=>{const button=e.target.closest('[data-result-type]');if(!button)return;resultType=button.dataset.resultType;renderResults()};
 function finish(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
 $('cancel').onclick=()=>{finish();$('status').textContent='계산을 중단했습니다. 기존 결과는 유지됩니다.';};
 $('config').addEventListener('input',changed);$('config').addEventListener('change',changed);
 $('config').onsubmit=e=>{
  e.preventDefault();if(worker)return;const c=config();if(!c.accessories.length||(c.pendantMode==='manual'&&!c.pendants.length)){$('status').textContent='장신구와 펜던트 후보를 각각 하나 이상 선택해 주세요.';return}
  dirty=false;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='장비 조합 계산 중…';
  try{worker=new Worker('./jorm-engine.js');}catch(error){finish();$('status').textContent='계산기를 시작하지 못했습니다. 웹 서버에서 페이지를 열어 주세요.';return}
  worker.onerror=()=>{finish();$('status').textContent='계산 파일을 불러오지 못했습니다. jorm-engine.js와 jorm-data.js 업로드를 확인해 주세요.'};
  worker.onmessage=({data})=>{
   if(data.progress){$('status').textContent=`계산 중 ${Math.floor(data.progress.tested/data.progress.total*100)}%`;return}
   finish();if(data.error){$('status').textContent=data.error;return}
   const result=data.result;$('results').hidden=false;
   $('resultConditions').textContent=`${c.role==='tank'?'탱커 · 생존 점수':'딜러 · 일반 명중 피해'} 우선 / ${c.grade} / 장신구 ${c.accessoryMode==='auto'?'최적화':'직접 입력'} · 펜던트 ${c.pendantMode==='auto'?'최적화':'직접 입력'} · 정령 ${c.spirit[0].type==='auto'?'최적화':'직접 입력'} / ${c.role==='tank'?(c.light?'빛':'비빛'):(c.dark?'어둠':'비어둠')}`;

   lastResult={result,config:c};resultType='all';renderResults();
   $('status').textContent=`전체 ${fmt(result.totalCandidates)}개 조합 최적화 완료.`+(dirty?' 계산 중 설정이 변경되어 결과는 실행 당시 조건입니다.':'');
  };
  worker.postMessage(c);
 };
 renderAcc();renderPends();
})();
