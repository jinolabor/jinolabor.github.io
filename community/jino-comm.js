/* TEAM JINO 커뮤니티 (JinoComm) 모듈 — 주소록(address/)의 「TEAM JINO 커뮤니티」 탭이 불러 씁니다. 여기만 고치면 됩니다. */
/* ===== JinoComm 모듈 시작 =====
   TEAM JINO 커뮤니티: 「함께 했던 시간」(장소·사진·지도·후기) + 「오늘의 한마디」(이름/익명)
   다른 프로그램(주소록 등)에 붙일 때는 이 블록과 jc- 스타일 블록을 그대로 옮기고, 로그인 뒤에 한 줄만 부르면 됩니다.
     JinoComm.init({ mount:붙일 요소, rpc:서버 함수 호출(fn,args), rawKey:팀 열쇠(Uint8Array), me:{id,name,is_master}, kakaoKey:'카카오 JavaScript 키', toast:알림 함수 });
     JinoComm.stop();   // 잠글 때
   서버 함수는 comm_ 로, 저장 키는 jino-comm- 으로 시작합니다. 내용과 사진은 팀 열쇠로 암호화해 저장합니다. */
(function(){
"use strict";
var CATS=['식당','카페','배달','여행·나들이','숙소','행사·워크숍','기타'];
var GROUP_CAT={FD6:'식당',CE7:'카페',AT1:'여행·나들이',CT1:'여행·나들이',AD5:'숙소'};
var WD=['일','월','화','수','목','금','토'];
var PAGE=12, WORD_MAX=300, REVIEW_MAX=500, BODY_MAX=3000, PHOTO_MAX=40;
var S=null, timer=null;

function fresh(){return {rpc:null,key:null,me:null,root:null,kakaoKey:'',toast:null,trips:[],words:[],notes:{},view:'trip',cat:'',year:'',place:null,shown:PAGE,covers:{},coverAsked:{},urls:[],map:null,markers:[],mapState:'',busy:false,anon:false,gen:0}}
var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var unb64=function(s){return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0)})};
function b64(u){var s='';for(var i=0;i<u.length;i+=8192)s+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s)}
function hex(n){var a=crypto.getRandomValues(new Uint8Array(n));return Array.from(a,function(x){return x.toString(16).padStart(2,'0')}).join('')}
function newKey(p){return p+'_'+hex(8)}
async function deriveKey(raw){var base=await crypto.subtle.importKey('raw',raw,'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:new TextEncoder().encode('jino-comm'),info:new TextEncoder().encode('jino-comm-v1')},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function encBytes(u8){var iv=crypto.getRandomValues(new Uint8Array(12));var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},S.key,u8);return {iv:b64(iv),data:b64(new Uint8Array(ct))}}
async function decBytes(iv,d){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},S.key,unb64(d)))}
function enc(obj){return encBytes(new TextEncoder().encode(JSON.stringify(obj)))}
async function dec(iv,d){return JSON.parse(new TextDecoder().decode(await decBytes(iv,d)))}
function $(sel){return S.root.querySelector(sel)}
function say(msg){if(S&&S.toast)S.toast(msg);else window.alert(msg)}
function stat(t,warn){var e=$('.jc-stat');if(e){e.textContent=t;e.classList.toggle('jc-warn',!!warn)}}
function hm(d){return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0')}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmtDay(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return s||'';var d=new Date(+m[1],+m[2]-1,+m[3]);return m[1]+'. '+(+m[2])+'. '+(+m[3])+'. ('+WD[d.getDay()]+')'}
function fmtStamp(iso){var d=new Date(iso);return isNaN(d)?'':d.getFullYear()+'. '+(d.getMonth()+1)+'. '+d.getDate()+'.'}
function starsHtml(n){n=Math.max(0,Math.min(5,Math.round(n||0)));return '<span class="jc-stars" aria-label="별 '+n+'개">'+'★'.repeat(n)+'<i>'+'★'.repeat(5-n)+'</i></span>'}
function rating(key){var ns=(S.notes[key]||[]).filter(function(n){return n.c&&n.c.stars>0}),sum=0;ns.forEach(function(n){sum+=n.c.stars});return {n:ns.length,avg:ns.length?sum/ns.length:0}}
function myNote(key){return (S.notes[key]||[]).find(function(n){return n.mine})||null}
function blobUrl(u8){var u=URL.createObjectURL(new Blob([u8],{type:'image/jpeg'}));S.urls.push(u);return u}

/* 익명 글을 쓴 기기만 지울 수 있도록, 글마다 만든 확인값을 이 브라우저에만 보관합니다. */
function secrets(){try{return JSON.parse(localStorage.getItem('jino-comm-secrets')||'{}')||{}}catch(e){return {}}}
function keepSecret(k,v){try{var s=secrets();if(v)s[k]=v;else delete s[k];localStorage.setItem('jino-comm-secrets',JSON.stringify(s))}catch(e){}}
function pref(k,v){try{if(v===undefined)return localStorage.getItem('jino-comm-'+k);localStorage.setItem('jino-comm-'+k,v)}catch(e){return null}}

/* ---------- 틀 ---------- */
function skeleton(){
  S.root.innerHTML='<div class="jc">'
  +'<div class="jc-tabs"><button class="jc-tab on" data-act="view" data-v="trip">함께 했던 시간</button><button class="jc-tab" data-act="view" data-v="word">오늘의 한마디</button><span class="jc-sp"></span><span class="jc-stat" role="status"></span><button class="jc-btn jc-sm" data-act="reload">새로고침</button></div>'
  +'<section class="jc-sec-trip">'
  +'<div class="jc-mapwrap"><div class="jc-map" hidden></div><div class="jc-mapnote"></div></div>'
  +'<div class="jc-bar"><div class="jc-chips"></div><select class="jc-year" aria-label="연도"></select><span class="jc-placebox"></span><span class="jc-count"></span><span class="jc-sp"></span><button class="jc-btn jc-primary" data-act="new-trip">기록 남기기</button></div>'
  +'<div class="jc-grid"></div><div class="jc-more" hidden><button class="jc-btn" data-act="more">더 보기</button></div>'
  +'</section>'
  +'<section class="jc-sec-word" hidden>'
  +'<div class="jc-compose"><textarea class="jc-wtext" maxlength="'+WORD_MAX+'" placeholder="가끔 남기고 싶은 말을 편하게 적어 주세요."></textarea>'
  +'<div class="jc-crow"><div class="jc-seg" role="group" aria-label="이름 표시"><button data-act="anon" data-v="0">내 이름으로</button><button data-act="anon" data-v="1">익명으로</button></div><span class="jc-hint jc-anonhint"></span><span class="jc-sp"></span><span class="jc-len">0 / '+WORD_MAX+'</span><button class="jc-btn jc-primary" data-act="post-word">남기기</button></div></div>'
  +'<div class="jc-wall"></div>'
  +'</section>'
  +'<div class="jc-modal-root"></div><div class="jc-lb-root"></div></div>';
  S.root.firstChild.addEventListener('click',onClick);
  $('.jc-year').addEventListener('change',function(){S.year=this.value;S.shown=PAGE;S.place=null;renderTrips(true)});
  $('.jc-wtext').addEventListener('input',function(){$('.jc-len').textContent=this.value.length+' / '+WORD_MAX});
  setAnon(pref('anon')==='1');
}
function setView(v){S.view=v;S.root.querySelectorAll('.jc-tab').forEach(function(b){b.classList.toggle('on',b.dataset.v===v)});$('.jc-sec-trip').hidden=v!=='trip';$('.jc-sec-word').hidden=v!=='word';pref('view',v);if(v==='trip'&&S.map){S.map.relayout();drawPins(true)}}
function setAnon(on){S.anon=!!on;S.root.querySelectorAll('.jc-seg [data-act=anon]').forEach(function(b){b.setAttribute('aria-pressed',String((b.dataset.v==='1')===S.anon))});
  $('.jc-anonhint').textContent=S.anon?'익명 글은 누가 썼는지 서버에도 남기지 않습니다. 그래서 글을 쓴 이 기기에서만 지울 수 있습니다.':S.me.name+' 님 이름으로 남깁니다.';pref('anon',S.anon?'1':'0')}

/* ---------- 불러오기 ---------- */
async function load(quiet){
  if(!S||S.busy)return;var g=S.gen;if(!quiet)stat('불러오는 중…');
  try{
    var rows=await S.rpc('comm_list'),trips=[],words=[],notes={},fail=0;if(!S||S.gen!==g)return;
    for(var i=0;i<rows.length;i++){var r=rows[i];try{r.c=await dec(r.iv,r.data)}catch(e){fail++;continue}
      if(r.kind==='trip')trips.push(r);else if(r.kind==='word')words.push(r);else(notes[r.parent]=notes[r.parent]||[]).push(r)}
    if(!S||S.gen!==g)return;
    trips.sort(function(a,b){return (b.c.date||'').localeCompare(a.c.date||'')||String(b.created_at).localeCompare(String(a.created_at))});
    words.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at))});
    S.trips=trips;S.words=words;S.notes=notes;
    stat('연결됨 · '+hm(new Date())+' 기준'+(fail?' · 열지 못한 글 '+fail+'건':''),!!fail);
    renderTrips(false);renderWords();
  }catch(e){if(S&&S.gen===g){stat('불러오지 못했습니다',true);if(!quiet)say((e&&e.message)||'불러오지 못했습니다.')}}
}

/* ---------- 함께 했던 시간: 목록 ---------- */
function filtered(){return S.trips.filter(function(t){return (!S.cat||t.c.cat===S.cat)&&(!S.year||(t.c.date||'').slice(0,4)===S.year)&&(!S.place||S.place.keys.indexOf(t.key)>=0)})}
function renderTrips(refit){
  var years={};S.trips.forEach(function(t){var y=(t.c.date||'').slice(0,4);if(y)years[y]=1});
  var ys=Object.keys(years).sort().reverse();if(S.year&&!years[S.year])S.year='';
  $('.jc-year').innerHTML='<option value="">전체 연도</option>'+ys.map(function(y){return '<option value="'+y+'"'+(y===S.year?' selected':'')+'>'+y+'년</option>'}).join('');
  $('.jc-chips').innerHTML=[''].concat(CATS).map(function(c){return '<button class="jc-chipbtn" data-act="cat" data-v="'+esc(c)+'" aria-pressed="'+(c===S.cat)+'">'+(c||'전체')+'</button>'}).join('');
  $('.jc-placebox').innerHTML=S.place?'<span class="jc-placefilter">'+esc(S.place.name)+'<button data-act="clear-place" aria-label="장소 선택 풀기">×</button></span>':'';
  var list=filtered(),show=list.slice(0,S.shown);
  $('.jc-count').textContent=S.trips.length?'기록 '+list.length+'건':'';
  $('.jc-grid').innerHTML=show.length?show.map(card).join(''):'<div class="jc-empty" style="grid-column:1/-1"><b>'+(S.trips.length?'조건에 맞는 기록이 없습니다':'아직 남긴 기록이 없습니다')+'</b>'+(S.trips.length?'구분이나 연도를 바꿔 보세요.':'함께 다녀온 식당, 여행지, 워크숍을 사진과 함께 남겨 보세요.')+'</div>';
  $('.jc-more').hidden=list.length<=S.shown;
  askCovers(show);drawPins(refit!==false);
}
function card(t){var c=t.c,n=(S.notes[t.key]||[]).length,cv=S.covers[t.key],rt=rating(t.key);
  return '<div class="jc-card" role="button" tabindex="0" data-act="open" data-key="'+t.key+'"><div class="jc-cover" data-cover="'+t.key+'">'+(cv?'<img alt="" src="'+cv+'">':'<span class="jc-ph">'+esc(c.cat||'기록')+'</span>')+(t.photos?'<span class="jc-pcount">사진 '+t.photos+'</span>':'')+'</div>'
    +'<div class="jc-cbody"><div class="jc-meta"><span>'+esc(fmtDay(c.date))+'</span>'+(c.cat?'<span class="jc-tag">'+esc(c.cat)+'</span>':'')+'</div>'
    +'<h3>'+esc(c.place&&c.place.name||'')+'</h3>'+(c.title?'<div class="jc-ev">'+esc(c.title)+'</div>':'')+(c.body?'<p class="jc-ex">'+esc(c.body)+'</p>':'')
    +'<div class="jc-cfoot">'+(rt.n?'<span class="jc-stars">★</span> <b>'+rt.avg.toFixed(1)+'</b> ('+rt.n+'명) · ':'')+esc(t.owner_name||'')+(n?' · 후기 '+n:'')+'</div></div></div>'}
async function askCovers(list){
  var need=list.filter(function(t){return t.photos>0&&!S.covers[t.key]&&!S.coverAsked[t.key]}).map(function(t){return t.key});if(!need.length)return;
  need.forEach(function(k){S.coverAsked[k]=1});var g=S.gen;
  try{var rows=await S.rpc('comm_photo_thumbs',{p_parents:need,p_first_only:true});
    for(var i=0;i<rows.length;i++){var u8=await decBytes(rows[i].thumb_iv,rows[i].thumb);if(!S||S.gen!==g)return;var url=blobUrl(u8);S.covers[rows[i].parent]=url;
      var box=S.root.querySelector('[data-cover="'+rows[i].parent+'"]');if(box){var ph=box.querySelector('.jc-ph');if(ph)ph.remove();if(!box.querySelector('img')){var im=document.createElement('img');im.alt='';im.src=url;box.insertBefore(im,box.firstChild)}}}
  }catch(e){need.forEach(function(k){delete S.coverAsked[k]})}
}

/* ---------- 지도 (카카오) ---------- */
function mapLink(p){if(!p)return '';if(p.url)return p.url;if(p.lat&&p.lng)return 'https://map.kakao.com/link/map/'+encodeURIComponent(p.name||'장소')+','+p.lat+','+p.lng;return 'https://map.kakao.com/link/search/'+encodeURIComponent(((p.name||'')+' '+(p.addr||'')).trim())}
function kakaoOk(){return !!(window.kakao&&kakao.maps&&kakao.maps.services&&kakao.maps.Map)}
function loadKakao(){
  if(kakaoOk())return Promise.resolve();
  if(loadKakao.p)return loadKakao.p;
  loadKakao.p=new Promise(function(res,rej){var s=document.createElement('script');
    s.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey='+encodeURIComponent(S.kakaoKey)+'&libraries=services&autoload=false';
    s.onload=function(){try{kakao.maps.load(function(){res()})}catch(e){rej(e)}};
    s.onerror=function(){loadKakao.p=null;rej(new Error('지도를 불러오지 못했습니다'))};document.head.appendChild(s)});
  return loadKakao.p;
}
function mapNote(html){var n=$('.jc-mapnote');n.hidden=!html;n.innerHTML=html||''}
async function initMap(){
  if(!S.kakaoKey){S.mapState='nokey';mapNote('<span class="jc-pinico"></span><span><b>지도 준비 중입니다.</b><br>카카오 지도 키를 등록하면 이 자리에 다녀온 곳이 핀으로 표시됩니다. 그 전에도 기록마다 「지도에서 보기」 버튼은 쓸 수 있습니다.</span>');return}
  var g=S.gen;mapNote('<span>지도를 불러오는 중…</span>');
  try{await loadKakao();if(!S||S.gen!==g)return;
    var el=$('.jc-map');el.hidden=false;mapNote('');
    S.map=new kakao.maps.Map(el,{center:new kakao.maps.LatLng(37.5298,126.9648),level:8});
    S.map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
    S.mapState='ok';drawPins(true);
  }catch(e){if(!S||S.gen!==g)return;S.mapState='err';mapNote('<span class="jc-pinico"></span><span><b>지도를 불러오지 못했습니다.</b><br>카카오 지도 키와 등록한 사이트 주소를 확인해 주세요. 기록마다 「지도에서 보기」 버튼은 쓸 수 있습니다.</span>')}
}
function drawPins(refit){
  if(!S.map||S.mapState!=='ok'||S.view!=='trip')return;
  S.markers.forEach(function(m){m.setMap(null)});S.markers=[];
  var groups={},list=S.trips.filter(function(t){return (!S.cat||t.c.cat===S.cat)&&(!S.year||(t.c.date||'').slice(0,4)===S.year)});
  list.forEach(function(t){var p=t.c.place;if(!p||!p.lat||!p.lng)return;var k=(+p.lat).toFixed(5)+','+(+p.lng).toFixed(5);(groups[k]=groups[k]||{lat:+p.lat,lng:+p.lng,name:p.name,keys:[]}).keys.push(t.key)});
  var ks=Object.keys(groups);if(!ks.length)return;
  var b=new kakao.maps.LatLngBounds();
  ks.forEach(function(k){var gp=groups[k],pos=new kakao.maps.LatLng(gp.lat,gp.lng);b.extend(pos);
    var m=new kakao.maps.Marker({map:S.map,position:pos,title:gp.name+(gp.keys.length>1?' ('+gp.keys.length+'번)':'')});
    kakao.maps.event.addListener(m,'click',function(){if(gp.keys.length===1)openTrip(gp.keys[0]);else{S.place={name:gp.name,keys:gp.keys};S.shown=PAGE;renderTrips(false);$('.jc-bar').scrollIntoView({behavior:'smooth',block:'start'})}});
    S.markers.push(m)});
  if(refit){if(ks.length===1){S.map.setCenter(new kakao.maps.LatLng(groups[ks[0]].lat,groups[ks[0]].lng));S.map.setLevel(5)}else S.map.setBounds(b)}
}
function searchPlaces(q){return new Promise(function(res){try{new kakao.maps.services.Places().keywordSearch(q,function(data,st){res(st===kakao.maps.services.Status.OK?data:[])},{size:8})}catch(e){res([])}})}
function geocode(addr){return new Promise(function(res){try{new kakao.maps.services.Geocoder().addressSearch(addr,function(r,st){res(st===kakao.maps.services.Status.OK&&r[0]?{lat:+r[0].y,lng:+r[0].x}:null)})}catch(e){res(null)}})}

/* ---------- 창 ---------- */
function modal(title,body,act){
  var root=$('.jc-modal-root');
  root.innerHTML='<div class="jc-ov"><div class="jc-sheet" role="dialog" aria-modal="true"><h2><span>'+esc(title)+'</span><button class="jc-x" data-act="close" aria-label="닫기">×</button></h2><div class="jc-sbody">'+body+'</div>'+(act?'<div class="jc-act">'+act+'</div>':'')+'</div></div>';
  var ov=root.firstChild;ov.addEventListener('mousedown',function(e){if(e.target===ov&&!ov.dataset.lock)closeModal()});
  document.addEventListener('keydown',onEsc);return ov;
}
function onEsc(e){if(e.key!=='Escape'||!S)return;if($('.jc-lb-root').firstChild){closeLb();return}var ov=$('.jc-modal-root').firstChild;if(ov&&!ov.dataset.lock)closeModal()}
function closeModal(){if(!S)return;$('.jc-modal-root').innerHTML='';closeLb();document.removeEventListener('keydown',onEsc);S.form=null;S.detail=null}
function modalOpen(){return !!(S&&($('.jc-modal-root').firstChild||$('.jc-lb-root').firstChild))}

/* ---------- 기록 쓰기·고치기 ---------- */
function openForm(key){
  var t=key?S.trips.find(function(x){return x.key===key}):null,c=t?t.c:{date:today(),cat:'식당',place:null,title:'',body:''};
  S.form={key:key||null,rev:t?t.rev:0,place:c.place?Object.assign({},c.place):null,files:[],room:PHOTO_MAX-(t?t.photos:0),manual:!kakaoOk()||(!!c.place&&!c.place.lat)};
  var titles={};S.trips.forEach(function(x){if(x.c.title)titles[x.c.title]=1});
  var room=PHOTO_MAX-(t?t.photos:0);
  modal(t?'기록 고치기':'함께 했던 시간 남기기',
    '<div class="jc-form">'
    +'<label for="jc-f-date">날짜 <span class="jc-req">*</span></label><div class="jc-two"><input type="date" id="jc-f-date" value="'+esc(c.date||'')+'" max="2100-12-31"><select id="jc-f-cat" aria-label="구분">'+CATS.map(function(x){return '<option'+(x===c.cat?' selected':'')+'>'+x+'</option>'}).join('')+'</select></div>'
    +'<span class="jc-flb">장소 <span class="jc-req">*</span></span><div class="jc-placearea"></div>'
    +'<label for="jc-f-title">모임 이름</label><div><input id="jc-f-title" list="jc-f-titles" maxlength="60" placeholder="예: 2026 가을 워크숍, 송년회 (없으면 비워 두세요)" value="'+esc(c.title||'')+'"><datalist id="jc-f-titles">'+Object.keys(titles).map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist></div>'
    +'<label for="jc-f-body">이야기</label><textarea id="jc-f-body" maxlength="'+BODY_MAX+'" placeholder="그날 어땠는지, 무엇이 맛있었는지 적어 주세요.">'+esc(c.body||'')+'</textarea>'
    +'<span class="jc-flb">사진</span><div><input type="file" id="jc-f-files" accept="image/*" multiple hidden><button class="jc-btn" data-act="pick-files"'+(room<=0?' disabled':'')+'>사진 고르기</button> <span class="jc-hint">'+(t?'지금 '+t.photos+'장 · ':'')+'한 기록에 '+PHOTO_MAX+'장까지. 올릴 때 자동으로 줄여서 저장합니다. 복사한 사진은 이 화면에서 <b>Ctrl+V</b>로 붙여넣어도 됩니다.</span><div class="jc-previews"></div></div>'
    +'</div><div class="jc-msg" role="alert"></div>',
    '<button class="jc-btn jc-primary" data-act="save-trip">저장</button><button class="jc-btn" data-act="close">취소</button>');
  $('#jc-f-files').addEventListener('change',function(){var fs=Array.from(this.files||[]);this.value='';addFormFiles(fs)});
  drawPlaceArea();
}
function addFormFiles(fs){var f=S.form;if(!f)return;var left=f.room-f.files.length;if(fs.length>left){fs=fs.slice(0,Math.max(0,left));formMsg('사진은 한 기록에 '+PHOTO_MAX+'장까지 올릴 수 있습니다.')}
  fs.forEach(function(x){f.files.push({file:x,url:URL.createObjectURL(x)})});drawPreviews()}
function formMsg(t){var m=$('.jc-msg');if(m)m.textContent=t||''}
function drawPreviews(){$('.jc-previews').innerHTML=S.form.files.map(function(f,i){return '<span class="jc-pv"><img alt="" src="'+f.url+'"><button data-act="drop-file" data-i="'+i+'" aria-label="빼기">×</button></span>'}).join('')}
function drawPlaceArea(){
  var a=$('.jc-placearea'),p=S.form.place,can=kakaoOk();if(!a)return;
  if(S.form.manual){a.innerHTML='<div class="jc-two"><input id="jc-f-pname" maxlength="60" placeholder="장소 이름 (예: 한강진 ○○식당)" value="'+esc(p&&p.name||'')+'"><input id="jc-f-paddr" maxlength="120" placeholder="주소 (선택)" value="'+esc(p&&p.addr||'')+'"></div>'+(can?'<button class="jc-btn jc-link" data-act="place-search">지도에서 검색해 고르기</button>':'');return}
  if(p&&p.name){a.innerHTML='<div class="jc-picked"><div><b>'+esc(p.name)+'</b><small>'+esc(p.addr||'')+'</small></div><button class="jc-btn jc-sm" data-act="place-clear">다시 고르기</button></div>';return}
  a.innerHTML='<div class="jc-search"><input id="jc-f-q" placeholder="장소 이름으로 검색 (예: 용산 ○○식당)"><button class="jc-btn" data-act="place-go">검색</button></div><div class="jc-found"></div><button class="jc-btn jc-link" data-act="place-manual">직접 입력하기</button>';
  $('#jc-f-q').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();placeGo()}});
}
async function placeGo(){var q=$('#jc-f-q').value.trim(),box=$('.jc-found');if(!q)return;box.innerHTML='<span class="jc-hint">찾는 중…</span>';
  var r=await searchPlaces(q);if(!S||!S.form||!$('.jc-found'))return;S.form.found=r;
  $('.jc-found').innerHTML=r.length?'<div class="jc-results">'+r.map(function(d,i){return '<button data-act="place-pick" data-i="'+i+'"><b>'+esc(d.place_name)+'</b><small>'+esc(d.road_address_name||d.address_name||'')+(d.category_group_name?' · '+esc(d.category_group_name):'')+'</small></button>'}).join('')+'</div>':'<span class="jc-hint">찾지 못했습니다. 다른 이름으로 검색하거나 직접 입력해 주세요.</span>'}
async function loadBitmap(file){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){return await new Promise(function(res,rej){var im=new Image(),u=URL.createObjectURL(file);im.onload=function(){URL.revokeObjectURL(u);res(im)};im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('열 수 없는 사진입니다: '+file.name+' (JPG나 PNG로 바꿔 주세요)'))};im.src=u})}}
async function shrink(src,max,q){var w=src.width,h=src.height,r=Math.min(1,max/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*r));c.height=Math.max(1,Math.round(h*r));
  var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);
  var blob=await new Promise(function(res){c.toBlob(res,'image/jpeg',q)});if(!blob)throw new Error('사진을 줄이지 못했습니다');return new Uint8Array(await blob.arrayBuffer())}
async function uploadPhotos(parent,files,progress){
  var done=0,errs=[];
  for(var i=0;i<files.length;i++){if(progress)progress(i+1,files.length);
    try{var bmp=await loadBitmap(files[i].file),full=await shrink(bmp,1600,.82);if(full.length>1000000)full=await shrink(bmp,1280,.72);
      var th=await shrink(bmp,360,.7);if(bmp.close)bmp.close();
      var a=await encBytes(th),b=await encBytes(full);
      await S.rpc('comm_photo_add',{p_key:newKey('cp'),p_parent:parent,p_thumb_iv:a.iv,p_thumb:a.data,p_iv:b.iv,p_data:b.data});done++;
    }catch(e){errs.push((e&&e.message)||'사진 올리기 실패')}}
  return {done:done,errs:errs};
}
async function saveTrip(){
  var f=S.form;if(!f||S.busy)return;
  var date=$('#jc-f-date').value,cat=$('#jc-f-cat').value,title=$('#jc-f-title').value.trim(),body=$('#jc-f-body').value.trim(),p=f.place;
  if(f.manual){var nm=$('#jc-f-pname').value.trim(),ad=$('#jc-f-paddr').value.trim();
    p=nm?(p&&p.name===nm&&(p.addr||'')===ad?p:{name:nm,addr:ad}):null}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){formMsg('날짜를 넣어 주세요.');return}
  if(!p||!p.name){formMsg('장소를 넣어 주세요.');return}
  S.busy=true;var ov=$('.jc-modal-root').firstChild;ov.dataset.lock='1';var btn=ov.querySelector('[data-act=save-trip]');btn.disabled=true;btn.textContent='저장 중…';formMsg('');
  try{
    if(!p.lat&&p.addr&&kakaoOk()){var g=await geocode(p.addr);if(g){p.lat=g.lat;p.lng=g.lng}}
    var key=f.key||newKey('ct'),e=await enc({date:date,cat:cat,title:title,body:body,place:p});
    var r=await S.rpc('comm_put',{p_key:key,p_kind:'trip',p_parent:null,p_expected_rev:f.rev,p_iv:e.iv,p_data:e.data,p_anon:false,p_secret:null});
    if(r&&r.conflict){S.busy=false;closeModal();say('다른 곳에서 먼저 고쳤습니다. 최신 내용으로 다시 열어 주세요.');await load();return}
    var res={done:0,errs:[]};
    if(f.files.length)res=await uploadPhotos(key,f.files,function(i,n){btn.textContent='사진 올리는 중 '+i+' / '+n});
    f.files.forEach(function(x){URL.revokeObjectURL(x.url)});
    delete S.covers[key];delete S.coverAsked[key];
    S.busy=false;closeModal();say(res.errs.length?'저장했습니다. 다만 사진 '+res.errs.length+'장은 올리지 못했습니다 — '+res.errs[0]:'저장했습니다.');S.place=null;await load();
  }catch(err){S.busy=false;delete ov.dataset.lock;btn.disabled=false;btn.textContent='저장';formMsg((err&&err.message)||'저장하지 못했습니다.')}
}

/* ---------- 기록 보기 ---------- */
function openTrip(key){
  var t=S.trips.find(function(x){return x.key===key});if(!t)return;var c=t.c,p=c.place||{};
  S.detail={key:key,photos:null};
  modal(p.name||'기록',
    '<div class="jc-dmeta"><b>'+esc(fmtDay(c.date))+'</b>'+(c.cat?'<span class="jc-tag">'+esc(c.cat)+'</span>':'')+(c.title?'<span class="jc-ev">'+esc(c.title)+'</span>':'')+'<span>'+esc(t.owner_name||'')+' 남김</span></div>'
    +'<div class="jc-addr"><span>'+esc(p.addr||'주소를 적지 않았습니다')+'</span><a class="jc-btn jc-sm" href="'+esc(mapLink(p))+'" target="_blank" rel="noopener noreferrer">지도에서 보기</a></div>'
    +(c.body?'<p class="jc-dbody">'+esc(c.body)+'</p>':'')
    +'<div class="jc-sub">사진 <small class="jc-pinfo"></small></div><div class="jc-hint">복사한 사진은 이 화면에서 <b>Ctrl+V</b>로 붙여넣으면 바로 올라갑니다.</div><div class="jc-photos"><span class="jc-hint">'+(t.photos?'사진을 불러오는 중…':'')+'</span></div><input type="file" class="jc-addfiles" accept="image/*" multiple hidden>'
    +'<div class="jc-sub">평점·후기 <small class="jc-rsum"></small></div><div class="jc-reviews"></div>'
    +'<div class="jc-myreview"><div class="jc-starpick" role="group" aria-label="내 평점"></div><div class="jc-addreview"><textarea class="jc-rtext" maxlength="'+REVIEW_MAX+'" placeholder="후기를 남겨 주세요. (평점만 남겨도 됩니다)"></textarea><button class="jc-btn jc-primary" data-act="post-review">남기기</button></div></div>',
    (t.mine?'<button class="jc-btn jc-left" data-act="edit-trip">고치기</button>':'')+(t.mine||S.me.is_master?'<button class="jc-btn jc-danger'+(t.mine?'':' jc-left')+'" data-act="del-trip">기록 지우기</button>':'')+'<button class="jc-btn" data-act="close">닫기</button>');
  $('.jc-addfiles').addEventListener('change',function(){var fs=Array.from(this.files||[]);this.value='';addPhotosTo(key,fs)});
  drawReviews(key);loadPhotos(key);
}
async function addPhotosTo(key,list){
  var t=S.trips.find(function(x){return x.key===key}),fs=list.map(function(f){return {file:f}});if(!t||!fs.length)return;
  if(S.busy){say('앞의 작업이 끝난 뒤 다시 해 주세요.');return}
  var room=PHOTO_MAX-((S.detail&&S.detail.photos)||[]).length;if(fs.length>room){fs=fs.slice(0,Math.max(0,room));say('사진은 한 기록에 '+PHOTO_MAX+'장까지 올릴 수 있습니다.')}if(!fs.length)return;
  S.busy=true;var info=$('.jc-pinfo');var r=await uploadPhotos(key,fs,function(i,n){if(info)info.textContent='올리는 중 '+i+' / '+n});if(!S)return;S.busy=false;
  say(r.errs.length?(r.done?'사진 '+r.done+'장을 올렸고, ':'')+r.errs.length+'장은 올리지 못했습니다 — '+r.errs[0]:'사진 '+r.done+'장을 올렸습니다.');
  if(r.done){t.photos+=r.done;delete S.covers[key];delete S.coverAsked[key];if(S.detail&&S.detail.key===key)await loadPhotos(key);renderTrips(false)}
}
/* 복사한 사진을 Ctrl+V로 붙여넣기: 기록을 쓰는 중이면 고른 사진에 더하고, 기록을 보는 중이면 바로 올립니다. */
function onPaste(e){
  if(!S||!e.clipboardData)return;var imgs=[],items=e.clipboardData.items||[];
  for(var i=0;i<items.length;i++){if(items[i].kind==='file'&&/^image\//.test(items[i].type)){var f=items[i].getAsFile();if(f)imgs.push(f)}}
  if(!imgs.length)return;
  if(S.root.offsetParent===null)return;
  e.preventDefault();
  imgs=imgs.map(function(f,i){var ext=(f.type.split('/')[1]||'png').replace('jpeg','jpg');return f.name&&f.name!=='image.png'?f:new File([f],'붙여넣은 사진 '+(i+1)+'.'+ext,{type:f.type})});
  if(S.form){addFormFiles(imgs);formMsg('');say('붙여넣은 사진 '+imgs.length+'장을 더했습니다. 저장하면 올라갑니다.')}
  else if(S.detail&&!$('.jc-lb-root').firstChild)addPhotosTo(S.detail.key,imgs);
  else if(S.view==='trip')say('사진을 붙여넣으려면 기록을 열거나 「기록 남기기」 화면에서 Ctrl+V 해 주세요.');
}
async function loadPhotos(key){
  var g=S.gen;
  try{var rows=await S.rpc('comm_photo_thumbs',{p_parents:[key],p_first_only:false});
    for(var i=0;i<rows.length;i++){rows[i].url=blobUrl(await decBytes(rows[i].thumb_iv,rows[i].thumb))}
    if(!S||S.gen!==g||!S.detail||S.detail.key!==key)return;S.detail.photos=rows;drawPhotos();
  }catch(e){if(S&&S.detail&&S.detail.key===key){var b=$('.jc-photos');if(b)b.innerHTML='<span class="jc-hint">사진을 불러오지 못했습니다.</span>'}}
}
function drawPhotos(){var d=S.detail,box=$('.jc-photos');if(!d||!box)return;var ph=d.photos||[];
  var info=$('.jc-pinfo');if(info)info.textContent=ph.length?ph.length+'장 · 누르면 크게 보입니다':'아직 사진이 없습니다';
  box.innerHTML=ph.map(function(p,i){return '<button data-act="photo" data-i="'+i+'" aria-label="사진 '+(i+1)+' 크게 보기"><img alt="" src="'+p.url+'"></button>'}).join('')+(ph.length<PHOTO_MAX?'<button class="jc-addph" data-act="add-photos">+ 사진<br>더하기</button>':'')}
function drawReviews(key){var box=$('.jc-reviews');if(!box)return;var ns=(S.notes[key]||[]),rt=rating(key),sm=$('.jc-rsum');
  if(sm)sm.innerHTML=rt.n?starsHtml(rt.avg)+' <b>'+rt.avg.toFixed(1)+'</b> · '+rt.n+'명 평가':'구성원마다 평점과 후기를 하나씩 남길 수 있습니다';
  box.innerHTML=ns.length?ns.map(function(n){return '<div class="jc-review">'+(n.c.stars>0?'<div>'+starsHtml(n.c.stars)+'</div>':'')+(n.c.text?'<p>'+esc(n.c.text)+'</p>':'')+'<div class="jc-nfoot"><b>'+esc(n.owner_name||'')+'</b><span>'+esc(fmtStamp(n.created_at))+'</span>'+(n.mine?'<span>· 내 후기</span>':'')+'<span class="jc-sp"></span>'+(n.mine||S.me.is_master?'<button class="jc-btn jc-link" data-act="del-review" data-key="'+n.key+'">지우기</button>':'')+'</div></div>'}).join(''):'<div class="jc-review"><span class="jc-hint">아직 평점·후기가 없습니다. 처음으로 남겨 보세요.</span></div>';
  var d=S.detail,mine=myNote(key);if(d&&d.key===key){d.stars=mine&&mine.c.stars||0;var ta=$('.jc-rtext');if(ta)ta.value=mine&&mine.c.text||'';var b=$('[data-act=post-review]');if(b)b.textContent=mine?'고치기':'남기기';drawStarPick()}}
function drawStarPick(){var d=S.detail,box=$('.jc-starpick');if(!d||!box)return;var h='';for(var i=1;i<=5;i++)h+='<button class="jc-star'+(i<=(d.stars||0)?' on':'')+'" data-act="star" data-v="'+i+'" aria-label="별 '+i+'개" aria-pressed="'+(i===d.stars)+'">★</button>';
  box.innerHTML=h+'<span>'+(d.stars?d.stars+'점':'별을 눌러 평점을 남겨 주세요')+'</span>'}
async function postReview(){var d=S.detail,ta=$('.jc-rtext');if(!d||!ta||S.busy)return;var text=ta.value.trim(),stars=d.stars||0;if(!text&&!stars){say('평점이나 후기를 넣어 주세요.');return}S.busy=true;
  try{var mine=myNote(d.key),e=await enc({text:text,stars:stars});
    var r=await S.rpc('comm_put',{p_key:mine?mine.key:newKey('cn'),p_kind:'note',p_parent:d.key,p_expected_rev:mine?mine.rev:0,p_iv:e.iv,p_data:e.data,p_anon:false,p_secret:null});S.busy=false;
    say(r&&r.conflict?'다른 곳에서 먼저 고쳤습니다. 최신 내용을 다시 불러왔습니다.':(mine?'고쳤습니다.':'남겼습니다.'));await load(true);if(S.detail&&S.detail.key===d.key)drawReviews(d.key)}
  catch(err){S.busy=false;say((err&&err.message)||'남기지 못했습니다.')}}
async function removeDoc(key,what,after){if(S.busy||!window.confirm(what+' 지울까요? 지운 뒤에는 되돌릴 수 없습니다.'))return;S.busy=true;
  try{await S.rpc('comm_del',{p_key:key,p_secret:secrets()[key]||null});keepSecret(key,null);S.busy=false;say('지웠습니다.');if(after)after();await load(true);if(S.detail)drawReviews(S.detail.key)}
  catch(err){S.busy=false;say((err&&err.message)||'지우지 못했습니다.')}}

/* 사진 크게 보기 */
function openLb(i){var d=S.detail;if(!d||!d.photos||!d.photos[i])return;d.at=i;var p=d.photos[i],root=$('.jc-lb-root');
  root.innerHTML='<div class="jc-lb"><div class="jc-lbtop"><span>'+(i+1)+' / '+d.photos.length+(p.owner_name?' · '+esc(p.owner_name)+' 올림':'')+'</span><span class="jc-sp"></span>'+(p.can_del?'<button class="jc-btn jc-sm" data-act="del-photo">이 사진 지우기</button>':'')+'<button class="jc-btn jc-sm" data-act="lb-close">닫기</button></div>'
    +'<div class="jc-lbmain"><button class="jc-nav" data-act="lb-prev" aria-label="이전 사진"'+(i?'':' disabled')+'>‹</button><span class="jc-lbwait">불러오는 중…</span><button class="jc-nav" data-act="lb-next" aria-label="다음 사진"'+(i<d.photos.length-1?'':' disabled')+'>›</button></div></div>';
  (async function(){try{if(!p.full){var r=await S.rpc('comm_photo_get',{p_key:p.key});p.full=blobUrl(await decBytes(r.iv,r.data))}
      if(!S||!S.detail||S.detail!==d||d.at!==i)return;var w=$('.jc-lbwait');if(w){var im=document.createElement('img');im.alt='사진 '+(i+1);im.src=p.full;w.replaceWith(im)}
    }catch(e){var w2=S&&$('.jc-lbwait');if(w2)w2.textContent='사진을 불러오지 못했습니다.'}})();
}
function closeLb(){if(S)$('.jc-lb-root').innerHTML=''}
async function delPhoto(){var d=S.detail;if(!d||S.busy)return;var p=d.photos[d.at];if(!p||!window.confirm('이 사진을 지울까요?'))return;S.busy=true;
  try{await S.rpc('comm_photo_del',{p_key:p.key});S.busy=false;closeLb();d.photos.splice(d.at,1);drawPhotos();var t=S.trips.find(function(x){return x.key===d.key});if(t){t.photos=Math.max(0,t.photos-1);delete S.covers[d.key];delete S.coverAsked[d.key];renderTrips(false)}say('사진을 지웠습니다.')}
  catch(err){S.busy=false;say((err&&err.message)||'지우지 못했습니다.')}}

/* ---------- 오늘의 한마디 ---------- */
function renderWords(){var sec=secrets();
  $('.jc-wall').innerHTML=S.words.length?S.words.map(function(w){var can=w.mine||S.me.is_master||(w.anon&&sec[w.key]);
    return '<div class="jc-note'+(w.anon?' jc-anon':'')+'"><p>'+esc(w.c.text)+'</p><div class="jc-nfoot"><b>'+(w.anon?'익명':esc(w.owner_name||''))+'</b><span>'+esc(fmtStamp(w.created_at))+'</span>'+(w.anon&&sec[w.key]?'<span>· 내가 쓴 글</span>':'')+'<span class="jc-sp"></span>'+(can?'<button class="jc-btn jc-link" data-act="del-word" data-key="'+w.key+'">지우기</button>':'')+'</div></div>'}).join('')
    :'<div class="jc-empty" style="column-span:all"><b>아직 남긴 한마디가 없습니다</b>매일 쓰지 않아도 됩니다. 남기고 싶은 말이 생겼을 때 적어 주세요.</div>';
}
async function postWord(){var ta=$('.jc-wtext'),text=ta.value.trim();if(!text||S.busy)return;S.busy=true;var btn=$('[data-act=post-word]');btn.disabled=true;
  try{var key=newKey('cw'),secret=S.anon?hex(32):null,e=await enc({text:text});
    if(secret)keepSecret(key,secret);
    try{await S.rpc('comm_put',{p_key:key,p_kind:'word',p_parent:null,p_expected_rev:0,p_iv:e.iv,p_data:e.data,p_anon:S.anon,p_secret:secret})}catch(err){if(secret)keepSecret(key,null);throw err}
    S.busy=false;btn.disabled=false;ta.value='';$('.jc-len').textContent='0 / '+WORD_MAX;say(S.anon?'익명으로 남겼습니다.':'남겼습니다.');await load(true);
  }catch(err){S.busy=false;btn.disabled=false;say((err&&err.message)||'남기지 못했습니다.')}}

/* ---------- 누르기 ---------- */
function onClick(ev){
  var el=ev.target.closest('[data-act]');if(!el||!S)return;var a=el.dataset.act,f=S.form,d=S.detail;
  switch(a){
    case 'view':setView(el.dataset.v);break;
    case 'reload':load();break;
    case 'cat':S.cat=el.dataset.v;S.shown=PAGE;S.place=null;renderTrips(true);break;
    case 'clear-place':S.place=null;renderTrips(false);break;
    case 'more':S.shown+=PAGE;renderTrips(false);break;
    case 'new-trip':openForm(null);break;
    case 'open':openTrip(el.dataset.key);break;
    case 'close':if(!S.busy)closeModal();break;
    case 'pick-files':$('#jc-f-files').click();break;
    case 'drop-file':if(f){var x=f.files.splice(+el.dataset.i,1)[0];if(x)URL.revokeObjectURL(x.url);drawPreviews()}break;
    case 'place-go':placeGo();break;
    case 'place-pick':if(f&&f.found){var p=f.found[+el.dataset.i];if(p){f.place={name:p.place_name,addr:p.road_address_name||p.address_name||'',lat:+p.y,lng:+p.x,url:p.place_url||''};var c=GROUP_CAT[p.category_group_code];if(c&&!f.key)$('#jc-f-cat').value=c;drawPlaceArea()}}break;
    case 'place-clear':if(f){f.place=null;drawPlaceArea()}break;
    case 'place-manual':if(f){f.manual=true;drawPlaceArea()}break;
    case 'place-search':if(f){f.manual=false;f.place=null;drawPlaceArea()}break;
    case 'save-trip':saveTrip();break;
    case 'edit-trip':if(d){var k=d.key;closeModal();openForm(k)}break;
    case 'del-trip':if(d)removeDoc(d.key,'이 기록을 사진·후기와 함께',closeModal);break;
    case 'add-photos':$('.jc-addfiles').click();break;
    case 'photo':openLb(+el.dataset.i);break;
    case 'lb-prev':if(d&&d.at>0)openLb(d.at-1);break;
    case 'lb-next':if(d&&d.at<d.photos.length-1)openLb(d.at+1);break;
    case 'lb-close':closeLb();break;
    case 'del-photo':delPhoto();break;
    case 'star':if(d){var sv=+el.dataset.v;d.stars=d.stars===sv?0:sv;drawStarPick()}break;
    case 'post-review':postReview();break;
    case 'del-review':removeDoc(el.dataset.key,'이 후기를');break;
    case 'anon':setAnon(el.dataset.v==='1');break;
    case 'post-word':postWord();break;
    case 'del-word':removeDoc(el.dataset.key,'이 한마디를');break;
  }
}
function onKey(e){if(S&&(e.key==='Enter'||e.key===' ')&&e.target&&e.target.classList&&e.target.classList.contains('jc-card')){e.preventDefault();openTrip(e.target.dataset.key);return}
  if(!S||!S.detail||!$('.jc-lb-root').firstChild)return;if(e.key==='ArrowLeft'&&S.detail.at>0)openLb(S.detail.at-1);if(e.key==='ArrowRight'&&S.detail.at<S.detail.photos.length-1)openLb(S.detail.at+1)}

window.JinoComm={
  init:async function(o){
    if(S)this.stop();
    S=fresh();S.rpc=o.rpc;S.me=o.me;S.root=o.mount;S.kakaoKey=o.kakaoKey||'';S.toast=o.toast||null;
    S.key=await deriveKey(o.rawKey);
    skeleton();if(pref('view')==='word')setView('word');
    document.addEventListener('keydown',onKey);document.addEventListener('paste',onPaste);
    initMap();await load();
    timer=setInterval(function(){if(S&&!document.hidden&&S.root.offsetParent!==null&&!modalOpen())load(true)},120000);
  },
  reload:function(){return load()},
  stop:function(){if(!S)return;if(timer){clearInterval(timer);timer=null}document.removeEventListener('keydown',onKey);document.removeEventListener('paste',onPaste);document.removeEventListener('keydown',onEsc);S.urls.forEach(function(u){URL.revokeObjectURL(u)});S.root.innerHTML='';S.gen++;S=null}
};
})();
/* ===== JinoComm 모듈 끝 ===== */
