// =============================================
// PLINKO REWARD MACHINE - script.js
// - Slots are decorative only (no bias)
// - Winner is random AFTER ball lands
// - Wider slots to prevent jamming
// - Pure white pegs, white border
// =============================================

const MAX_HISTORY = 5;
const HISTORY_KEY = 'plinkoRewardHistory';

// ===== PLINKO BOARD CLASS =====
class PlinkoBoard {
  constructor(canvasId, type) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.type   = type;
    this.items  = [];
    this.pegs   = [];
    this.isDropping  = false;
    this.animId      = null;
    this.landedSlot  = -1;  // which slot ball physically landed in (decorative only)
    this.onLand      = null; // callback(landedSlot) when ball stops

    this.ballColor = type === 'big' ? '#e05a6a' : '#f9ca24';
    this.accent    = this.ballColor;
  }

  // ===== LAYOUT =====
  layout() {
    const n = this.items.length;
    if (!n) return;

    const W = this.canvas.width;
    const H = this.canvas.height;

    // Fewer peg rows so gaps between pegs are bigger → less jamming
    const ROWS    = 7;
    // Slot width: ensure minimum 36px so ball fits
    const minSlotW = Math.max(W / n, 36);
    const slotW    = W / n;
    const topPad   = 52;
    const botPad   = 78;
    const usableH  = H - topPad - botPad;
    const rowH     = usableH / ROWS;

    this.slotW  = slotW;
    this.topPad = topPad;
    this.rowH   = rowH;
    // Peg radius: smaller relative to slot so there's more clearance
    this.pegR   = Math.max(4, Math.min(7, slotW * 0.18));
    this.pegs   = [];

    for (let row = 0; row < ROWS; row++) {
      const isLastRow = row === ROWS - 1;
      const offset    = row % 2 === 0 ? slotW / 2 : 0;
      const cols      = row % 2 === 0 ? n : n + 1;

      for (let col = 0; col < cols; col++) {
        // Remove outermost 2 pegs on last row to prevent corner jams
        if (isLastRow && (col === 0 || col === cols - 1)) continue;

        const x = offset + col * slotW;
        const y = topPad + row * rowH + rowH * 0.5;
        // Keep away from walls
        if (x > this.pegR + 4 && x < W - this.pegR - 4) {
          this.pegs.push({ x, y, r: this.pegR });
        }
      }
    }

    this.draw();
  }

  // ===== DRAW BOARD =====
  // highlightSlot = -1 during drop (all slots neutral)
  // highlightSlot = index  after drop (that slot lights up)
  draw(highlightSlot = -1) {
    const { ctx, canvas, items, pegs, accent } = this;
    const W = canvas.width, H = canvas.height;
    const n = items.length;

    // Cream background — #FCF6F5
    ctx.fillStyle = '#FCF6F5';
    ctx.fillRect(0, 0, W, H);

    // Very subtle dot grid
    ctx.fillStyle = 'rgba(138,170,229,0.15)';
    for (let gx = 12; gx < W; gx += 20) {
      for (let gy = 12; gy < H; gy += 20) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!n) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', W / 2, H / 2);
      return;
    }

    const slotW = this.slotW;
    const slotH = 78;
    const slotY = H - slotH;

    // Slot divider walls
    ctx.strokeStyle = 'rgba(138,170,229,0.35)';
    ctx.lineWidth   = 1.5;
    for (let i = 0; i <= n; i++) {
      const x = i * slotW;
      ctx.beginPath();
      ctx.moveTo(x, slotY - 10);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Draw slots — flat solid colors
    items.forEach((label, i) => {
      const x        = i * slotW;
      const isWinner = i === highlightSlot;

      // Normal: solid blue-tinted fill. Winner: solid accent color
      ctx.shadowBlur = 0;
      ctx.fillStyle  = isWinner ? accent : '#b8cef0';
      ctx.fillRect(x + 2, slotY + 2, slotW - 4, slotH - 4);

      // Top accent bar
      ctx.fillStyle = isWinner ? '#FCF6F5' : accent;
      ctx.fillRect(x + 2, slotY + 2, slotW - 4, 4);

      // Gift emoji
      const giftSize = Math.max(13, Math.min(24, slotW * 0.42));
      ctx.font          = `${giftSize}px Arial`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('🎁', x + slotW / 2, slotY + slotH / 2);
    });

    // Outer side walls — baby blue
    ctx.strokeStyle = 'rgba(138,170,229,0.5)';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.moveTo(2, 0);   ctx.lineTo(2, H);   ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W-2, 0); ctx.lineTo(W-2, H); ctx.stroke();

    // Pegs — solid baby blue, flat style
    pegs.forEach(p => {
      // Simple shadow (very subtle)
      ctx.beginPath();
      ctx.arc(p.x, p.y + 1.5, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(91,130,212,0.18)';
      ctx.fill();

      // Flat peg — solid #8AAAE5
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = '#8AAAE5';
      ctx.fill();

      // Small cream highlight dot
      ctx.beginPath();
      ctx.arc(p.x - p.r * 0.28, p.y - p.r * 0.28, p.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(252,246,245,0.70)';
      ctx.fill();
    });

    // Drop guide dashed line
    ctx.strokeStyle = 'rgba(138,170,229,0.40)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, this.topPad - 12);
    ctx.lineTo(W, this.topPad - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drop label
    ctx.font      = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(91,130,212,0.55)';
    ctx.fillText('▼  DROP HERE  ▼', W / 2, 20);
  }

  // ===== DRAW BALL =====
  drawBall(b) {
    const { ctx, ballColor } = this;

    // Trail — same color as ball
    b.trail.forEach((t, i) => {
      const a = (i / b.trail.length) * 0.25;
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(ballColor, a);
      ctx.fill();
    });

    // Outer glow — removed, flat style
    // Ball body — flat solid color with cream dot
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = ballColor;
    ctx.fill();

    // Cream shine dot
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.27, b.y - b.r * 0.30, b.r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(252,246,245,0.85)';
    ctx.fill();
  }

  // ===== DROP =====
  // Ball falls freely with NO bias — pure physics
  // onLand callback tells us which slot it landed in (purely decorative)
  drop(onLand) {
    if (this.isDropping || !this.items.length) return;
    this.isDropping = true;
    this.onLand     = onLand;

    const W     = this.canvas.width;
    const slotW = this.slotW;

    // Ball starts near top-center, small random offset
    const ball = {
      x:  W / 2 + (Math.random() - 0.5) * slotW * 1.2,
      y:  28,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0.4,   // slower initial drop
      r:  Math.max(5, Math.min(10, slotW * 0.22)),
      trail: [],
    };

    // NO targetX, NO bias — true free fall
    const GRAVITY     = 0.10;   // slower fall
    const FRICTION    = 0.992;  // less damping
    const PEG_BOUNCE  = 0.35;
    const WALL_BOUNCE = 0.30;

    const bottomY = this.canvas.height - 78 - ball.r;

    const tick = () => {
      // Pure gravity, no bias
      ball.vy += GRAVITY;
      ball.vx *= FRICTION;
      ball.x  += ball.vx;
      ball.y  += ball.vy;

      // Trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 12) ball.trail.shift();

      // Wall collision
      if (ball.x - ball.r < 3) {
        ball.x  = 3 + ball.r;
        ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
      }
      if (ball.x + ball.r > W - 3) {
        ball.x  = W - 3 - ball.r;
        ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
      }

      // Peg collisions
      this.pegs.forEach(p => {
        const dx   = ball.x - p.x;
        const dy   = ball.y - p.y;
        const dist = Math.hypot(dx, dy);
        const minD = ball.r + p.r + 1;
        if (dist < minD && dist > 0.001) {
          const nx = dx / dist, ny = dy / dist;
          // Push out
          ball.x = p.x + nx * minD;
          ball.y = p.y + ny * minD;
          // Reflect + dampen
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * PEG_BOUNCE;
          ball.vy = (ball.vy - 2 * dot * ny) * PEG_BOUNCE + 0.25;
          // Natural random scatter
          ball.vx += (Math.random() - 0.5) * 1.0;
          if (ball.vy < 0.5) ball.vy = 0.5;
        }
      });

      // Redraw board (no highlight during drop) + ball
      this.draw(-1);
      this.drawBall(ball);

      // Landed?
      if (ball.y >= bottomY) {
        ball.y = bottomY; ball.vx = 0; ball.vy = 0;
        // Determine which slot ball physically stopped in (decorative only)
        const physicalSlot = Math.min(
          Math.floor(ball.x / slotW),
          this.items.length - 1
        );
        // Light up that slot visually
        this.draw(physicalSlot);
        this.drawBall(ball);
        this.isDropping = false;
        this.animId     = null;
        // Fire callback — caller will pick a RANDOM winner independently
        if (this.onLand) this.onLand(physicalSlot);
        return;
      }

      this.animId = requestAnimationFrame(tick);
    };

    this.animId = requestAnimationFrame(tick);
  }
}

// ===== HELPERS =====
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===== LOAD REWARDS =====
async function loadRewards(file) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error('not found');
    const txt = await res.text();
    return txt.split('\n').map(l => l.trim()).filter(Boolean);
  } catch(e) { console.error(e); return []; }
}

// ===== HISTORY =====
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function saveHistory(h) { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }

function addHistory(type, reward) {
  const h = getHistory();
  const t = new Date().toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
  h.unshift({ type, reward, time: t });
  saveHistory(h.slice(0, MAX_HISTORY));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  const h    = getHistory();
  if (!h.length) {
    list.innerHTML = '<p class="history-empty">No drops yet</p>';
    return;
  }
  list.innerHTML = h.map(item => `
    <div class="history-item ${item.type}">
      <div class="history-dot"></div>
      <span class="history-reward">🎁 ${esc(item.reward)}</span>
      <span class="history-time">${item.time}</span>
    </div>`).join('');
}

// ===== RESULT POPUP =====
function showResult(type, reward) {
  document.getElementById('result-emoji').textContent = '🎁';
  document.getElementById('result-label').textContent = type === 'big' ? 'Big Reward!' : 'Small Reward!';
  document.getElementById('result-text').textContent  = reward;
  document.getElementById('result-box').className =
    'result-box ' + (type === 'big' ? 'big-result' : 'small-result');
  document.getElementById('result-overlay').classList.add('active');
  if (type === 'big') launchConfetti();
}

function hideResult() {
  document.getElementById('result-overlay').classList.remove('active');
  stopConfetti();
}

// ===== CONFETTI =====
let confettiParticles = [], confettiAnimId = null;
const CONF_COLORS = ['#ff6b35','#ffd700','#00d4ff','#ff69b4','#a0ff00','#ffffff'];

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  confettiParticles = Array.from({length:140}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: Math.random()*10+5, h: Math.random()*6+3,
    color: CONF_COLORS[Math.floor(Math.random()*CONF_COLORS.length)],
    rot: Math.random()*Math.PI*2, rs: (Math.random()-0.5)*0.18,
    vy: Math.random()*3+1.5, vx: (Math.random()-0.5)*2,
  }));
  function step() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    confettiParticles.forEach(p => {
      p.y+=p.vy; p.x+=p.vx; p.rot+=p.rs;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color; ctx.globalAlpha=0.88;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      ctx.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.y < canvas.height+20);
    if (confettiParticles.length > 0) confettiAnimId = requestAnimationFrame(step);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  confettiAnimId = requestAnimationFrame(step);
}
function stopConfetti() {
  if (confettiAnimId) { cancelAnimationFrame(confettiAnimId); confettiAnimId = null; }
  const c = document.getElementById('confetti-canvas');
  c.getContext('2d').clearRect(0,0,c.width,c.height);
}

// ===== RESIZE =====
function resizeCanvas(canvas) {
  const W = canvas.parentElement.clientWidth;
  canvas.width  = W;
  canvas.height = Math.round(W * 1.5);
}

// ===== BOARDS & DROP =====
let boards = {}, isDropping = false;

async function dropBall(type) {
  if (isDropping) return;
  const board = boards[type];
  if (!board || !board.items.length) return;

  isDropping = true;
  document.getElementById('btn-big').disabled   = true;
  document.getElementById('btn-small').disabled = true;

  // ── RANDOM winner decided NOW, independently of where ball lands ──
  const winnerIndex = Math.floor(Math.random() * board.items.length);

  board.drop((_physicalSlot) => {
    // Ball has landed. _physicalSlot is just visual.
    // The ACTUAL reward is from winnerIndex (random, pre-decided).
    const reward = board.items[winnerIndex];
    addHistory(type, reward);

    setTimeout(() => {
      showResult(type, reward);
      isDropping = false;
      document.getElementById('btn-big').disabled   = false;
      document.getElementById('btn-small').disabled = false;
    }, 450);
  });
}

// ===== INIT =====
async function init() {
  const cBig   = document.getElementById('canvas-big');
  const cSmall = document.getElementById('canvas-small');
  resizeCanvas(cBig); resizeCanvas(cSmall);

  boards.big   = new PlinkoBoard('canvas-big',   'big');
  boards.small = new PlinkoBoard('canvas-small', 'small');
  boards.big.draw(); boards.small.draw();

  const [bigR, smallR] = await Promise.all([
    loadRewards('rewards_big.txt'),
    loadRewards('rewards_small.txt'),
  ]);

  if (bigR.length) {
    boards.big.items = bigR; boards.big.layout();
    document.getElementById('big-loading').style.display = 'none';
    document.getElementById('btn-big').disabled = false;
  } else {
    document.getElementById('big-loading').textContent = '⚠ Cannot load rewards_big.txt';
  }
  if (smallR.length) {
    boards.small.items = smallR; boards.small.layout();
    document.getElementById('small-loading').style.display = 'none';
    document.getElementById('btn-small').disabled = false;
  } else {
    document.getElementById('small-loading').textContent = '⚠ Cannot load rewards_small.txt';
  }

  renderHistory();

  document.getElementById('btn-big').addEventListener('click',   () => dropBall('big'));
  document.getElementById('btn-small').addEventListener('click', () => dropBall('small'));
  document.getElementById('result-close').addEventListener('click', hideResult);
  document.getElementById('result-overlay').addEventListener('click', e => {
    if (e.target.id === 'result-overlay') hideResult();
  });
  document.getElementById('clear-history').addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY); renderHistory();
  });

  window.addEventListener('resize', () => {
    resizeCanvas(cBig); resizeCanvas(cSmall);
    if (boards.big.items.length)   boards.big.layout();
    if (boards.small.items.length) boards.small.layout();
  });
}

document.addEventListener('DOMContentLoaded', init);