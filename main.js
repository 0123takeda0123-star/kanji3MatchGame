'use strict';
const settingsDiv = document.getElementById("settings");
const gameDiv = document.getElementById("game");
const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");
const restartBtn = document.getElementById("restartBtn");
const board = document.getElementById("board");
const stock = document.getElementById("stock");
let message = document.getElementById("message");

const gradeChecks = Array.from(document.querySelectorAll('.gradeChk'));
const bushuRadios = Array.from(document.querySelectorAll('.bushuRadio'));

const stockLimit = 7;
const tileSize = 50;
const gap = 4;
const fixedCols = 6;
const tileCopies = 3;

let currentSettings = null;
let stockTiles = [];
let clearedTypes = 0;
let totalTypes = 0;
let gameActive = false;
let slotPositions = [];


// --- 学年と部首の排他選択 ---
gradeChecks.forEach(ch => {
  ch.addEventListener('change', () => {
    if (gradeChecks.some(c => c.checked)) bushuRadios.forEach(r => r.checked=false);
  });
});
bushuRadios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) gradeChecks.forEach(c => c.checked=false);
  });
});

// --- スタート ---
startBtn.addEventListener('click', () => {
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  const selectedGrades = gradeChecks.filter(c=>c.checked).map(c=>c.value);
  const selectedBushu = bushuRadios.find(r=>r.checked)?.value || null;
  if (!selectedBushu && selectedGrades.length===0) { alert("学年または部首を選んでください。"); return; }
  currentSettings = { difficulty, grades: selectedGrades, bushu: selectedBushu };
  document.querySelector("h1").style.display = "none";
  settingsDiv.style.display='none'; 
  gameDiv.style.display='block';
  startGame(currentSettings);
});

// --- 戻る / リスタート ---
backBtn.addEventListener('click',()=>{ 
  gameActive = false;
  gameDiv.style.display='none'; 
  settingsDiv.style.display='block';
  document.querySelector("h1").style.display = "block";
});

restartBtn.addEventListener('click',()=>{
  startGame(currentSettings);
});

// --- ゲーム本体 ---
function startGame(settings){
  const pool = settings.bushu ? (kanjiSets[settings.bushu]||[]) 
                               : settings.grades.flatMap(g=>kanjiSets[g]||[]);
  if(!pool || pool.length===0){ alert("選択に該当する漢字がありません。"); return; }
  gameActive = true;
  const rows = {easy:5, medium:6, hard:7}[settings.difficulty]||5;
  const totalTiles = rows*fixedCols;
  const numChars = Math.max(1, Math.floor(totalTiles/tileCopies));
  totalTypes=numChars; clearedTypes=0;
  initGame(pool, rows, fixedCols, numChars);
}

function initGame(pool, rows, cols, numChars){
  board.innerHTML = "";
  const msg = document.createElement("div");
  msg.id = "message";
  board.appendChild(msg);
  message = msg; // ← 新しい message 要素を再取得

  stock.innerHTML = "";
  stock.style.width = (stockLimit * (tileSize + gap) - gap) + "px";
  restartBtn.style.display = "none";
  message.textContent = "";
  message.style.display = "none";
  stockTiles = [];


  board.style.width=(cols*(tileSize+gap)-gap)+"px";
  board.style.height=(rows*(tileSize+gap)-gap)+"px";

  let chars=[], copyPool=[...pool];
  for(let i=0;i<numChars;i++){
    if(copyPool.length===0) copyPool=[...pool];
    let idx=Math.floor(Math.random()*copyPool.length);
    chars.push(copyPool.splice(idx,1)[0]);
  }

  let tiles=[];
  chars.forEach(c=>{ for(let i=0;i<tileCopies;i++) tiles.push(c); });
  for(let i=tiles.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [tiles[i],tiles[j]]=[tiles[j],tiles[i]]; }

  tiles.forEach((char,index)=>{
    const div=document.createElement("div");
    div.className="tile"; div.textContent=char;
    const row=Math.floor(index/cols), col=index%cols;
    div.style.left=(col*(tileSize+gap))+"px"; div.style.top=(row*(tileSize+gap))+"px";
    div.addEventListener("click", (e) => pickTile(div, char, e));
    board.appendChild(div);
  });

  slotPositions=[];
  for(let i=0;i<stockLimit;i++){
    const slot=document.createElement("div");
    slot.className="stock-slot";
    slot.style.left=(i*(tileSize+gap))+"px";
    stock.appendChild(slot);
    slotPositions.push(slot);
  }
}

function pickTile(tileDiv, char, e){
  if(tileDiv.style.pointerEvents === "none") return;
  if(!gameActive) return;
  if(stockTiles.length >= stockLimit) return;

  stockTiles.push(char);

  const emptySlot = slotPositions.find(s => !s.textContent);
  if(emptySlot) emptySlot.textContent = char;

  // タイル消える演出
tileDiv.style.pointerEvents = "none";
tileDiv.style.transform = "scale(1.5) rotate(10deg)";
tileDiv.style.opacity = "0";

  // --- クリック座標を保持（タッチ対応も含む）---
  const rect = board.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  const clickX = clientX - rect.left;
  const clickY = clientY - rect.top;

  setTimeout(() => {
  tileDiv.remove();
    tileDiv.style.transform = ""; 
    tileDiv.style.opacity = "1";

    const count = stockTiles.filter(c => c === char).length;
    if(count === 3){
      stockTiles = stockTiles.filter(c => c !== char);
      slotPositions.forEach(s => { if(s.textContent === char) s.textContent = ""; });
      clearedTypes++;

      // --- 修正：クリック位置でエフェクト発生 ---
      tilePopEffect(clickX, clickY);

      // --- クリア判定 ---
      if(clearedTypes >= totalTypes){
        message.textContent = "クリア！";
        message.style.display = "block";
        restartBtn.style.display = "inline-block";
        backBtn.style.display = "inline-block";
        showCelebration("⭐");
        gameActive = false;
        return;
      }
    }

    // --- ゲームオーバー判定 ---
    if(stockTiles.length >= stockLimit){
      message.textContent = "ゲームオーバー！";
      message.style.display = "block";
      restartBtn.style.display = "inline-block";
      backBtn.style.display = "inline-block";
      showCelebration("😢");
      gameActive = false;
      return;
    }
  }, 200);
}

function tilePopEffect(x,y){
  const symbols=["⭐","💖","✨"];
  for(let i=0;i<5;i++){
    const p=document.createElement("div");
    p.textContent=symbols[Math.floor(Math.random()*symbols.length)];
    p.style.position="absolute";
    p.style.left=x+(Math.random()*20-10)+"px";
    p.style.top=y+(Math.random()*20-10)+"px";
    p.style.fontSize=(12+Math.random()*20)+"px";
    p.style.transition="transform 0.5s ease,opacity 0.5s ease";
    p.style.pointerEvents="none";
    board.appendChild(p);
    setTimeout(()=>{ p.style.transform=`translateY(-20px) rotate(${Math.random()*360}deg) scale(1.2)`; p.style.opacity=0; },50);
    setTimeout(()=>p.remove(),800+Math.random()*400);
  }
}

function showCelebration(emoji){
  for(let i=0;i<10;i++){
    const e=document.createElement("div");
    e.textContent=emoji;
    e.style.position="absolute";
    e.style.left=Math.random()*board.clientWidth+"px";
    e.style.top=Math.random()*board.clientHeight+"px";
    e.style.fontSize=Math.floor(Math.random()*24+16)+"px";
    e.style.opacity=0.8;
    board.appendChild(e);
    setTimeout(()=>{ e.style.transform=`translateY(-30px) rotate(${Math.random()*360}deg) scale(1.5)`; },50);
    setTimeout(()=>e.remove(),1200);
  }
}