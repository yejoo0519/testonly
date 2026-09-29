/* Pure optimizer. No account, storage, or network access. */
(function(root){
  'use strict';
  const keys=['hp','atk','def'];
  // Standard hit reference, without user-configurable battle actions.
  function attack(atk,c){return Math.floor(44*Math.floor(atk*(c.dark?1.25:1)+1e-9)/322);}
  // Fixed comparison scenario: front row, both rows full, every boss attack
  // hits, no guard/miss/heal/critical. Normal uses the larger single/spread hit;
  // special column attacks use 0.7. With these conditions the cycle is 5 hits.
  function endurance(hp,def,light=false){
    const denominator=def*(light?23:16)+352;
    const normal=Math.floor(44*5000*16/denominator);
    const special=Math.floor(44*3500*16/denominator);
    const cycle=normal*4+special;
    if(!cycle)return Infinity;
    const cycles=Math.max(0,Math.ceil(hp/cycle)-1),left=hp-cycles*cycle;
    if(normal&&left<=normal*4)return cycles*5+left/normal;
    return cycles*5+4+(left-normal*4)/special;
  }
  const reference=endurance(3000,500,false);
  function survivalScore(hp,def,light=false){return 100*endurance(hp,def,light)/reference;}
  function stat(b,g,p,a,s,pend,plus,bonus,col){const x=Math.floor((b+g+p)*(1+a)+1e-9);const y=Math.floor((x+plus)*(1+s)+1e-9);return Math.floor(y*(1+pend)+1e-9)+bonus+col;}
  function spiritVariants(c,data){
    let rows=[[]];for(let i=0;i<4;i++){const opts=c.spirit[i];const stats=opts.stat==='auto'?keys:[opts.stat];const types=opts.type==='auto'?['%','+']:[opts.type];rows=rows.flatMap(r=>stats.flatMap(k=>types.map(type=>[...r,{stat:k,type}])));}
    return rows.flatMap(opts=>(c.bonus==='auto'?keys:[c.bonus]).map(bonus=>{
      const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0};opts.forEach((o,i)=>{if(o.stat==='none')return;if(o.type==='+')plus[o.stat]+=data.plus[o.stat][i+1];else pct[o.stat]+=data.pct[i+1]});
      return {opts,bonus,plus,pct};
    }));
  }
  function validate(c){
    for(const k of keys)if(!Number.isFinite(c.collection[k])||c.collection[k]<0)throw Error('컬렉션 수치를 확인해 주세요.');
    if(!c.accessories.length||(c.pendantMode!=='auto'&&!c.pendants.length))throw Error('장신구와 펜던트 후보를 각각 하나 이상 선택해 주세요.');
  }
  function allPendants(){
    const result=[{name:'미착용',hp:0,atk:0,def:0}];
    const opts=keys.flatMap(stat=>Array.from({length:6},(_,i)=>({stat,val:i+1})));
    for(const [name,count] of [['별',1],['달',2],['태양',3]]){
      function build(start,slots,p){if(!slots){result.push(p);return}for(let i=start;i<opts.length;i++){const o=opts[i];build(i,slots-1,{...p,[o.stat]:p[o.stat]+o.val})}}
      build(0,count,{name,hp:0,atk:0,def:0});
    }
    return result;
  }
  // Keep 10 representatives for every attainable stat vector. A vector may be
  // removed only if at least 10 distinct candidates are no worse in every stat.
  // Hence the top-10 score multiset (including ties) is preserved, not only #1.
  function pendantFrontier(rows){
    const groups=new Map();for(const r of rows){const k=keys.map(x=>r[x]).join(',');const g=groups.get(k)||[];if(g.length<10)g.push(r);groups.set(k,g)}
    const gs=[...groups.values()];return gs.filter(g=>{let count=0;for(const other of gs){if(other===g)continue;if(keys.every(k=>other[0][k]>=g[0][k]))count+=other.length;if(count>=10)return false}return true}).flat();
  }
  function optimize(c,data,progress=()=>{}){
    validate(c);
    const spirits=spiritVariants(c,data),allocs=[];
    const allPend=c.pendantMode==='auto'?allPendants():c.pendants;
    const pends=c.pendantMode==='auto'?pendantFrontier(allPend):allPend;
    for(let h=0;h<=5;h++)for(let a=0;a<=5-h;a++)allocs.push({hp:h,atk:a,def:5-h-a});
    const types=c.type==='all'?data.types:[c.type],byType={};let tested=0,qualified=0;
    const total=types.length*c.accessories.length*pends.length*spirits.length*allocs.length*(c.enchant==='auto'?3:1);
    const better=(a,b)=>c.role==='tank'?(b.score-a.score||b.tankBV-a.tankBV||b.dealt-a.dealt):(b.dealt-a.dealt||b.tankBV-a.tankBV);
    let nextProgress=32768;
    const maxPend=Object.fromEntries(keys.map(k=>[k,Math.max(...pends.map(p=>p[k]))]));
    for(const type of types){const top=[];byType[type]=top;const base=data.base[c.grade][type];
      for(const ai of c.accessories){const acc=data.accessories[ai];if(!acc)throw Error('장신구 번호가 올바르지 않습니다.');
        for(const enchant of c.enchant==='auto'?keys:[c.enchant])for(const sp of spirits){
          const values={},adds={};
          for(const k of keys){
            adds[k]=(sp.bonus===k?data.bonus[k]:0)+c.collection[k];
            values[k]=Array.from({length:6},(_,g)=>stat(base[k],g*data.gems[c.gem][k],c.potion?(k==='hp'?24:6):0,acc[k]+(enchant===k?.21:0),sp.pct[k],0,sp.plus[k],0,0));
          }
          for(const gems of allocs){
            const h=values.hp[gems.hp],a=values.atk[gems.atk],d=values.def[gems.def];
            const bound={tankBV:(Math.floor(h*(1+maxPend.hp/100)+1e-9)+adds.hp)*(Math.floor(d*(1+maxPend.def/100)+1e-9)+adds.def),dealt:attack(Math.floor(a*(1+maxPend.atk/100)+1e-9)+adds.atk,c)};
            if(c.role==='tank')bound.score=survivalScore(Math.floor(h*(1+maxPend.hp/100)+1e-9)+adds.hp,Math.floor(d*(1+maxPend.def/100)+1e-9)+adds.def,c.light);
            tested+=pends.length;
            if(top.length<10||better(bound,top[9])<=0)for(const pend of pends){
              const stats={hp:Math.floor(h*(1+pend.hp/100)+1e-9)+adds.hp,atk:Math.floor(a*(1+pend.atk/100)+1e-9)+adds.atk,def:Math.floor(d*(1+pend.def/100)+1e-9)+adds.def};
              const tankBV=stats.hp*stats.def,dealt=attack(stats.atk,c);
              qualified++;const row={type,acc:ai,enchant,pend,spirit:{opts:sp.opts,bonus:sp.bonus},gems,stats,tankBV,dealt,score:c.role==='tank'?survivalScore(stats.hp,stats.def,c.light):null};
              if(top.length<10||better(row,top[top.length-1])<0){top.push(row);top.sort(better);if(top.length>10)top.pop();}
            }
          }
          if(tested>=nextProgress){progress({tested,total});nextProgress=tested+100000;}
        }
      }
    }
    return {rows:Object.values(byType).flat().sort(better).slice(0,10),byType,tested,qualified,totalCandidates:total/pends.length*allPend.length};
  }
  const api={endurance,survivalScore,attack,stat,optimize,allPendants,pendantFrontier,spiritVariants};
  if(typeof module!=='undefined')module.exports=api;else root.JormEngine=api;
  if(typeof document==='undefined'&&typeof importScripts==='function'){
    importScripts('./jorm-data.js');root.onmessage=e=>{try{root.postMessage({result:optimize(e.data,root.JormData,p=>root.postMessage({progress:p}))})}catch(err){root.postMessage({error:err.message})}};
  }
})(globalThis);
