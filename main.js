(() => {
  'use strict';

  
  const canvas = document.getElementById('game');
  const hudScore = document.getElementById('score');
  const hudHigh = document.getElementById('highScore');
  const overlay = document.getElementById('overlay');
  const btnRestart = document.getElementById('btnRestart');
  const btnJump = document.getElementById('btnJump');
  const btnDuck = document.getElementById('btnDuck');

  
  const WORLD_W = 800;
  const WORLD_H = 300;

  
  let ctx, dpr, scale;
  let running = false, gameOver = false, paused = false;
  let lastTime = 0;
  let speed = 4.2;
  let gravity = 0.6;
  let spawnTimer = 0;
  let spawnCd = 90;
  let score = 0;
  let highScore = parseInt(localStorage.getItem('bearDinoHighScore') || '0', 10);
  hudHigh.textContent = highScore;

  
  const ground = {
    y: WORLD_H - 60,
    h: 12
  };

  
  const bear = {
    x: 90,
    y: ground.y - 56,
    w: 46,
    h: 56,
    vy: 0,
    ducking: false,
    onGround: true
  };

  
  class Obstacle {
    constructor(type, x, y, w, h){
      Object.assign(this, { type, x, y, w, h });
    }
    update(dt){
      this.x -= speed * dt;
    }
    draw(){
      drawObstacle(this);
    }
  }

  const obstacles = [];

  
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  
  function resize(){
    const rect = canvas.parentElement.getBoundingClientRect();
    const cssW = Math.max(300, rect.width);
    const cssH = Math.max(180, rect.height);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    ctx = canvas.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);
    scale = Math.min(canvas.width / (WORLD_W * dpr), canvas.height / (WORLD_H * dpr));
    ctx.scale(scale * dpr, scale * dpr);
  }

  
  function drawBear(b){
    const r = 10; 
    const bodyH = b.ducking ? b.h * 0.6 : b.h;
    const bodyY = b.y + (b.h - bodyH);

    
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(b.x + b.w/2, ground.y + 10, b.w * 0.6, 6, 0, 0, Math.PI*2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalAlpha = 1;

    
    roundRect(b.x, bodyY, b.w, bodyH, r);
    ctx.fillStyle = '#c97b4a';
    ctx.fill();

    
    roundRect(b.x + 10, bodyY + 14, b.w - 20, bodyH - 28, r);
    ctx.fillStyle = '#f8e2c4'; 
    ctx.fill();

    
    const headSize = b.ducking ? b.h * 0.45 : b.h * 0.5;
    const headX = b.x + b.w * 0.1;
    const headY = bodyY - headSize * 0.35;
    roundRect(headX, headY, headSize, headSize, r);
    ctx.fillStyle = '#a0522d';
    ctx.fill();

    
    ctx.beginPath();
    ctx.arc(headX + headSize*0.2, headY + headSize*0.2, headSize*0.18, 0, Math.PI*2);
    ctx.arc(headX + headSize*0.8, headY + headSize*0.2, headSize*0.18, 0, Math.PI*2);
    ctx.fillStyle = '#a0522d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headSize*0.2, headY + headSize*0.2, headSize*0.1, 0, Math.PI*2);
    ctx.arc(headX + headSize*0.8, headY + headSize*0.2, headSize*0.1, 0, Math.PI*2);
    ctx.fillStyle = '#f8e2c4';
    ctx.fill();

    
    ctx.beginPath();
    ctx.arc(headX + headSize*0.5, headY + headSize*0.55, headSize*0.14, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(headX + headSize*0.35, headY + headSize*0.45, headSize*0.05, 0, Math.PI*2);
    ctx.arc(headX + headSize*0.65, headY + headSize*0.45, headSize*0.05, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headSize*0.5, headY + headSize*0.6, headSize*0.05, 0, Math.PI*2);
    ctx.fill();

    
    const footY = bodyY + bodyH - 4;
    roundRect(b.x + 6, footY - 8, 14, 12, 6);
    roundRect(b.x + b.w - 20, footY - 8, 14, 12, 6);
    ctx.fillStyle = '#8b4513';
    ctx.fill();

    
    const armY = bodyY + 10;
    roundRect(b.x - 10, armY, 10, 18, 6);
    roundRect(b.x + b.w, armY, 10, 18, 6);
    ctx.fillStyle = '#a0522d';
    ctx.fill();
  }

  function roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawObstacle(o){
    if(o.type === 'log'){
      roundRect(o.x, o.y, o.w, o.h, 10);
      ctx.fillStyle = '#d9b99b';
      ctx.fill();
      ctx.fillStyle = '#c49a6c';
      ctx.fillRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(o.x + o.w*0.35, o.y + o.h*0.6, 3, 0, Math.PI*2);
      ctx.arc(o.x + o.w*0.65, o.y + o.h*0.6, 3, 0, Math.PI*2);
      ctx.fill();

    } else if(o.type === 'cloud'){
      ctx.beginPath();
      const r = o.h / 2;
      ctx.arc(o.x + r, o.y + r, r, Math.PI*0.5, Math.PI*1.5);
      ctx.arc(o.x + o.w - r, o.y + r, r, Math.PI*1.5, Math.PI*0.5);
      ctx.closePath();
      ctx.fillStyle = '#f5fbff';
      ctx.fill();
      ctx.strokeStyle = '#e8f6ff';
      ctx.lineWidth = 2;
      ctx.stroke();

    } else if(o.type === 'bee'){
      ctx.save();
      ctx.translate(o.x, o.y);

      
      ctx.beginPath();
      ctx.ellipse(0, 0, o.w/2, o.h/2, 0, 0, Math.PI*2);
      ctx.fillStyle = '#ffd633';
      ctx.fill();

      
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-o.w/4, -o.h/2); ctx.lineTo(-o.w/4, o.h/2);
      ctx.moveTo(0, -o.h/2); ctx.lineTo(0, o.h/2);
      ctx.moveTo(o.w/4, -o.h/2); ctx.lineTo(o.w/4, o.h/2);
      ctx.stroke();

      
      ctx.fillStyle = '#ccf5ff';
      ctx.beginPath();
      ctx.ellipse(-o.w/4, -o.h/1.2, o.w/3, o.h/2, Math.PI/6, 0, Math.PI*2);
      ctx.ellipse(o.w/4, -o.h/1.2, o.w/3, o.h/2, -Math.PI/6, 0, Math.PI*2);
      ctx.fill();

      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-o.w/3, -o.h/8, 3, 0, Math.PI*2);
      ctx.arc(o.w/3, -o.h/8, 3, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawBackground(){
    ctx.fillStyle = '#f7f7f7';
    ctx.fillRect(0, ground.y, WORLD_W, ground.h);
    ctx.fillStyle = '#e8ffe8';
    ctx.fillRect(0, ground.y + ground.h, WORLD_W, WORLD_H - (ground.y + ground.h));
  }

  
  function spawnObstacle(){
    const choose = Math.random();
    if(choose < 0.5){
      const h = 30 + Math.random()*20;
      const w = 28 + Math.random()*22;
      obstacles.push(new Obstacle('log', WORLD_W + 20, ground.y - h, w, h));
    } else if(choose < 0.8){
      const h = 28;
      const w = 64 + Math.random()*36;
      const y = ground.y - 70 - Math.random()*10;
      obstacles.push(new Obstacle('cloud', WORLD_W + 20, y, w, h));
    } else {
      const w = 40;
      const h = 24;
      const y = ground.y - 100 - Math.random()*80;
      obstacles.push(new Obstacle('bee', WORLD_W + 20, y, w, h));
    }
  }

  function reset(){
    obstacles.length = 0;
    speed = 4.2;
    gravity = 0.6;
    spawnTimer = 0;
    spawnCd = 90;
    score = 0;
    gameOver = false;
    paused = false;
    overlay.hidden = true;

    bear.y = ground.y - bear.h;
    bear.vy = 0;
    bear.ducking = false;
    bear.onGround = true;

    if(!running){
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  
  window.addEventListener('keydown', (e) => {
    if(e.repeat) return;
    const key = e.key.toLowerCase();
    if(key === ' ' || key === 'arrowup'){
      jump();
    }else if(key === 'arrowdown'){
      bear.ducking = true;
    }else if(key === 'r'){
      reset();
    }else if(key === 'p'){
      paused = !paused;
      if(!paused) requestAnimationFrame(loop);
    }
  });

  window.addEventListener('keyup', (e) => {
    if(e.key.toLowerCase() === 'arrowdown'){
      bear.ducking = false;
    }
  });

  
  const press = (el, onDown, onUp) => {
    const down = (ev) => { ev.preventDefault(); onDown(); };
    const up = (ev) => { ev.preventDefault(); onUp && onUp(); };
    el.addEventListener('touchstart', down, {passive:false});
    el.addEventListener('touchend', up, {passive:false});
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', () => onUp && onUp());
  };

  press(btnJump, () => jump());
  press(btnDuck, () => { bear.ducking = true; }, () => { bear.ducking = false; });

  btnRestart.addEventListener('click', reset);

  function jump(){
    if(gameOver) return;
    if(bear.onGround){
      bear.vy = -10.8;
      bear.onGround = false;
    }
  }

  
  function loop(ts){
    if(!running || paused) return;
    const dt = Math.min(32, ts - lastTime);
    lastTime = ts;

    update(dt / (1000/60));
    draw();

    if(running) requestAnimationFrame(loop);
  }

  function update(dt){
    if(gameOver) return;

    
    speed += 0.0009 * dt;
    if(score > 200) spawnCd = Math.max(40, spawnCd - 0.5);
    if(score > 500) gravity = 0.7;

    spawnTimer += dt;
    if(spawnTimer >= spawnCd){
      spawnObstacle();
      spawnTimer = 0;
    }

    if(!bear.onGround){
      bear.vy += gravity * dt;
      bear.y += bear.vy * dt;
      if(bear.y >= ground.y - bear.h){
        bear.y = ground.y - bear.h;
        bear.vy = 0;
        bear.onGround = true;
      }
    }

    for(let i=obstacles.length-1;i>=0;i--){
      const o = obstacles[i];
      o.update(dt);
      if(o.x + o.w < -10) obstacles.splice(i,1);
    }

    const bearHit = {
      x: bear.x + 6,
      y: bear.y + (bear.ducking ? bear.h*0.4 : 4),
      w: bear.w - 12,
      h: bear.ducking ? bear.h*0.56 : bear.h - 10
    };

    for(const o of obstacles){
      if(rectsOverlap(bearHit.x, bearHit.y, bearHit.w, bearHit.h, o.x, o.y, o.w, o.h)){
        gameOver = true;
        running = false;
        overlay.hidden = false;
        if(score > highScore){
          highScore = score;
          localStorage.setItem('bearDinoHighScore', String(highScore));
          hudHigh.textContent = highScore;
        }
        return;
      }
    }

    score += Math.floor(1 * dt);
    hudScore.textContent = score;
  }

  function draw(){
    ctx.clearRect(0, 0, WORLD_W, WORLD_H);
    drawBackground();
    for(const o of obstacles){
      o.draw();
    }
    drawBear(bear);
  }

  window.addEventListener('resize', resize);
  resize();
  reset();
})();
