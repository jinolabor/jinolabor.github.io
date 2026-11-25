/* 노무그룹지노 · 회원사 전용 노동관계법령 개정 안내 — 공통 */
var SB_URL='https://vsbddasoslqmcvoppvuj.supabase.co', SB_KEY='sb_publishable__6dfg59E_kmUEO9nkLNA_Q_gxt1jidT';
var $=function(s,el){return (el||document).querySelector(s)}, $$=function(s,el){return Array.from((el||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function okUrl(u){return /^https:\/\//i.test(String(u||''))}
var mem={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}},del:function(k){try{localStorage.removeItem(k)}catch(e){}},
  sget:function(k){try{return sessionStorage.getItem(k)}catch(e){return null}},sset:function(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},sdel:function(k){try{sessionStorage.removeItem(k)}catch(e){}}};
// 화면 공통 설정 (관리 화면 「안내 제목·기준일」에서 바꿈)
var SET={period:'2026~2027',basis:'2026.10.27.'};
async function loadSettings(){
  try{var r=await rpcCall('law_settings_public',{});if(r&&r.period)SET.period=r.period;if(r&&r.basis)SET.basis=r.basis}catch(e){}
  $$('.sv-period').forEach(function(e){e.textContent=SET.period});
  $$('.sv-basis').forEach(function(e){e.textContent=SET.basis});
  return SET;
}
async function rpcCall(fn,args){
  var r=await fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  var t=await r.text(),j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){var e=new Error((j&&j.message)||('서버 오류 (HTTP '+r.status+')'));e.code=j&&j.message;throw e}
  return j;
}
function toast(t){var el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show')},2200)}

/* 날짜 */
var TODAY=(function(){var d=new Date();d.setHours(0,0,0,0);return d})();
function pd(s){if(!s||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;var d=new Date(s+'T00:00:00');return isNaN(d)?null:d}
function dot(s){var d=pd(s);return d?d.getFullYear()+'.'+(d.getMonth()+1)+'.'+d.getDate()+'.':(s||'')}
function fmt(d){return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')}
function ym(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
// 사업자등록번호 검증 (국세청 검증 규칙) — 회원사 로그인·관리 화면 등록에 함께 씀
function bizValid(d){if(!/^\d{10}$/.test(d))return false;var w=[1,3,7,1,3,7,1,3,5],s=0;for(var i=0;i<9;i++)s+=d[i]*w[i];s+=Math.floor(d[8]*5/10);return (10-s%10)%10===+d[9]}
function prep(o){
  o.dt=pd(o.date);
  if(!o.dt){o.s='tbd';o.sl='미확정';o.dd=o.status||'시행일 미정';o.diff=99999}
  else{var diff=Math.round((o.dt-TODAY)/864e5);o.diff=diff;
    if(diff<=0){o.s='done';o.sl='시행 중';o.dd='시행 중'}
    else if(diff<=60){o.s='soon';o.sl='곧 시행';o.dd='D-'+diff}
    else{o.s='plan';o.sl='시행예정';o.dd='D-'+diff}}
  return o;
}

/* 회사 정보(프로필)와 해당 여부 */
var SIZES=[['u5','5인 미만'],['5-49','5~49인'],['50-299','50~299인'],['300-499','300~499인'],['500+','500인 이상']];
var SIZE_MIN={'u5':1,'5-49':5,'50-299':50,'300-499':300,'500+':500};
var FLAGS=[['construction','건설업','건설업'],['foreign','외국인 근로자 고용','외국인 고용'],['subcontract','도급·하청을 주는 사업','도급 사업']];
var CONDS=['건설업','외국인 고용','도급 사업','500인 이상'];
var CATS=['근로시간·휴가','모성·육아','임금·퇴직','산업안전','4대보험·연금','외국인 고용','건설업','개인정보','제도·기타'];
var KINDS=['공포','시행','입법예고','행정예고','고시·지침','판례·해석','정책·발표'];
var KC={'공포':'#1F3864','시행':'#2f9e44','입법예고':'#e8590c','행정예고':'#f08c00','고시·지침':'#0b7285','판례·해석':'#7048e8','정책·발표':'#495057'};
function applies(o,P){
  P=P||{};
  if(o.cond==='건설업'&&!P.construction)return false;
  if(o.cond==='외국인 고용'&&!P.foreign)return false;
  if(o.cond==='도급 사업'&&!P.subcontract)return false;
  if(o.cond==='500인 이상'&&P.size!=='500+')return false;
  if(o.min_size&&P.size&&(SIZE_MIN[P.size]||0)<Number(o.min_size))return false;
  return true;
}
function profileText(P){
  P=P||{};var s=(SIZES.find(function(x){return x[0]===P.size})||[,'규모 미입력'])[1];
  var f=FLAGS.filter(function(x){return P[x[0]]}).map(function(x){return x[2]});
  return [s].concat(f.length?f:['건설·외국인·도급 해당 없음']);
}

/* 개정사항 상세 */
// 줄 단위 글을 목록·소제목으로 정리하고, 짧은 괄호 안 글은 줄이 바뀌어도 쪼개지지 않게 묶음
function nbParen(h){return h.replace(/\(([^()]{1,18})\)/g,'<span class="nw">($1)</span>')}
function richText(t){
  var ls=String(t||'').split('\n').map(function(x){return x.trim()}).filter(Boolean),h='',inList=false;
  ls.forEach(function(x){
    var b=/^[•·\-▪]\s*/.test(x);
    if(b){if(!inList){h+='<ul class="rl">';inList=true}h+='<li>'+nbParen(esc(x.replace(/^[•·\-▪]\s*/,'')))+'</li>';return}
    if(inList){h+='</ul>';inList=false}
    var m=x.match(/^\[([^\]]{1,12})\]\s*(.*)$/);
    if(m&&!m[2])h+='<div class="rh">'+esc(m[1])+'</div>';
    else h+='<p>'+nbParen(esc(x))+'</p>';
  });
  if(inList)h+='</ul>';
  return h||'<p class="none">—</p>';
}
var TALK_NOTE='세부 자료 필요 시 업무톡으로 요청해주세요';
// 관련 서식·자료: 한 줄에 「[구분] 제목 | https://주소」 형식이면 링크로 표시
function formsHtml(t,plain){
  var ls=String(t||'').split('\n').map(function(x){return x.trim()}).filter(Boolean),links=0;
  var h=ls.map(function(x){
    var url='',m=x.match(/https?:\/\/\S+/);if(m){url=m[0];x=x.replace(m[0],'').replace(/\s*\|\s*$/,'').replace(/\s*\|\s*/,' ').trim()}
    var lab='',k=x.match(/^\[([^\]]{1,12})\]\s*(.*)$/);if(k){lab=k[1];x=k[2]}
    var txt=nbParen(esc(x||url));
    var body=url&&!plain&&okUrl(url)?(links++,'<a class="flink" href="'+esc(url)+'" target="_blank" rel="noopener">'+txt+'<i>↗</i></a>'):'<span>'+txt+'</span>';
    return '<li>'+(lab?'<b class="flab">'+esc(lab)+'</b>':'')+body+'</li>';
  }).join('');
  // 양식은 없거나 올리지 못한 경우가 있어, 링크가 있어도 업무톡 요청 안내는 항상 표시
  return (h?'<ul class="fl">'+h+'</ul>':'')+'<div class="talk">💬 '+TALK_NOTE+'</div>';
}
function detailHtml(o){
  // 공공기관 문서표 형식: 왼쪽 항목명 + 오른쪽 내용
  return '<table class="dtab"><tbody>'+
    (o.article?'<tr><th scope="row">근거 조문</th><td class="dart">'+nbParen(esc(o.article)).replace(/\n/g,'<br>')+'</td></tr>':'')+
    '<tr><th scope="row">개정 내용</th><td class="dcmp"><div class="cmp2">'+
      '<div class="cbef"><div class="clab">개정 전</div>'+richText(o.before)+'</div>'+
      '<div class="caft"><div class="clab">개정 후</div>'+richText(o.after)+'</div>'+
    '</div></td></tr>'+
    '<tr><th scope="row">실무상 유의사항</th><td class="dtip">'+richText(o.tips)+'</td></tr>'+
    '<tr><th scope="row">관련 서식·자료</th><td class="dfrm">'+formsHtml(o.forms)+'</td></tr>'+
  '</tbody></table>';
}
function tagsHtml(o){
  return (o.cond?'<span class="tag c">'+esc(o.cond)+' 해당</span>':'')+(o.rules?'<span class="tag r">취업규칙 개정</span>':'')+(o.ref?'<span class="tag">참고</span>':'');
}
function bulletList(t){var ls=String(t||'').split('\n').map(function(x){return x.replace(/^\s*[•·\-]\s*/,'').trim()}).filter(Boolean);return ls.length?'<ul class="bl">'+ls.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':''}

/* ===== 인쇄·PDF (요약표 / 자세히) ===== */
function printDialog(opt,mode){
  // opt: {who, mineItems, allItems, checks, mineLabel} — 화면 미리보기 후 인쇄·PDF 저장
  var old=document.getElementById('prPrev');if(old)old.remove();
  var hasMine=opt.mineItems&&opt.mineItems.length!==opt.allItems.length;
  var S={scope:hasMine&&!opt.allFirst?'mine':'all',mode:mode||'sum'};
  var d=document.createElement('div');d.id='prPrev';d.className='ppv';
  d.innerHTML='<div class="ppbar"><div class="ppin"><b class="ppt">🖨 미리보기</b>'+
    (hasMine?'<div class="ppseg" data-k="scope"><button data-v="mine">'+esc(opt.mineLabel||'우리 회사 해당')+' '+opt.mineItems.length+'건</button><button data-v="all">전체 '+opt.allItems.length+'건</button></div>':'')+
    '<div class="ppseg" data-k="mode"><button data-v="sum">📋 요약본</button><button data-v="det">📄 상세본</button></div>'+
    '<span class="ppsp"></span><button class="btn pri" data-go>🖨 인쇄 · PDF 저장</button><button class="btn" data-x>닫기</button></div>'+
    '<div class="ppnote">「인쇄 · PDF 저장」을 누르면 인쇄 창이 열립니다. 대상(프린터)을 <b>「PDF로 저장」</b>으로 고르면 PDF 파일이 됩니다.</div></div>'+
    '<div class="ppscroll"><div class="ppaper pdoc"></div></div>';
  document.body.appendChild(d);document.body.classList.add('ppopen');
  var paper=d.querySelector('.ppaper');
  var cur=function(){return S.scope==='mine'?opt.mineItems:opt.allItems};
  var lab=function(){return S.scope==='mine'?(opt.mineLabel||'우리 회사 해당'):'전체'};
  var draw=function(){
    d.querySelectorAll('.ppseg').forEach(function(sg){sg.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x.dataset.v===S[sg.dataset.k])})});
    paper.innerHTML=printHtml(cur(),S.mode,opt.who,opt.checks||{},lab());d.querySelector('.ppscroll').scrollTop=0};
  d.querySelectorAll('.ppseg').forEach(function(sg){sg.onclick=function(e){var b=e.target.closest('button');if(!b)return;S[sg.dataset.k]=b.dataset.v;draw()}});
  var close=function(){d.remove();document.body.classList.remove('ppopen');document.removeEventListener('keydown',esc_)};
  var esc_=function(e){if(e.key==='Escape')close()};document.addEventListener('keydown',esc_);
  d.querySelector('[data-x]').onclick=close;
  d.querySelector('[data-go]').onclick=function(){printDoc(cur(),S.mode,opt.who,opt.checks||{},lab())};
  var fit=function(){paper.style.zoom='';var w=d.querySelector('.ppscroll').clientWidth-24,pw=paper.offsetWidth;paper.style.zoom=pw>w?(w/pw).toFixed(3):''};
  window.addEventListener('resize',fit);
  var close0=close;close=function(){window.removeEventListener('resize',fit);close0()};d.querySelector('[data-x]').onclick=close;
  draw();fit();
}
function printHtml(items,mode,who,checks,scopeLabel){
  var stc={done:'#868e96',soon:'#d9480f',plan:'#1971c2',tbd:'#7048e8'};
  var mark=function(o){var c=checks['item:'+o.no];return c==='done'?'✓ 완료':c==='na'?'해당없음':c==='ask'?'상담요청':'☐'};
  var h='<div class="pcov"><img src="logo.png" alt=""><div><div class="pbr">NOMU GROUP JINO · 회원사 전용</div><h1>'+esc(SET.period)+' 노동관계법령 개정 안내 '+(mode==='sum'?'(요약)':'(상세)')+'</h1>'+
    '<div class="pmt">'+(who?esc(who)+' · ':'')+esc(scopeLabel)+' '+items.length+'건 · 출력일 '+fmt(TODAY)+' · 법령 조사 기준일 '+esc(SET.basis)+' (이후 변경은 월별 업데이트 참고)</div></div></div>';
  if(mode==='sum'){
    h+='<table class="ptb"><colgroup><col style="width:13%"><col style="width:17%"><col style="width:36%"><col style="width:26%"><col style="width:8%"></colgroup><thead><tr><th>시행일</th><th>법령</th><th>주요 내용</th><th>회사가 할 일</th><th>확인</th></tr></thead><tbody>'+
      items.map(function(o){return '<tr><td class="c"><b>'+(o.dt?fmt(o.dt):'미정')+'</b><br><span class="pst" style="background:'+(stc[o.s]||'#1971c2')+'">'+esc(o.sl)+'</span></td><td>'+esc(o.law)+(o.cond?'<br><span class="pcd">'+esc(o.cond)+' 해당</span>':'')+(o.rules?'<br><span class="prl">취업규칙 개정</span>':'')+'</td><td>'+esc(o.summary)+'</td><td>'+esc(o.action)+'</td><td class="c">'+mark(o)+'</td></tr>'}).join('')+'</tbody></table>';
  }else{
    h+=items.map(function(o){
      var cat=(o.cats||[])[0];
      return '<div class="pdc">'+
        '<div class="pdh"><b class="pdd">'+(o.dt?fmt(o.dt):'시행일 미정')+'</b><span class="pst" style="background:'+(stc[o.s]||'#1971c2')+'">'+esc(o.sl)+'</span>'+
          (cat?'<span class="pcat">'+esc(cat)+'</span>':'')+'<span class="plaw">'+esc(o.law)+'</span>'+
          (o.cond?'<span class="ptag">'+esc(o.cond)+' 해당</span>':'')+(o.rules?'<span class="ptag r">취업규칙 개정</span>':'')+
          '<span class="pmk">확인 '+mark(o)+'</span></div>'+
        '<div class="pdb"><div class="psm">'+esc(o.summary)+'</div><div class="pac"><b>회사가 할 일</b>'+esc(o.action)+'</div>'+
        '<table class="pdt"><colgroup><col style="width:17%"><col></colgroup><tbody>'+
          (o.article?'<tr><th>근거 조문</th><td class="part">'+nbParen(esc(o.article)).replace(/\n/g,'<br>')+'</td></tr>':'')+
          '<tr><th>개정 내용</th><td class="pcmp"><div class="pc2"><div class="pcb"><span class="plb">개정 전</span>'+richText(o.before)+'</div><div class="pca"><span class="plb a">개정 후</span>'+richText(o.after)+'</div></div></td></tr>'+
          '<tr><th>실무상 유의사항</th><td>'+richText(o.tips)+'</td></tr>'+
          '<tr><th>관련 서식·자료</th><td>'+formsHtml(o.forms,true)+'</td></tr>'+
        '</tbody></table></div></div>'}).join('');
  }
  if(!items.length)h+='<p style="padding:30px;text-align:center;color:#5b6577">해당 항목이 없습니다.</p>';
  h+='<div class="pft">노무그룹지노 · 용산센트럴파크타워 업무동 1003호 · 문의 02-6080-8558 · timetodh@naver.com · www.jinolabor.com — 본 자료는 회원사 전용으로 제공되며 외부 배포를 삼가 주시기 바랍니다.</div>';
  return h;
}
function printDoc(items,mode,who,checks,scopeLabel){
  var root=document.getElementById('printroot');if(!root){root=document.createElement('div');root.id='printroot';document.body.appendChild(root)}
  root.className='pdoc';root.innerHTML=printHtml(items,mode,who,checks,scopeLabel);
  document.body.classList.add('printing');
  var done=function(){document.body.classList.remove('printing');window.removeEventListener('afterprint',done)};
  window.addEventListener('afterprint',done);
  var im=root.querySelector('img');var go=function(){setTimeout(function(){window.print()},60)};
  if(im&&!im.complete){im.onload=go;im.onerror=go}else go();
}
