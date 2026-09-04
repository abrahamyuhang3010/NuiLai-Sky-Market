const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('miniChart');
const miniCtx = miniCanvas.getContext('2d');

const ui = {
  stageOverlay: document.getElementById('stageOverlay'),
  stageKicker: document.getElementById('stageKicker'),
  stageTitle: document.getElementById('stageTitle'),
  stageDescription: document.getElementById('stageDescription'),
  launchLabel: document.getElementById('launchLabel'),
  finishOverlay: document.getElementById('finishOverlay'),
  finishKicker: document.getElementById('finishKicker'),
  finishTitle: document.getElementById('finishTitle'),
  finishText: document.getElementById('finishText'),
  finishMetric: document.getElementById('finishMetric'),
  finishStars: document.getElementById('finishStars'),
  finishReward: document.getElementById('finishReward'),
  retryBtn: document.getElementById('retryBtn'),
  retryLabel: document.getElementById('retryLabel'),
  levelSelectBtn: document.getElementById('levelSelectBtn'),
  rerollBtn: document.getElementById('rerollBtn'),
  steadyBtn: document.getElementById('steadyBtn'),
  canvasStatusText: document.getElementById('canvasStatusText'),
  eventText: document.getElementById('eventText'),
  marketStateText: document.getElementById('marketStateText'),
  levelProgress: document.getElementById('levelProgress'),
  distanceValue: document.getElementById('distanceValue'),
  priceValue: document.getElementById('priceValue'),
  priceChange: document.getElementById('priceChange'),
  holdingValue: document.getElementById('holdingValue'),
  marketValue: document.getElementById('marketValue'),
  pnlValue: document.getElementById('pnlValue'),
  cashValue: document.getElementById('cashValue'),
  returnValue: document.getElementById('returnValue'),
  missionFill: document.getElementById('missionFill'),
  missionCurrent: document.getElementById('missionCurrent'),
  missionTitle: document.getElementById('missionTitle'),
  missionDescription: document.getElementById('missionDescription'),
  missionTarget: document.getElementById('missionTarget'),
  missionTargetText: document.getElementById('missionTargetText'),
  targetValue: document.getElementById('targetValue'),
  signalList: document.getElementById('signalList'),
  levelMap: document.getElementById('levelMap'),
  levelMapList: document.getElementById('levelMapList'),
  coinValue: document.getElementById('coinValue'),
  starTotal: document.getElementById('starTotal'),
  levelName: document.getElementById('levelName'),
  levelNumber: document.getElementById('levelNumber'),
  cabinetNumber: document.getElementById('cabinetNumber'),
  afterIndex: document.getElementById('afterIndex'),
  gameDebug: document.getElementById('gameDebug'),
};

const W = canvas.width;
const H = canvas.height;
const COW_TRAIL_OFFSET = 70;
// The sprite includes horns, hands and hooves outside its torso. Keep collisions
// aligned with that visible silhouette so the character cannot visibly clip walls.
const COW_HITBOX = { left: -72, right: 78, top: -60, bottom: 36 };
const GATE_HIT_RADIUS = 34;
const initialEquity = 400;
const targetDistance = 1000;
const totalChips = 2;
const debugParams = new URLSearchParams(location.search);
const debugMode = debugParams.has('debug') && ['localhost', '127.0.0.1'].includes(location.hostname);
const STORAGE_KEY = debugMode ? 'niulai-sky-market-qa' : 'niulai-sky-market-v3';

const RISK_DEFS = {
  opening: { kind: 'opening', top: '追高陷阱', bottom: '恐慌抛售' },
  volume: { kind: 'volume', top: '放量冲高', bottom: '缩量阴跌' },
  earnings: { kind: 'earnings', top: '业绩暴雷', bottom: '预期落空' },
  rate: { kind: 'rate', top: '加息重压', bottom: '降息热潮' },
  bubble: { kind: 'bubble', top: '估值泡沫', bottom: '泡沫破裂' },
  leverage: { kind: 'leverage', top: '保证金追缴', bottom: '杠杆爆仓' },
  liquidity: { kind: 'liquidity', top: '流动性枯竭', bottom: '买卖价差' },
  fx: { kind: 'fx', top: '强势美元', bottom: '汇率闪崩' },
  credit: { kind: 'storm', top: '信用紧缩', bottom: '银行挤兑' },
  default: { kind: 'storm', top: '黑天鹅', bottom: '债务违约' },
};

const GATE_DEFS = {
  buy: { label: 'BUY', name: '买入 +1 股', icon: '↑', tone: 'buy' },
  sell: { label: 'SELL', name: '卖出 -1 股', icon: '↓', tone: 'sell' },
  vol: { label: 'VOL', name: '成交量预判', icon: '▥', tone: 'info' },
  report: { label: 'REPORT', name: '财报预告', icon: 'R', tone: 'info' },
  hedge: { label: 'HEDGE', name: '利率对冲', icon: '◇', tone: 'info' },
  chase: { label: 'CHASE', name: '追涨 +2 股', icon: '⇈', tone: 'buy' },
  profit: { label: 'PROFIT', name: '止盈 -2 股', icon: '⇊', tone: 'sell' },
  leverage: { label: 'LEV', name: '杠杆 ×2', icon: '×2', tone: 'warn' },
  deleverage: { label: 'DELEV', name: '解除杠杆', icon: '÷2', tone: 'info' },
  market: { label: 'MKT', name: '市价成交', icon: 'M', tone: 'warn' },
  limit: { label: 'LIMIT', name: '限价成交', icon: 'L', tone: 'info' },
  fxhedge: { label: 'FX', name: '汇率对冲', icon: '◇', tone: 'info' },
  exposure: { label: 'OPEN', name: '保留敞口', icon: '!', tone: 'warn' },
  circuit: { label: 'HALT', name: '市场熔断', icon: 'Ⅱ', tone: 'info' },
  chip: { label: 'DATA', name: '研究芯片', icon: '◆', tone: 'chip' },
};

// Each stage teaches one financial idea before later stages combine it.
const LEVEL_CONFIGS = [
  { name: '开盘试水', objective: '掌握飞行与基础交易', description: '避开追高陷阱与恐慌抛售，用 BUY / SELL 把收益推过目标线。', target: 6, reward: 100, badge: '开盘学徒', duration: 45, speed: 105, speedEnd: 122, gravity: 112, lift: 188, dive: 22, maxVy: 88, damping: 0.06, startGap: 320, endGap: 286, spacingStart: 520, spacingEnd: 430, centerShiftStart: 22, centerShiftEnd: 48, gateSpacing: 500, obstacleWidthStart: 44, obstacleWidthEnd: 48, rampAt: 0.94, trend: 13, risks: ['opening'], gates: ['buy', 'sell'] },
  { name: '量价迷雾', objective: '根据成交量判断方向', description: '放量冲高与缩量阴跌真假交替，先读取 VOL 再决定是否交易。', target: 8, reward: 120, badge: '量价观察员', duration: 48, speed: 115, speedEnd: 135, gravity: 118, lift: 198, dive: 24, maxVy: 92, damping: 0.065, startGap: 304, endGap: 274, spacingStart: 500, spacingEnd: 410, centerShiftStart: 28, centerShiftEnd: 60, gateSpacing: 470, obstacleWidthStart: 46, obstacleWidthEnd: 50, rampAt: 0.91, trend: 6, risks: ['volume'], gates: ['vol', 'buy', 'sell'] },
  { name: '财报季', objective: '利用预告提前止盈', description: '财报冲击会突然改变通道，REPORT 会揭示下一段行情方向。', target: 9, reward: 140, badge: '财报侦探', duration: 50, speed: 122, speedEnd: 145, gravity: 124, lift: 206, dive: 26, maxVy: 96, damping: 0.07, startGap: 294, endGap: 262, spacingStart: 480, spacingEnd: 390, centerShiftStart: 32, centerShiftEnd: 72, gateSpacing: 450, obstacleWidthStart: 47, obstacleWidthEnd: 52, rampAt: 0.88, trend: 7, risks: ['earnings'], gates: ['report', 'buy', 'sell'] },
  { name: '利率风向', objective: '应对加息与降息气流', description: '利率会改变飞行受力；HEDGE 可削弱下一次宏观冲击。', target: 11, reward: 160, badge: '宏观舵手', duration: 52, speed: 130, speedEnd: 155, gravity: 130, lift: 216, dive: 28, maxVy: 101, damping: 0.075, startGap: 284, endGap: 250, spacingStart: 460, spacingEnd: 370, centerShiftStart: 36, centerShiftEnd: 86, gateSpacing: 430, obstacleWidthStart: 48, obstacleWidthEnd: 54, rampAt: 0.86, trend: 7, risks: ['rate'], gates: ['hedge', 'buy', 'sell'] },
  { name: '泡沫之城', objective: '在泡沫破裂前分批止盈', description: '估值泡沫会膨胀挤压通道，CHASE 与 PROFIT 同时放大机会和风险。', target: 13, reward: 180, badge: '理性多头', duration: 54, speed: 138, speedEnd: 166, gravity: 136, lift: 226, dive: 30, maxVy: 106, damping: 0.08, startGap: 274, endGap: 238, spacingStart: 440, spacingEnd: 350, centerShiftStart: 42, centerShiftEnd: 96, gateSpacing: 410, obstacleWidthStart: 50, obstacleWidthEnd: 56, rampAt: 0.83, trend: 8, risks: ['bubble'], gates: ['chase', 'profit', 'buy', 'sell'] },
  { name: '杠杆边缘', objective: '在清算前主动去杠杆', description: 'LEV 会放大收益与亏损；保证金归零前必须经过 DELEV。', target: 14, reward: 200, badge: '杠杆驯服者', duration: 56, speed: 145, speedEnd: 175, gravity: 142, lift: 236, dive: 32, maxVy: 111, damping: 0.085, startGap: 264, endGap: 226, spacingStart: 420, spacingEnd: 330, centerShiftStart: 48, centerShiftEnd: 104, gateSpacing: 395, obstacleWidthStart: 52, obstacleWidthEnd: 58, rampAt: 0.81, trend: 7, risks: ['leverage'], gates: ['leverage', 'buy', 'deleverage', 'sell'] },
  { name: '流动性荒漠', objective: '权衡滑点与成交时机', description: '盘口会闪烁收缩；MKT 立即成交，LIMIT 延迟但锁定价格。', target: 15, reward: 220, badge: '流动性猎手', duration: 58, speed: 152, speedEnd: 184, gravity: 148, lift: 244, dive: 35, maxVy: 116, damping: 0.09, startGap: 256, endGap: 216, spacingStart: 405, spacingEnd: 315, centerShiftStart: 52, centerShiftEnd: 112, gateSpacing: 380, obstacleWidthStart: 53, obstacleWidthEnd: 60, rampAt: 0.79, trend: 7, risks: ['liquidity'], gates: ['limit', 'market'] },
  { name: '汇率闪崩', objective: '用外汇对冲化解脉冲', description: '强势美元和汇率闪崩会推离航线；FX 对冲可抵消下一次冲击。', target: 17, reward: 240, badge: '外汇飞行员', duration: 60, speed: 160, speedEnd: 192, gravity: 154, lift: 252, dive: 38, maxVy: 120, damping: 0.095, startGap: 248, endGap: 208, spacingStart: 390, spacingEnd: 300, centerShiftStart: 58, centerShiftEnd: 118, gateSpacing: 365, obstacleWidthStart: 54, obstacleWidthEnd: 62, rampAt: 0.77, trend: 8, risks: ['fx'], gates: ['fxhedge', 'exposure', 'buy', 'sell'] },
  { name: '金融风暴', objective: '安排对冲与熔断顺序', description: '信用紧缩、银行挤兑和黑天鹅接连出现；HALT 可短暂停住市场。', target: 19, reward: 280, badge: '风暴幸存者', duration: 65, speed: 168, speedEnd: 202, gravity: 160, lift: 260, dive: 42, maxVy: 124, damping: 0.1, startGap: 240, endGap: 200, spacingStart: 375, spacingEnd: 285, centerShiftStart: 64, centerShiftEnd: 124, gateSpacing: 350, obstacleWidthStart: 56, obstacleWidthEnd: 64, rampAt: 0.75, trend: 9, risks: ['credit', 'default'], gates: ['hedge', 'circuit', 'buy', 'sell'] },
  { name: '收盘钟声', objective: '穿越四阶段收盘风暴', description: '泡沫、利率、流动性与黑天鹅依次来袭，综合运用全部市场模块。', target: 22, reward: 400, badge: '牛来之神', duration: 72, speed: 176, speedEnd: 212, gravity: 166, lift: 270, dive: 46, maxVy: 130, damping: 0.105, startGap: 232, endGap: 192, spacingStart: 360, spacingEnd: 275, centerShiftStart: 70, centerShiftEnd: 132, gateSpacing: 335, obstacleWidthStart: 58, obstacleWidthEnd: 66, rampAt: 0.73, trend: 10, risks: ['bubble', 'rate', 'liquidity', 'default'], gates: ['report', 'chase', 'profit', 'hedge', 'leverage', 'deleverage', 'limit', 'circuit'] },
];

function createDefaultCampaign() {
  return { unlocked: 0, lastLevel: 0, coins: 0, stars: Array(10).fill(0), cleared: Array(10).fill(false), attempts: Array(10).fill(0), bestReturns: Array(10).fill(null), endlessUnlocked: false };
}

function loadCampaign() {
  const fallback = createDefaultCampaign();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    return {
      ...fallback,
      unlocked: Math.max(0, Math.min(9, Number(saved.unlocked) || 0)),
      lastLevel: Math.max(0, Math.min(9, Number(saved.lastLevel) || 0)),
      coins: Math.max(0, Math.round(Number(saved.coins) || 0)),
      stars: fallback.stars.map((_, index) => Math.max(0, Math.min(3, Number(saved.stars?.[index]) || 0))),
      cleared: fallback.cleared.map((_, index) => Boolean(saved.cleared?.[index])),
      attempts: fallback.attempts.map((_, index) => Math.max(0, Number(saved.attempts?.[index]) || 0)),
      bestReturns: fallback.bestReturns.map((_, index) => Number.isFinite(saved.bestReturns?.[index]) ? saved.bestReturns[index] : null),
      endlessUnlocked: Boolean(saved.endlessUnlocked),
    };
  } catch {
    return fallback;
  }
}

function saveCampaign() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(campaign)); } catch { /* Progress still works for this session. */ }
}

const campaign = loadCampaign();
let currentLevel = Math.min(campaign.lastLevel, campaign.unlocked);
const debugLevel = Number(debugParams.get('level'));
if (debugMode && Number.isInteger(debugLevel) && debugLevel >= 1 && debugLevel <= LEVEL_CONFIGS.length) currentLevel = debugLevel - 1;
let retryLevel = 0;

const palette = {
  ink: '#131722',
  inkSoft: '#1d2430',
  grid: '#242936',
  line: '#e0e7ea',
  muted: '#8b93a7',
  chartText: '#aab4c5',
  chartRed: '#f23645',
  chartGreen: '#089981',
  orange: '#f7a33c',
  orangeLight: '#ffd17d',
  lime: '#b8ea65',
  coral: '#ef755e',
  blue: '#78b7d9',
};

let rafId;
let lastTime = 0;
let gameStarted = false;
let gameOver = false;
let thrusting = false;
let diving = false;
let soundOn = true;
let elapsed = 0;
let distance = 0;
let price = 100;
let previousPrice = 100;
let high = 100;
let low = 100;
let holdings = 4;
let cash = 0;
let progress = 0;
let gateId = 0;
let obstacleId = 0;
let eventFeed = [];
let priceHistory = [100, 100, 100, 100, 100, 100];
const flightTrace = [];
let runSeed = 0;
let seededRandom = Math.random;
const levelSeeds = Array(LEVEL_CONFIGS.length).fill(null);
let steadyMode = false;
let resultMode = 'failure';
let nextChipIndex = 0;
let chipsCollected = 0;
let hedgeCharges = 0;
let insightTimer = 0;
let insightText = '';
let circuitTimer = 0;
let leverageActive = false;
let leverageEntry = 100;
let leverageUnits = 0;
let exposureActive = false;
let exposureEntry = 100;
let exposureUnits = 0;
let exposureTimer = 0;
let marginRatio = 100;
let pendingOrders = [];
let lastRiskName = '';
let lastSpawnDiagnostics = null;

const cow = { x: 180, y: H * 0.5, vy: 0, radius: 27, tilt: 0 };
const obstacles = [];
const gates = [];
const particles = [];

function createSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function resetGame(levelIndex = currentLevel, options = {}) {
  cancelAnimationFrame(rafId);
  ui.retryBtn?.blur();
  currentLevel = Math.max(0, Math.min(levelIndex, LEVEL_CONFIGS.length - 1));
  if (options.newSeed || levelSeeds[currentLevel] === null) levelSeeds[currentLevel] = createSeed();
  runSeed = levelSeeds[currentLevel];
  seededRandom = mulberry32(runSeed);
  if (typeof options.steady === 'boolean') steadyMode = options.steady;
  retryLevel = currentLevel;
  campaign.lastLevel = currentLevel;
  saveCampaign();
  lastTime = 0;
  gameStarted = false;
  gameOver = false;
  thrusting = false;
  diving = false;
  elapsed = 0;
  distance = 0;
  price = 100;
  previousPrice = 100;
  high = 100;
  low = 100;
  holdings = 4;
  cash = 0;
  progress = 0;
  gateId = 0;
  obstacleId = 0;
  eventFeed = [];
  nextChipIndex = 0;
  chipsCollected = 0;
  hedgeCharges = 0;
  insightTimer = 0;
  insightText = '';
  circuitTimer = 0;
  leverageActive = false;
  leverageEntry = 100;
  leverageUnits = 0;
  exposureActive = false;
  exposureEntry = 100;
  exposureUnits = 0;
  exposureTimer = 0;
  marginRatio = 100;
  pendingOrders = [];
  lastRiskName = '';
  lastSpawnDiagnostics = null;
  priceHistory = [100, 100, 100, 100, 100, 100];
  flightTrace.length = 0;
  cow.y = H * 0.5;
  cow.vy = 0;
  cow.tilt = 0;
  flightTrace.push({ x: cow.x - COW_TRAIL_OFFSET, y: cow.y });
  obstacles.length = 0;
  gates.length = 0;
  particles.length = 0;
  ui.stageOverlay.hidden = false;
  ui.finishOverlay.hidden = true;
  ui.rerollBtn.hidden = true;
  ui.steadyBtn.hidden = true;
  ui.canvasStatusText.textContent = '等待起飞';
  updateLevelDisplay();
  renderSignalFeed();
  renderLevelMap();
  updateUI();
  draw();
}

function startGame() {
  if (gameStarted && !gameOver) return;
  if (gameOver) resetGame(retryLevel, { newSeed: resultMode === 'success', steady: false });
  gameStarted = true;
  gameOver = false;
  ui.stageOverlay.hidden = true;
  ui.finishOverlay.hidden = true;
  ui.canvasStatusText.textContent = '飞行中';
  renderLevelMap();
  playTone(440, 0.07, 'sine');
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function loop(now) {
  // A RAF timestamp can be a fraction earlier than performance.now() when a
  // run starts inside the same frame. Never let that first negative delta
  // poison obstacle geometry with NaN values.
  const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.034));
  lastTime = now;
  update(dt);
  draw();
  if (!gameOver) rafId = requestAnimationFrame(loop);
}

function update(dt) {
  const level = LEVEL_CONFIGS[currentLevel];
  const circuitActive = circuitTimer > 0;
  circuitTimer = Math.max(0, circuitTimer - dt);
  insightTimer = Math.max(0, insightTimer - dt);
  if (insightTimer === 0) insightText = '';
  exposureTimer = Math.max(0, exposureTimer - dt);
  if (exposureActive && exposureTimer === 0) settleExposure();
  const marketDt = circuitActive ? 0 : dt;
  elapsed += marketDt;
  progress = Math.min(elapsed / level.duration, 1);
  distance = Math.round(progress * targetDistance);

  const environmentForce = getEnvironmentalForce();
  const gravity = level.gravity + (diving ? level.dive : 0) + environmentForce;
  const lift = thrusting ? level.lift : 0;
  cow.vy += (gravity - lift) * dt;
  // Stronger damping keeps short taps controllable while holding still gives useful lift.
  cow.vy *= Math.pow(level.damping, dt);
  cow.vy = Math.max(-level.maxVy, Math.min(level.maxVy, cow.vy));
  cow.y += cow.vy * dt;
  cow.y = Math.max(-COW_HITBOX.top + 2, Math.min(H - COW_HITBOX.bottom - 2, cow.y));
  cow.tilt = Math.max(-0.32, Math.min(0.32, cow.vy / level.maxVy * 0.32));

  previousPrice = price;
  // Flight remains the dominant price input; each stage adds a deterministic
  // market cycle so its financial theme changes timing without taking control away.
  price = 100 + getMarketCurve(level, progress) + (H * 0.5 - cow.y) * 0.1;
  high = Math.max(high, price);
  low = Math.min(low, price);
  priceHistory.push(price);
  if (priceHistory.length > 80) priceHistory.shift();

  processPendingOrders(dt);
  updateMargin();
  if (gameOver) { updateParticles(dt); updateUI(); return; }

  spawnWorld();
  moveWorld(dt);
  // A crash ends the frame immediately. Do not leave a trail or process a
  // transaction after the sprite has already hit an obstacle.
  if (!gameOver) {
    recordFlightTrace(dt);
    collectGateHits();
  }
  updateParticles(dt);

  if (!gameOver && distance >= targetDistance) finishGame();
  updateUI();
}

function getMarketCurve(level, value) {
  const wave = Math.sin(value * Math.PI * 6);
  switch (currentLevel) {
    case 1: return level.trend * value + wave * 1.8;
    case 2: return level.trend * value + (value > 0.52 ? 5 : 0) - (value > 0.76 ? 3 : 0);
    case 3: return level.trend * value + Math.sin(value * Math.PI * 4) * 2.4;
    case 4: return level.trend * value + Math.sin(value * Math.PI) * 9 - Math.max(0, value - 0.78) * 36;
    case 5: return level.trend * value + Math.sin(value * Math.PI * 5) * 2.8;
    case 6: return level.trend * value + Math.round(Math.sin(value * Math.PI * 8)) * 2.1;
    case 7: return level.trend * value + Math.sin(value * Math.PI * 7) * 3.4;
    case 8: return level.trend * value + Math.sin(value * Math.PI * 9) * 4.2;
    case 9: {
      if (value < 0.25) return value * 40;
      if (value < 0.5) return 10 - (value - 0.25) * 24;
      if (value < 0.75) return 4 + (value - 0.5) * 32;
      return 12 - (value - 0.75) * 16;
    }
    default: return level.trend * value;
  }
}

function getWorldSpeed() {
  const level = LEVEL_CONFIGS[currentLevel];
  const base = level.speed + (level.speedEnd - level.speed) * progress;
  return base * (steadyMode ? 0.88 : 1) * (circuitTimer > 0 ? 0.45 : 1);
}

function getExtraPnl() {
  const leveragePnl = leverageActive ? leverageUnits * (price - leverageEntry) : 0;
  const exposurePnl = exposureActive ? exposureUnits * (price - exposureEntry) : 0;
  return leveragePnl + exposurePnl;
}

function settleLeverage() {
  if (!leverageActive) return;
  cash += leverageUnits * (price - leverageEntry);
  leverageActive = false;
  leverageUnits = 0;
  marginRatio = 100;
}

function settleExposure() {
  if (!exposureActive) return;
  cash += exposureUnits * (price - exposureEntry);
  exposureActive = false;
  exposureUnits = 0;
}

function updateMargin() {
  if (!leverageActive) { marginRatio = 100; return; }
  const leveragedPnl = leverageUnits * (price - leverageEntry);
  marginRatio = Math.max(0, Math.min(100, 100 + leveragedPnl / initialEquity * 400));
  if (marginRatio <= 0) crash('杠杆爆仓');
}

function processPendingOrders(dt) {
  for (const order of pendingOrders) order.timer -= dt;
  const ready = pendingOrders.filter((order) => order.timer <= 0);
  pendingOrders = pendingOrders.filter((order) => order.timer > 0);
  for (const order of ready) executeTrade(order.side, 1, order.lockedPrice, 'limit');
}

function getCowBounds() {
  return {
    left: cow.x + COW_HITBOX.left,
    right: cow.x + COW_HITBOX.right,
    top: cow.y + COW_HITBOX.top,
    bottom: cow.y + COW_HITBOX.bottom,
  };
}

function getDebugSnapshot() {
  return {
    level: currentLevel + 1,
    elapsed: Number(elapsed.toFixed(2)),
    progress: Number(progress.toFixed(3)),
    distance,
    gameStarted,
    gameOver,
    resultMode,
    steadyMode,
    returnPct: Number(getReturnPct().toFixed(2)),
    holdings,
    cash: Number(cash.toFixed(2)),
    chipsCollected,
    cow: { x: cow.x, y: Number(cow.y.toFixed(1)), vy: Number(cow.vy.toFixed(1)), bounds: getCowBounds() },
    obstacles: obstacles.map((obstacle) => ({
      x: Number(obstacle.x.toFixed(1)),
      width: obstacle.width,
      kind: obstacle.kind,
      topRisk: obstacle.top,
      bottomRisk: obstacle.bottom,
      geometry: getObstacleGeometry(obstacle),
    })),
    gates: gates.filter((gate) => !gate.taken).map((gate) => ({
      x: Number(gate.x.toFixed(1)),
      y: Number(gate.y.toFixed(1)),
      type: gate.type,
    })),
    campaign: {
      unlocked: campaign.unlocked,
      attempts: campaign.attempts.slice(),
      stars: campaign.stars.slice(),
      coins: campaign.coins,
    },
    spawn: lastSpawnDiagnostics,
  };
}

// Read-only state is exposed for deterministic local browser regression tests.
window.__NIULAI_DEBUG__ = Object.freeze({ snapshot: getDebugSnapshot });

function getObstacleGeometry(obstacle) {
  let center = obstacle.center;
  let gap = obstacle.gap;
  const phase = elapsed * 2 + obstacle.seed;
  switch (obstacle.kind) {
    case 'volume':
      center += Math.sin(phase) * 8;
      break;
    case 'earnings':
      center += Math.sin(phase * 0.7) * 13 * obstacle.direction;
      break;
    case 'bubble':
      gap -= (10 + Math.sin(phase) * 10) * Math.min(1, progress * 1.5);
      break;
    case 'leverage':
      gap -= 8 + progress * 9;
      break;
    case 'fx':
      center += Math.sin(phase * 1.25) * 16;
      break;
    case 'storm':
      center += Math.sin(phase * 1.7) * 20;
      break;
    default:
      break;
  }
  gap = Math.max(168, gap);
  const minCenter = 64 + gap / 2;
  const maxCenter = H - 64 - gap / 2;
  center = Math.max(minCenter, Math.min(maxCenter, center));
  return { center, gap, top: center - gap / 2, bottom: center + gap / 2 };
}

function getEnvironmentalForce() {
  let force = 0;
  for (const obstacle of obstacles) {
    const inField = cow.x > obstacle.x - 150 && cow.x < obstacle.x + obstacle.width + 45;
    if (!inField || !['rate', 'fx', 'storm', 'earnings'].includes(obstacle.kind)) continue;
    if (!obstacle.zoneEntered) {
      obstacle.zoneEntered = true;
      if (hedgeCharges > 0) {
        hedgeCharges -= 1;
        obstacle.hedged = true;
        addFeed('hedge', '风险减震 70%');
      }
    }
    const reduction = obstacle.hedged ? 0.3 : 1;
    if (obstacle.kind === 'rate') force += obstacle.direction * 44 * reduction;
    if (obstacle.kind === 'earnings') force += obstacle.direction * 30 * reduction;
    if (obstacle.kind === 'fx') force += Math.sin(elapsed * 5 + obstacle.seed) * 68 * reduction;
    if (obstacle.kind === 'storm') force += Math.sin(elapsed * 7 + obstacle.seed) * 54 * reduction;
  }
  return force * (steadyMode ? 0.75 : 1);
}

function getSafeGateY(x) {
  // If a gate shares horizontal space with a wall, place it inside the same
  // corridor the full sprite can traverse. This prevents unreachable trades.
  const corridorMargin = Math.max(-COW_HITBOX.top, COW_HITBOX.bottom) + 4;
  let minY = 52;
  let maxY = H - 52;
  let constrained = false;
  for (const obstacle of obstacles) {
    if (x + GATE_HIT_RADIUS <= obstacle.x || x - GATE_HIT_RADIUS >= obstacle.x + obstacle.width) continue;
    const geometry = getObstacleGeometry(obstacle);
    constrained = true;
    minY = Math.max(minY, geometry.top + corridorMargin);
    maxY = Math.min(maxY, geometry.bottom - corridorMargin);
  }
  if (constrained && minY <= maxY) return minY + seededRandom() * (maxY - minY);
  if (constrained) return Math.max(52, Math.min(H - 52, (minY + maxY) / 2));
  const anchor = obstacles[obstacles.length - 1];
  if (anchor) {
    const geometry = getObstacleGeometry(anchor);
    const safeMin = geometry.top + corridorMargin;
    const safeMax = geometry.bottom - corridorMargin;
    if (safeMin <= safeMax) {
      const midpoint = (safeMin + safeMax) / 2;
      const reachableSpread = Math.min((safeMax - safeMin) / 2, 68);
      return midpoint + (seededRandom() * 2 - 1) * reachableSpread;
    }
  }
  return 118 + seededRandom() * (H - 236);
}

function keepGatesInCorridor() {
  const corridorMargin = Math.max(-COW_HITBOX.top, COW_HITBOX.bottom) + 4;
  for (const gate of gates) {
    if (gate.taken) continue;
    let minY = 52;
    let maxY = H - 52;
    let constrained = false;
    for (const obstacle of obstacles) {
      if (gate.x + GATE_HIT_RADIUS <= obstacle.x || gate.x - GATE_HIT_RADIUS >= obstacle.x + obstacle.width) continue;
      const geometry = getObstacleGeometry(obstacle);
      constrained = true;
      minY = Math.max(minY, geometry.top + corridorMargin);
      maxY = Math.min(maxY, geometry.bottom - corridorMargin);
    }
    if (!constrained) continue;
    gate.y = minY <= maxY
      ? Math.max(minY, Math.min(maxY, gate.y))
      : Math.max(52, Math.min(H - 52, (minY + maxY) / 2));
  }
}

function spawnWorld() {
  const level = LEVEL_CONFIGS[currentLevel];
  const lastObstacle = obstacles[obstacles.length - 1];
  const worldX = W + 40;
  // Ease into tighter, closer and more varied corridors instead of starting with random spikes.
  const difficulty = Math.pow(Math.max(0, Math.min(1, progress / level.rampAt)), 1.35);
  const obstacleSpacing = level.spacingStart - (level.spacingStart - level.spacingEnd) * difficulty;
  if (!lastObstacle || lastObstacle.x < W - obstacleSpacing) {
    const gap = level.startGap - (level.startGap - level.endGap) * difficulty + seededRandom() * 8 - 4 + (steadyMode ? 24 : 0);
    const obstacleWidth = Math.round(level.obstacleWidthStart + (level.obstacleWidthEnd - level.obstacleWidthStart) * difficulty);
    const centerMin = 64 + gap / 2;
    const centerMax = H - 64 - gap / 2;
    const maxCenterShift = level.centerShiftStart + (level.centerShiftEnd - level.centerShiftStart) * difficulty;
    const previousCenter = lastObstacle ? lastObstacle.center : H * 0.5;
    const center = Math.max(centerMin, Math.min(centerMax, previousCenter + (seededRandom() * 2 - 1) * maxCenterShift));
    const risk = RISK_DEFS[level.risks[obstacleId % level.risks.length]];
    lastSpawnDiagnostics = { difficulty, obstacleSpacing, gap, obstacleWidth, centerMin, centerMax, maxCenterShift, previousCenter, center, progress, level: currentLevel + 1 };
    obstacleId += 1;
    obstacles.push({ x: worldX, width: obstacleWidth, center, gap, seed: seededRandom() * 10, direction: obstacleId % 2 ? 1 : -1, ...risk });
  }
  const lastGate = gates[gates.length - 1];
  if (!lastGate || lastGate.x < W - level.gateSpacing) {
    const type = level.gates[gateId % level.gates.length];
    const action = gateId % 2 === 0 ? 'buy' : 'sell';
    gateId += 1;
    // Keep modules between risks with enough clear air for the player to
    // leave one corridor, adjust altitude and deliberately collect them.
    const gateX = worldX + 260;
    gates.push({ x: gateX, y: getSafeGateY(gateX), type, action, taken: false, pulse: seededRandom() * Math.PI * 2 });
  }
  const chipThresholds = [0.3, 0.68];
  if (nextChipIndex < chipThresholds.length && progress >= chipThresholds[nextChipIndex]) {
    const chipX = W + 115;
    gates.push({ x: chipX, y: getSafeGateY(chipX), type: 'chip', action: 'collect', taken: false, pulse: seededRandom() * Math.PI * 2 });
    nextChipIndex += 1;
  }
  // Obstacles may be spawned after an existing gate, so re-check all visible
  // gates whenever the world composition changes.
  keepGatesInCorridor();
}

function moveWorld(dt) {
  const speed = getWorldSpeed();
  for (const obstacle of obstacles) obstacle.x -= speed * dt;
  for (const gate of gates) { gate.x -= speed * dt; gate.pulse += dt * 4; }
  while (obstacles.length && obstacles[0].x + obstacles[0].width < -30) obstacles.shift();
  while (gates.length && gates[0].x < -50) gates.shift();
  const bounds = getCowBounds();
  for (const obstacle of obstacles) {
    const geometry = getObstacleGeometry(obstacle);
    const verticalHit = bounds.top < geometry.top || bounds.bottom > geometry.bottom;
    const horizontalHit = bounds.right > obstacle.x && bounds.left < obstacle.x + obstacle.width;
    if (verticalHit && horizontalHit) {
      crash(bounds.top < geometry.top ? obstacle.top : obstacle.bottom);
      return;
    }
  }
}

function recordFlightTrace(dt) {
  const speed = getWorldSpeed();
  for (const point of flightTrace) point.x -= speed * dt;
  // End the chart just behind the sprite's torso so no line appears in front of it.
  flightTrace.push({ x: cow.x - COW_TRAIL_OFFSET, y: cow.y });
  while (flightTrace.length && flightTrace[0].x < -24) flightTrace.shift();
}

function collectGateHits() {
  for (const gate of gates) {
    if (gate.taken) continue;
    // Pickups are collected by the leading hand, matching the visible
    // Superman pose instead of waiting for the button to overlap the torso.
    const dx = cow.x + 44 - gate.x;
    const dy = cow.y - 13 - gate.y;
    const hitRadius = gate.type === 'chip' ? 30 : GATE_HIT_RADIUS;
    if (Math.hypot(dx, dy) < hitRadius) {
      gate.taken = true;
      applyGate(gate);
    }
  }
}

function executeTrade(side, amount, executionPrice = price, source = side) {
  if (side === 'buy') {
    holdings += amount;
    cash -= executionPrice * amount;
    addFeed(source, `+${amount} 股 @ ${executionPrice.toFixed(1)}`);
    return true;
  }
  const sold = Math.min(amount, holdings);
  if (sold <= 0) {
    addFeed(source, '空仓 · 未成交', 'invalid');
    return false;
  }
  holdings -= sold;
  cash += executionPrice * sold;
  addFeed(source, `-${sold} 股 @ ${executionPrice.toFixed(1)}`);
  return true;
}

function applyGate(gate) {
  const color = getGateColor(gate.type);
  let success = true;
  switch (gate.type) {
    case 'buy': success = executeTrade('buy', 1); break;
    case 'sell': success = executeTrade('sell', 1); break;
    case 'chase': success = executeTrade('buy', 2, price, 'chase'); break;
    case 'profit': success = executeTrade('sell', 2, price, 'profit'); break;
    case 'vol':
      insightText = previousPrice <= price ? '放量偏多 · 关注高位止盈' : '放量偏空 · 谨慎加仓';
      insightTimer = 3;
      addFeed('vol', insightText);
      break;
    case 'report':
      insightText = progress < 0.62 ? '财报超预期 · 波动将上扬' : '利好兑现 · 留意回撤';
      insightTimer = 4;
      addFeed('report', insightText);
      break;
    case 'hedge':
    case 'fxhedge':
      hedgeCharges += 1;
      addFeed(gate.type, `对冲就绪 ×${hedgeCharges}`);
      break;
    case 'leverage':
      settleLeverage();
      leverageActive = true;
      leverageEntry = price;
      leverageUnits = Math.max(1, holdings);
      addFeed('leverage', `敞口 ${leverageUnits} 股`);
      break;
    case 'deleverage':
      settleLeverage();
      addFeed('deleverage', '杠杆收益已结算');
      break;
    case 'market': {
      const executionPrice = price * (gate.action === 'buy' ? 1.015 : 0.985);
      success = executeTrade(gate.action, 1, executionPrice, 'market');
      break;
    }
    case 'limit':
      pendingOrders.push({ side: gate.action, lockedPrice: price, timer: 1.6 });
      addFeed('limit', `${gate.action === 'buy' ? '买入' : '卖出'}挂单 @ ${price.toFixed(1)}`);
      break;
    case 'exposure':
      settleExposure();
      exposureActive = true;
      exposureEntry = price;
      exposureUnits = Math.max(1, holdings * 0.35);
      exposureTimer = 8;
      addFeed('exposure', '收益敞口 8 秒');
      break;
    case 'circuit':
      circuitTimer = 2.5;
      addFeed('circuit', '市场减速 2.5 秒');
      break;
    case 'chip':
      chipsCollected = Math.min(totalChips, chipsCollected + 1);
      addFeed('chip', `研究芯片 ${chipsCollected}/${totalChips}`);
      break;
    default:
      break;
  }
  burst(gate.x, gate.y, success ? color : palette.muted, gate.type === 'chip' ? 16 : 10);
  playTone(success ? (GATE_DEFS[gate.type].tone === 'sell' ? 300 : 620) : 190, 0.09, success ? 'triangle' : 'square');
}

function showFinishOverlay() {
  ui.finishOverlay.hidden = false;
  // Move keyboard focus into the dialog so the next action is obvious and
  // screen readers do not remain on a now-hidden game control.
  requestAnimationFrame(() => ui.retryBtn?.focus());
}

function registerFailure(title, message, statusText) {
  const returnPct = getReturnPct();
  resultMode = 'failure';
  retryLevel = currentLevel;
  campaign.attempts[currentLevel] += 1;
  saveCampaign();
  ui.canvasStatusText.textContent = statusText;
  ui.finishKicker.textContent = 'MARKET RUN FAILED';
  ui.finishTitle.textContent = title;
  ui.finishText.textContent = message;
  ui.finishMetric.textContent = formatSigned(returnPct);
  ui.finishMetric.style.color = palette.coral;
  ui.finishStars.textContent = '☆☆☆';
  ui.finishStars.setAttribute('aria-label', '本关未通关');
  ui.finishReward.textContent = `距离目标还差 ${Math.max(0, LEVEL_CONFIGS[currentLevel].target - returnPct).toFixed(1)}%`;
  ui.retryLabel.textContent = `重试第 ${currentLevel + 1} 关`;
  ui.rerollBtn.hidden = campaign.attempts[currentLevel] < 2;
  ui.steadyBtn.hidden = campaign.attempts[currentLevel] < 3 || steadyMode;
  renderLevelMap();
  showFinishOverlay();
}

function crash(riskName = '市场波动') {
  if (gameOver) return;
  gameOver = true;
  gameStarted = false;
  lastRiskName = riskName;
  burst(cow.x, cow.y, palette.coral, 22);
  playTone(150, 0.18, 'sawtooth');
  registerFailure(`撞上${riskName}`, `本关进度保留在第 ${currentLevel + 1} 关，重试会沿用同一组行情。`, '飞行中断');
}

function finishGame() {
  if (gameOver) return;
  gameOver = true;
  gameStarted = false;
  ui.canvasStatusText.textContent = '已抵达终点';
  const returnPct = getReturnPct();
  const level = LEVEL_CONFIGS[currentLevel];
  const won = returnPct >= level.target;
  const completedLevel = currentLevel;
  const hasNextLevel = completedLevel < LEVEL_CONFIGS.length - 1;
  if (!won) {
    playTone(240, 0.18, 'triangle');
    registerFailure('收益未达标', `最终 ${formatSigned(returnPct)}，目标是 +${level.target.toFixed(1)}%。调整交易时机后重试本关。`, '收益未达标');
    return;
  }

  settleLeverage();
  settleExposure();
  const stars = calculateStars(returnPct);
  const firstClear = !campaign.cleared[completedLevel];
  const coinsEarned = firstClear ? level.reward : Math.round(level.reward * 0.2);
  campaign.cleared[completedLevel] = true;
  campaign.stars[completedLevel] = Math.max(campaign.stars[completedLevel], stars);
  campaign.bestReturns[completedLevel] = Math.max(campaign.bestReturns[completedLevel] ?? -Infinity, returnPct);
  campaign.coins += coinsEarned;
  campaign.attempts[completedLevel] = 0;
  if (hasNextLevel) campaign.unlocked = Math.max(campaign.unlocked, completedLevel + 1);
  else campaign.endlessUnlocked = true;
  campaign.lastLevel = hasNextLevel ? completedLevel + 1 : completedLevel;
  saveCampaign();

  resultMode = 'success';
  ui.finishKicker.textContent = firstClear ? 'FIRST CLEAR' : 'RUN COMPLETE';
  ui.finishTitle.textContent = hasNextLevel ? '收益达标' : '全部关卡完成';
  ui.finishText.textContent = hasNextLevel ? `第 ${completedLevel + 1} 关完成，已解锁“${LEVEL_CONFIGS[completedLevel + 1].name}”。` : '十段行情全部收盘，无尽行情模式已解锁。';
  ui.finishMetric.textContent = formatSigned(returnPct);
  ui.finishMetric.style.color = palette.lime;
  ui.finishStars.textContent = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
  ui.finishStars.setAttribute('aria-label', `本关获得 ${stars} 星`);
  ui.finishReward.textContent = `${firstClear ? '首通奖励' : '重复通关'} · ${coinsEarned} 牛气币 · ${level.badge}`;
  retryLevel = hasNextLevel ? completedLevel + 1 : completedLevel;
  ui.retryLabel.textContent = hasNextLevel ? `进入第 ${retryLevel + 1} 关` : `再玩第 ${completedLevel + 1} 关`;
  ui.rerollBtn.hidden = true;
  ui.steadyBtn.hidden = true;
  playTone(760, 0.18, 'sine');
  updateCampaignMeta();
  renderLevelMap();
  showFinishOverlay();
}

function calculateStars(returnPct) {
  const target = LEVEL_CONFIGS[currentLevel].target;
  let stars = 1;
  if (returnPct >= target + 5) stars = 2;
  if (stars >= 2 && chipsCollected === totalChips && !steadyMode) stars = 3;
  return stars;
}

function getEquity() {
  return cash + holdings * price + getExtraPnl();
}

function getReturnPct() {
  return ((getEquity() / initialEquity) - 1) * 100;
}

function formatMoney(value) { return `¥${value.toFixed(2)}`; }
function formatSigned(value) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }

function updateUI() {
  const level = LEVEL_CONFIGS[currentLevel];
  const returnPct = getReturnPct();
  ui.levelProgress.style.width = `${Math.round(progress * 100)}%`;
  ui.distanceValue.textContent = `${Math.max(0, targetDistance - distance)}m`;
  ui.priceValue.textContent = formatMoney(price);
  const change = ((price / 100) - 1) * 100;
  ui.priceChange.textContent = formatSigned(change);
  ui.priceChange.classList.toggle('positive', change >= 0);
  ui.priceChange.classList.toggle('negative', change < 0);
  ui.holdingValue.textContent = String(holdings).padStart(2, '0');
  ui.marketValue.textContent = formatMoney(holdings * price);
  ui.pnlValue.textContent = `${getEquity() - initialEquity >= 0 ? '+' : '-'}¥${Math.abs(getEquity() - initialEquity).toFixed(2)}`;
  ui.pnlValue.classList.toggle('positive', returnPct >= 0);
  ui.pnlValue.classList.toggle('negative', returnPct < 0);
  ui.cashValue.textContent = formatMoney(cash);
  ui.returnValue.textContent = formatSigned(returnPct);
  ui.returnValue.classList.toggle('positive', returnPct >= 0);
  ui.returnValue.classList.toggle('negative', returnPct < 0);
  const fill = Math.max(0, Math.min(returnPct / level.target, 1)) * 100;
  ui.missionFill.style.width = `${fill}%`;
  ui.missionCurrent.textContent = `当前 ${formatSigned(returnPct)}`;
  updateMarketReadouts();
  drawMiniChart();
  if (debugMode && ui.gameDebug) ui.gameDebug.textContent = JSON.stringify(getDebugSnapshot());
}

function updateMarketReadouts() {
  const upcoming = obstacles
    .filter((obstacle) => obstacle.x + obstacle.width > cow.x)
    .sort((a, b) => a.x - b.x)[0];
  if (insightTimer > 0) {
    ui.eventText.textContent = insightText;
  } else if (upcoming) {
    const seconds = Math.max(0, (upcoming.x - cow.x) / Math.max(1, getWorldSpeed()));
    ui.eventText.textContent = `${upcoming.top} / ${upcoming.bottom} · ${seconds.toFixed(1)}s`;
  } else {
    ui.eventText.textContent = LEVEL_CONFIGS[currentLevel].objective;
  }

  if (circuitTimer > 0) ui.marketStateText.textContent = `市场熔断 ${circuitTimer.toFixed(1)}s`;
  else if (leverageActive) ui.marketStateText.textContent = `杠杆 ×2 · 保证金 ${Math.round(marginRatio)}%`;
  else if (pendingOrders.length) ui.marketStateText.textContent = `限价单等待 · ${pendingOrders[0].timer.toFixed(1)}s`;
  else if (hedgeCharges > 0) ui.marketStateText.textContent = `对冲就绪 ×${hedgeCharges}`;
  else if (exposureActive) ui.marketStateText.textContent = `汇率敞口 · ${exposureTimer.toFixed(1)}s`;
  else ui.marketStateText.textContent = `${steadyMode ? '稳健模式 · ' : ''}研究芯片 ${chipsCollected}/${totalChips}`;
}

function updateLevelDisplay() {
  const level = LEVEL_CONFIGS[currentLevel];
  if (ui.levelName) ui.levelName.textContent = level.name;
  if (ui.levelNumber) ui.levelNumber.textContent = String(currentLevel + 1).padStart(2, '0');
  if (ui.cabinetNumber) ui.cabinetNumber.textContent = String(currentLevel + 1).padStart(2, '0');
  if (ui.afterIndex) ui.afterIndex.textContent = `${String(currentLevel + 1).padStart(2, '0')} / ${String(LEVEL_CONFIGS.length).padStart(2, '0')}`;
  ui.stageKicker.textContent = `LEVEL ${String(currentLevel + 1).padStart(2, '0')} / ${level.objective}`;
  ui.stageTitle.textContent = level.name;
  ui.stageDescription.textContent = level.description;
  ui.launchLabel.textContent = `开始第 ${currentLevel + 1} 关`;
  ui.targetValue.textContent = `+${level.target}%`;
  ui.missionTitle.textContent = level.name;
  ui.missionDescription.textContent = level.objective;
  ui.missionTarget.textContent = `+${level.target}%`;
  ui.missionTargetText.textContent = `目标线 +${level.target.toFixed(1)}%`;
  updateCampaignMeta();
}

function renderSignalFeed() {
  const events = eventFeed.length
    ? eventFeed
    : [...new Set(LEVEL_CONFIGS[currentLevel].gates)].slice(0, 3).map((type) => ({ type, detail: GATE_DEFS[type].name }));
  const rows = events.map((event) => {
    const definition = GATE_DEFS[event.type] || GATE_DEFS.buy;
    return `<div class="signal-row signal-${definition.tone}${event.status === 'invalid' ? ' signal-invalid' : ''}">
      <span class="signal-icon">${definition.icon}</span>
      <span><strong>${definition.label}</strong></span>
      <em>${event.detail}</em>
    </div>`;
  }).join('');
  ui.signalList.innerHTML = rows;
}

function addFeed(type, detail = GATE_DEFS[type]?.name || '', status = 'success') {
  eventFeed.unshift({ type, detail, status });
  eventFeed = eventFeed.slice(0, 3);
  renderSignalFeed();
}

function updateCampaignMeta() {
  ui.coinValue.textContent = String(campaign.coins).padStart(4, '0');
  ui.starTotal.textContent = String(campaign.stars.reduce((sum, value) => sum + value, 0)).padStart(2, '0');
}

function renderLevelMap() {
  ui.levelMapList.innerHTML = LEVEL_CONFIGS.map((level, index) => {
    const locked = index > campaign.unlocked;
    const stars = campaign.stars[index];
    const classes = ['level-node', index === currentLevel ? 'is-current' : '', campaign.cleared[index] ? 'is-cleared' : ''].filter(Boolean).join(' ');
    return `<button class="${classes}" type="button" data-level="${index}" ${locked || gameStarted ? 'disabled' : ''} aria-label="${locked ? `第 ${index + 1} 关未解锁` : `选择第 ${index + 1} 关 ${level.name}，${stars} 星`}" ${index === currentLevel ? 'aria-current="step"' : ''}>
      <b>${String(index + 1).padStart(2, '0')}</b><strong>${locked ? '未解锁' : level.name}</strong><small>${locked ? 'LOCKED' : `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`}</small>
    </button>`;
  }).join('');
  ui.levelMapList.querySelectorAll('[data-level]').forEach((button) => {
    button.addEventListener('click', () => selectLevel(Number(button.dataset.level)));
  });
}

function selectLevel(levelIndex) {
  if (levelIndex > campaign.unlocked || gameStarted) return;
  steadyMode = false;
  resetGame(levelIndex, { newSeed: true, steady: false });
  document.getElementById('game').scrollIntoView({ behavior: 'smooth', block: 'start' });
  requestAnimationFrame(() => document.getElementById('launchBtn').focus());
}

function updateParticles(dt) {
  for (const particle of particles) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt; }
  while (particles.length && particles[0].life <= 0) particles.shift();
}

function burst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 130;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5 + Math.random() * 0.5, maxLife: 1, color });
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackdrop();
  drawMarketFields();
  drawPricePath();
  drawObstacles();
  drawGates();
  drawParticles();
  drawCow();
}

function getGateColor(type) {
  const tone = GATE_DEFS[type]?.tone;
  if (tone === 'buy' || tone === 'chip') return palette.lime;
  if (tone === 'sell') return palette.coral;
  if (tone === 'warn') return palette.orange;
  return palette.blue;
}

function getCanvasUiScale() {
  const displayedWidth = canvas.getBoundingClientRect().width;
  if (!displayedWidth) return 1;
  // Canvas text is rendered in the fixed 960px game coordinate system. Scale
  // labels up on narrow screens so they remain readable after CSS downscaling.
  return Math.max(1, Math.min(3, W / displayedWidth));
}

function drawBackdrop() {
  ctx.fillStyle = palette.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  const plotLeft = Math.round(46 * getCanvasUiScale());
  for (let x = plotLeft; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 0; y <= H - 48; y += 54) { ctx.beginPath(); ctx.moveTo(plotLeft, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  ctx.strokeStyle = '#323846';
  ctx.beginPath(); ctx.moveTo(plotLeft + 0.5, 0); ctx.lineTo(plotLeft + 0.5, H - 48); ctx.stroke();
  ctx.fillStyle = palette.chartText;
  const uiScale = getCanvasUiScale();
  ctx.font = `${Math.round(10 * uiScale)}px Manrope, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [130, 120, 110, 100, 90, 80, 70].forEach((value, index) => ctx.fillText(value.toFixed(2), plotLeft - 7, 20 + index * 54));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ['09:30', '09:35', '09:40', '09:45'].forEach((label, index) => ctx.fillText(label, plotLeft + 22 + index * 220, H - 15));
  for (let i = 0; i < 15; i++) {
    const height = 18 + ((i * 37) % 86);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(242, 54, 69, 0.11)' : 'rgba(8, 153, 129, 0.11)';
    ctx.fillRect(i * 76 + 22, H - height, 18, height);
  }
  ctx.fillStyle = 'rgba(239, 83, 80, 0.06)';
  ctx.fillRect(plotLeft, 0, W - plotLeft, 32);
}

function drawMarketFields() {
  for (const obstacle of obstacles) {
    if (!['rate', 'earnings', 'fx', 'storm'].includes(obstacle.kind)) continue;
    const geometry = getObstacleGeometry(obstacle);
    const startX = Math.round(obstacle.x - 145);
    const endX = Math.round(obstacle.x);
    if (endX < 0 || startX > W) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(startX, geometry.top, endX - startX, geometry.gap);
    ctx.clip();
    ctx.globalAlpha = obstacle.hedged ? 0.08 : 0.17;
    ctx.strokeStyle = obstacle.direction > 0 ? palette.coral : palette.blue;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    for (let y = geometry.top + 24; y < geometry.bottom; y += 34) {
      const offset = ((elapsed * 70 + obstacle.seed * 11) % 32);
      ctx.beginPath();
      ctx.moveTo(startX + offset, y);
      ctx.lineTo(endX - 10, y);
      ctx.stroke();
      const arrowY = y + obstacle.direction * 6;
      ctx.fillRect(endX - 16, arrowY, 6, 6);
    }
    ctx.restore();
  }
}

function drawPricePath() {
  if (flightTrace.length < 2) return;
  const plotLeft = Math.round(46 * getCanvasUiScale());
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'square';
  for (let index = 1; index < flightTrace.length; index++) {
    const from = flightTrace[index - 1];
    const to = flightTrace[index];
    const fromX = Math.round(from.x);
    const toX = Math.round(to.x);
    if (toX < plotLeft || fromX > W) continue;
    const fromY = Math.round(from.y / 4) * 4;
    const toY = Math.round(to.y / 4) * 4;
    ctx.strokeStyle = toY < fromY ? palette.chartRed : palette.chartGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  }
  const last = flightTrace[flightTrace.length - 1];
  if (last && last.x < cow.x - 18) {
    ctx.fillStyle = cow.vy <= 0 ? palette.chartRed : palette.chartGreen;
    ctx.fillRect(Math.round(last.x) - 2, Math.round(last.y) - 2, 5, 5);
  }
  ctx.restore();
}

function drawObstacles() {
  const uiScale = getCanvasUiScale();
  const capHeight = Math.max(16, Math.round(16 * uiScale));
  for (const obstacle of obstacles) {
    const geometry = getObstacleGeometry(obstacle);
    const topHeight = geometry.top;
    const bottomY = geometry.bottom;
    const x = Math.round(obstacle.x);
    ctx.save();
    if (obstacle.kind === 'liquidity') ctx.globalAlpha = 0.58 + (Math.sin(elapsed * 8 + obstacle.seed) + 1) * 0.16;
    ctx.fillStyle = palette.inkSoft;
    ctx.fillRect(x, 0, obstacle.width, topHeight);
    ctx.fillRect(x, bottomY, obstacle.width, H - bottomY);
    ctx.fillStyle = '#334253';
    ctx.fillRect(x, 0, 5, topHeight);
    ctx.fillRect(x + obstacle.width - 5, 0, 5, topHeight);
    ctx.fillRect(x, bottomY, 5, H - bottomY);
    ctx.fillRect(x + obstacle.width - 5, bottomY, 5, H - bottomY);
    const capWidth = Math.max(obstacle.width + 14, Math.round(92 * uiScale));
    const capX = x + obstacle.width - capWidth + 7;
    ctx.fillStyle = palette.coral;
    ctx.fillRect(capX, topHeight - capHeight, capWidth, capHeight);
    ctx.fillStyle = palette.orange;
    ctx.fillRect(capX, bottomY, capWidth, capHeight);
    ctx.fillStyle = '#20303e';
    for (let y = 16; y < topHeight - 20; y += 28) ctx.fillRect(x + 12, y, obstacle.width - 24, 6);
    for (let y = bottomY + 22; y < H; y += 28) ctx.fillRect(x + 12, y, obstacle.width - 24, 6);
    ctx.fillStyle = palette.orange;
    ctx.fillRect(x - 7, topHeight - 5, 8, 5);
    ctx.fillRect(x + obstacle.width - 1, bottomY, 8, 5);

    drawRiskPattern(obstacle, x, topHeight, bottomY);

    // Risk names sit on the entry caps so they stay legible without adding UI chrome.
    const labelX = capX + capWidth / 2;
    ctx.fillStyle = palette.ink;
    ctx.font = `700 ${Math.round(8 * uiScale)}px "ZCOOL QingKe HuangYou", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obstacle.top, Math.round(labelX), Math.round(topHeight - capHeight / 2));
    ctx.fillText(obstacle.bottom, Math.round(labelX), Math.round(bottomY + capHeight / 2));
    ctx.restore();
  }
}

function drawRiskPattern(obstacle, x, topHeight, bottomY) {
  const width = obstacle.width;
  ctx.save();
  ctx.globalAlpha *= 0.75;
  if (obstacle.kind === 'volume') {
    ctx.fillStyle = palette.chartRed;
    for (let y = 18; y < topHeight - 25; y += 22) ctx.fillRect(x + 10, y, Math.max(8, width - 20), 5);
    ctx.fillStyle = palette.chartGreen;
    for (let y = bottomY + 22; y < H; y += 22) ctx.fillRect(x + 10, y, Math.max(8, width - 20), 5);
  } else if (obstacle.kind === 'bubble') {
    ctx.strokeStyle = palette.orangeLight;
    ctx.lineWidth = 3;
    for (let y = 20; y < topHeight - 20; y += 32) { ctx.beginPath(); ctx.arc(x + width / 2, y, 8, 0, Math.PI * 2); ctx.stroke(); }
    for (let y = bottomY + 25; y < H; y += 32) { ctx.beginPath(); ctx.arc(x + width / 2, y, 8, 0, Math.PI * 2); ctx.stroke(); }
  } else if (obstacle.kind === 'leverage') {
    ctx.fillStyle = palette.coral;
    for (let y = 18; y < topHeight - 20; y += 26) ctx.fillRect(x + 8, y, Math.max(10, width - 16), 3);
    for (let y = bottomY + 20; y < H; y += 26) ctx.fillRect(x + 8, y, Math.max(10, width - 16), 3);
  } else if (obstacle.kind === 'fx') {
    ctx.fillStyle = palette.blue;
    for (let y = 16; y < topHeight - 18; y += 24) ctx.fillRect(x + (y % 12), y, Math.max(9, width - 20), 4);
    for (let y = bottomY + 18; y < H; y += 24) ctx.fillRect(x + (y % 12), y, Math.max(9, width - 20), 4);
  } else if (obstacle.kind === 'storm' || obstacle.kind === 'earnings') {
    ctx.strokeStyle = palette.coral;
    ctx.lineWidth = 3;
    for (let y = 20; y < topHeight - 24; y += 40) { ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + width - 8, y + 10); ctx.lineTo(x + 12, y + 20); ctx.stroke(); }
    for (let y = bottomY + 20; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + width - 8, y + 10); ctx.lineTo(x + 12, y + 20); ctx.stroke(); }
  }
  ctx.restore();
}

function drawGates() {
  for (const gate of gates) {
    if (gate.taken) continue;
    const definition = GATE_DEFS[gate.type];
    const color = getGateColor(gate.type);
    const pulse = Math.sin(gate.pulse) > 0 ? 2 : 0;
    ctx.save();
    if (LEVEL_CONFIGS[currentLevel].risks.includes('liquidity')) ctx.globalAlpha = 0.68 + (Math.sin(gate.pulse * 2) + 1) * 0.16;
    ctx.translate(Math.round(gate.x), Math.round(gate.y));
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-25 - pulse, -25 - pulse, 50 + pulse * 2, 50 + pulse * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-23 - pulse, -23 - pulse, 46 + pulse * 2, 46 + pulse * 2);
    ctx.fillStyle = color;
    ctx.fillRect(-19, -19, 7, 7);
    ctx.fillRect(12, -19, 7, 7);
    ctx.fillRect(-19, 12, 7, 7);
    ctx.fillRect(12, 12, 7, 7);
    ctx.font = `700 ${definition.label.length > 5 ? 7 : 9}px Silkscreen, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(definition.label, 0, gate.type === 'market' || gate.type === 'limit' ? -4 : 0);
    if (gate.type === 'market' || gate.type === 'limit') {
      ctx.font = '700 9px Silkscreen, monospace';
      ctx.fillText(gate.action === 'buy' ? '↑' : '↓', 0, 10);
    }
    if (gate.type === 'chip') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
    }
    ctx.restore();
  }
}

function drawCow() {
  if (thrusting) {
    ctx.fillStyle = 'rgba(247, 163, 60, 0.62)';
    ctx.fillRect(Math.round(cow.x - 91), Math.round(cow.y - 8), 18, 4);
    ctx.fillRect(Math.round(cow.x - 102), Math.round(cow.y + 8), 14, 4);
  }
  drawFlyingCowSprite(ctx, cow.x, cow.y, 2.6, elapsed, cow.vy);
}

function drawFlyingCowSprite(g, x, y, unit, time = 0, velocity = 0) {
  const colors = {
    outline: '#3c2a23',
    outlineSoft: '#624338',
    yellow: '#e3a40c',
    yellowLight: '#ffd24a',
    yellowHighlight: '#ffe47d',
    yellowShade: '#b9780c',
    yellowDeep: '#925d0b',
    horn: '#716c65',
    hornLight: '#aaa398',
    hornShade: '#4f4c49',
    earInner: '#d88971',
    muzzle: '#e4a39d',
    muzzleLight: '#ffd0c7',
    lip: '#915c5a',
    nostril: '#704449',
    hoof: '#ead8bd',
    hoofLight: '#fff0d6',
    hoofDark: '#694a3b',
    eye: '#f8e9c7',
    pupil: '#282421',
  };
  const kick = Math.sin(time * 9) > 0 ? 1 : 0;
  const tailLift = Math.sin(time * 7) > 0 ? -1 : 0;
  const pitch = Math.max(-0.17, Math.min(0.17, velocity * 0.018));
  const pixel = Math.max(2, Math.round(unit));
  const r = (col, row, width, height, color) => {
    g.fillStyle = color;
    g.fillRect((col - 24) * pixel, (row - 16) * pixel, width * pixel, height * pixel);
  };
  const p = (col, row, color) => r(col, row, 1, 1, color);

  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.rotate(pitch);
  g.imageSmoothingEnabled = false;

  // Tail and rear legs sit behind the torso to keep the flying silhouette readable.
  r(4, 13 + tailLift, 10, 3, colors.outline);
  r(6, 13 + tailLift, 8, 1, colors.yellowShade);
  r(1, 12 + tailLift, 5, 4, colors.hoofDark);
  p(0, 13 + tailLift, colors.outline);

  r(5, 16 + kick, 13, 5, colors.outline);
  r(6, 16 + kick, 12, 3, colors.yellowShade);
  r(1, 17 + kick, 6, 5, colors.outline);
  r(2, 17 + kick, 5, 3, colors.hoof);
  r(1, 20 + kick, 3, 2, colors.hoofDark);
  r(8, 21 - kick, 12, 5, colors.outline);
  r(9, 21 - kick, 11, 3, colors.yellow);
  r(4, 23 - kick, 6, 5, colors.outline);
  r(5, 23 - kick, 5, 3, colors.hoofLight);
  r(4, 26 - kick, 3, 2, colors.hoofDark);

  // The plush torso uses stepped edges and scattered highlights rather than a flat oval.
  r(15, 8, 12, 2, colors.outline);
  r(13, 10, 17, 3, colors.outline);
  r(12, 13, 19, 7, colors.outline);
  r(14, 20, 15, 4, colors.outline);
  r(16, 9, 10, 2, colors.yellowLight);
  r(14, 11, 14, 3, colors.yellow);
  r(13, 14, 16, 6, colors.yellow);
  r(15, 20, 13, 3, colors.yellowShade);
  r(16, 12, 3, 6, colors.yellowLight);
  p(20, 10, colors.yellowHighlight);
  p(22, 13, colors.yellowShade);
  p(14, 16, colors.yellowShade);
  p(24, 18, colors.yellowLight);
  p(18, 21, colors.yellowLight);

  // Back arm reaches forward above the face, with an ivory hand from the turnaround.
  r(23, 7, 9, 5, colors.outline);
  r(30, 5, 10, 5, colors.outline);
  r(38, 4, 10, 5, colors.outline);
  r(24, 8, 8, 3, colors.yellowShade);
  r(31, 6, 9, 3, colors.yellow);
  r(39, 5, 8, 3, colors.hoof);
  r(46, 5, 3, 3, colors.hoofLight);
  p(48, 7, colors.hoofDark);
  p(34, 7, colors.yellowHighlight);
  p(38, 6, colors.yellowShade);

  // Pointed ear and curved grey horn establish the reference character in profile.
  r(21, 4, 8, 5, colors.outline);
  r(17, 5, 6, 4, colors.outline);
  r(18, 6, 5, 2, colors.yellowLight);
  r(17, 7, 6, 2, colors.earInner);
  p(17, 8, colors.yellowShade);
  r(23, 1, 7, 6, colors.outline);
  r(22, -2, 6, 5, colors.outline);
  r(24, -4, 5, 4, colors.outline);
  r(25, -3, 3, 3, colors.hornLight);
  r(24, 0, 5, 4, colors.horn);
  p(29, 4, colors.hornShade);
  p(23, -1, colors.hornLight);
  p(26, 1, colors.hornShade);
  p(27, -4, colors.hornLight);
  p(24, -2, colors.hornShade);
  r(19, 8, 4, 2, colors.earInner);
  p(18, 8, colors.yellowHighlight);

  // Side-profile head: half-lidded eye, broad pink muzzle and a small lower lip.
  r(23, 3, 13, 2, colors.outline);
  r(21, 5, 18, 9, colors.outline);
  r(23, 14, 17, 5, colors.outline);
  r(24, 4, 11, 2, colors.yellowLight);
  r(22, 6, 16, 8, colors.yellow);
  r(24, 14, 15, 4, colors.yellowShade);
  r(28, 7, 8, 2, colors.outlineSoft);
  r(29, 8, 7, 2, colors.eye);
  r(32, 8, 2, 2, colors.pupil);
  r(28, 7, 7, 1, colors.outline);
  p(29, 9, colors.pupil);
  p(28, 6, colors.outlineSoft);
  p(35, 10, colors.yellowHighlight);
  r(35, 10, 14, 7, colors.outline);
  r(37, 9, 10, 1, colors.outline);
  r(36, 10, 12, 6, colors.muzzle);
  r(38, 10, 9, 2, colors.muzzleLight);
  p(38, 11, colors.nostril);
  p(44, 11, colors.nostril);
  p(41, 12, colors.muzzleLight);
  r(37, 15, 10, 1, colors.lip);
  r(39, 16, 8, 2, colors.outline);
  r(40, 16, 6, 1, colors.muzzle);
  p(41, 14, colors.muzzleLight);
  p(45, 15, colors.lip);

  // Front arm is deliberately lower so both Superman-style arms remain distinct.
  r(27, 16, 8, 6, colors.outline);
  r(33, 17, 11, 5, colors.outline);
  r(42, 17, 8, 5, colors.outline);
  r(28, 17, 7, 4, colors.yellowLight);
  r(34, 18, 10, 3, colors.yellow);
  r(43, 18, 7, 3, colors.hoofLight);
  p(49, 21, colors.hoofDark);
  p(38, 19, colors.yellowHighlight);
  p(41, 18, colors.yellowShade);

  // Single-pixel plush flecks keep the higher-resolution sprite tactile at 1:1 scale.
  p(17, 15, colors.yellowHighlight);
  p(20, 17, colors.yellowShade);
  p(26, 11, colors.yellowLight);
  p(26, 15, colors.outlineSoft);
  p(31, 12, colors.yellowShade);
  p(22, 16, colors.yellowHighlight);
  p(24, 19, colors.yellowDeep);
  p(27, 20, colors.yellowLight);
  p(12, 18, colors.yellowDeep);
  p(15, 22, colors.yellowShade);
  p(18, 23, colors.yellowHighlight);
  g.restore();
}

function drawCowSprite(g, x, y, unit, time = 0, velocity = 0) {
  const colors = {
    outline: '#3c2a23',
    outlineSoft: '#624338',
    yellow: '#e3a40c',
    yellowLight: '#ffd24a',
    yellowHighlight: '#ffe47d',
    yellowShade: '#b9780c',
    yellowDeep: '#925d0b',
    horn: '#716c65',
    hornLight: '#aaa398',
    hornShade: '#4f4c49',
    earInner: '#d88971',
    muzzle: '#e4a39d',
    muzzleLight: '#ffd0c7',
    lip: '#915c5a',
    nostril: '#704449',
    hoof: '#ead8bd',
    hoofLight: '#fff0d6',
    hoofDark: '#694a3b',
    eye: '#f8e9c7',
    pupil: '#282421',
  };
  const bob = Math.sin(time * 8) > 0 ? 1 : 0;
  const armLift = velocity < -1 ? -1 : velocity > 2 ? 1 : 0;
  const tailLift = Math.sin(time * 6) > 0 ? -1 : 0;
  const pixel = Math.max(1, Math.round(unit));
  const r = (col, row, width, height, color) => {
    g.fillStyle = color;
    g.fillRect((col - 18) * pixel, (row - 18) * pixel, width * pixel, height * pixel);
  };
  const p = (col, row, color) => r(col, row, 1, 1, color);

  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.imageSmoothingEnabled = false;

  // The long yellow tail and dark tuft remain visible behind the pear-shaped body.
  r(27, 24 + tailLift, 4, 16, colors.outline);
  r(28, 24 + tailLift, 2, 15, colors.yellowShade);
  r(28, 38 + tailLift, 5, 6, colors.outline);
  r(29, 39 + tailLift, 3, 4, colors.hoofDark);

  // Broad outward horns and pointed ears follow the supplied turnaround silhouette.
  r(9, -4, 5, 7, colors.outline);
  r(7, -6, 5, 5, colors.outline);
  r(8, -5, 3, 4, colors.hornLight);
  r(10, -1, 3, 4, colors.horn);
  p(12, 2, colors.hornShade);
  r(22, -4, 5, 7, colors.outline);
  r(24, -6, 5, 5, colors.outline);
  r(25, -5, 3, 4, colors.hornLight);
  r(23, -1, 3, 4, colors.horn);
  p(23, 2, colors.hornShade);
  r(3, 5, 8, 5, colors.outline);
  r(4, 6, 6, 3, colors.yellowLight);
  r(4, 7, 5, 2, colors.earInner);
  r(25, 5, 8, 5, colors.outline);
  r(26, 6, 6, 3, colors.yellowLight);
  r(27, 7, 5, 2, colors.earInner);

  // Wide head, sleepy brows and oversized pink muzzle are the character's identity anchors.
  r(10, 1, 16, 2, colors.outline);
  r(8, 3, 20, 4, colors.outline);
  r(7, 7, 22, 10, colors.outline);
  r(9, 17, 18, 5, colors.outline);
  r(11, 2, 14, 2, colors.yellowLight);
  r(9, 4, 18, 4, colors.yellowLight);
  r(8, 8, 20, 9, colors.yellow);
  r(10, 17, 16, 4, colors.yellowShade);
  r(10, 8, 7, 2, colors.outlineSoft);
  r(20, 8, 7, 2, colors.outlineSoft);
  r(11, 10, 6, 3, colors.eye);
  r(20, 10, 6, 3, colors.eye);
  r(13, 11, 3, 2, colors.pupil);
  r(21, 11, 3, 2, colors.pupil);
  r(10, 9, 7, 1, colors.outline);
  r(20, 9, 7, 1, colors.outline);
  p(12, 10, colors.yellowHighlight);
  p(24, 10, colors.yellowHighlight);
  r(9, 13, 19, 9, colors.outline);
  r(10, 13, 17, 8, colors.muzzle);
  r(12, 13, 13, 3, colors.muzzleLight);
  p(13, 15, colors.nostril);
  p(23, 15, colors.nostril);
  r(12, 18, 13, 1, colors.lip);
  r(13, 20, 11, 1, colors.lip);
  p(18, 17, colors.muzzleLight);

  // Tall plush body widens at the belly like the reference character.
  r(11, 21, 15, 3, colors.outline);
  r(8, 24, 21, 10, colors.outline);
  r(6, 30, 25, 12, colors.outline);
  r(8, 41, 21, 5, colors.outline);
  r(12, 22, 13, 4, colors.yellowLight);
  r(9, 25, 19, 9, colors.yellow);
  r(7, 31, 23, 10, colors.yellow);
  r(9, 41, 19, 4, colors.yellowShade);
  r(10, 26, 4, 12, colors.yellowLight);
  p(18, 25, colors.yellowHighlight);
  p(23, 28, colors.yellowShade);
  p(9, 32, colors.yellowDeep);
  p(16, 34, colors.yellowHighlight);
  p(26, 36, colors.yellowDeep);
  p(12, 40, colors.yellowShade);
  p(21, 42, colors.yellowHighlight);

  // Arms hang low with pale hands; their slight lift keeps the idle sprite alive.
  r(4, 24 + armLift, 7, 16, colors.outline);
  r(5, 25 + armLift, 5, 14, colors.yellowShade);
  r(3, 38 + armLift, 8, 7, colors.outline);
  r(4, 39 + armLift, 6, 5, colors.hoof);
  p(4, 43 + armLift, colors.hoofDark);
  r(26, 24 - armLift, 7, 16, colors.outline);
  r(27, 25 - armLift, 5, 14, colors.yellowShade);
  r(26, 38 - armLift, 8, 7, colors.outline);
  r(27, 39 - armLift, 6, 5, colors.hoofLight);
  p(32, 43 - armLift, colors.hoofDark);

  // Separate legs and split dark hooves match the front view of the turnaround.
  r(9, 44, 9, 10 + bob, colors.outline);
  r(19, 44, 9, 11 - bob, colors.outline);
  r(10, 44, 7, 9 + bob, colors.yellow);
  r(20, 44, 7, 10 - bob, colors.yellow);
  r(8, 52 + bob, 11, 6, colors.outline);
  r(18, 53 - bob, 11, 6, colors.outline);
  r(9, 52 + bob, 9, 4, colors.hoof);
  r(19, 53 - bob, 9, 4, colors.hoofLight);
  r(9, 56 + bob, 4, 2, colors.hoofDark);
  r(15, 56 + bob, 3, 2, colors.hoofDark);
  r(19, 57 - bob, 4, 2, colors.hoofDark);
  r(25, 57 - bob, 3, 2, colors.hoofDark);

  g.restore();
}

function drawStaticCowCanvases() {
  const avatar = document.getElementById('cowAvatar');
  const portrait = document.getElementById('cowPortrait');
  if (avatar) {
    const avatarCtx = avatar.getContext('2d');
    avatarCtx.clearRect(0, 0, avatar.width, avatar.height);
    drawCowSprite(avatarCtx, avatar.width / 2, 28, 1, 0, 0);
  }
  if (portrait) {
    const portraitCtx = portrait.getContext('2d');
    portraitCtx.clearRect(0, 0, portrait.width, portrait.height);
    drawFlyingCowSprite(portraitCtx, portrait.width / 2, portrait.height / 2, 3, 0.25, -2);
  }
}

function drawParticles() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawMiniChart() {
  const width = miniCanvas.width;
  const height = miniCanvas.height;
  miniCtx.clearRect(0, 0, width, height);
  miniCtx.strokeStyle = 'rgba(185, 200, 214, 0.14)';
  miniCtx.lineWidth = 1;
  for (let y = 12; y < height; y += 16) { miniCtx.beginPath(); miniCtx.moveTo(0, y); miniCtx.lineTo(width, y); miniCtx.stroke(); }
  const min = Math.min(...priceHistory);
  const max = Math.max(...priceHistory);
  miniCtx.lineWidth = 2;
  const points = priceHistory.map((value, index) => {
    const x = (index / Math.max(1, priceHistory.length - 1)) * width;
    const y = height - 7 - ((value - min) / Math.max(0.1, max - min)) * (height - 14);
    return { x, y, value };
  });
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    // Match the main chart convention: red for rising segments, green for
    // falling segments. Each segment gets its own color instead of inheriting
    // the final quote direction.
    miniCtx.strokeStyle = to.value >= from.value ? palette.chartRed : palette.chartGreen;
    miniCtx.beginPath();
    miniCtx.moveTo(from.x, from.y);
    miniCtx.lineTo(to.x, to.y);
    miniCtx.stroke();
  }
}

function setThrust(value) { thrusting = value; }

function nudgeCow(direction) {
  if (!gameStarted || gameOver) return;
  const level = LEVEL_CONFIGS[currentLevel];
  const impulse = level.maxVy * (direction === 'up' ? 0.62 : 0.3);
  cow.vy = Math.max(-level.maxVy, Math.min(level.maxVy, cow.vy + (direction === 'up' ? -impulse : impulse)));
}

function clearInputState() {
  thrusting = false;
  diving = false;
}

function bindHoldButton(element, direction) {
  const start = (event) => {
    event.preventDefault();
    if (!gameStarted && !gameOver) startGame();
    if (direction === 'up') thrusting = true;
    else diving = true;
    nudgeCow(direction);
  };
  const end = (event) => {
    event.preventDefault();
    if (direction === 'up') thrusting = false;
    else diving = false;
  };
  element.addEventListener('pointerdown', start);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);
  element.addEventListener('pointerleave', end);
}

window.addEventListener('keydown', (event) => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
    event.preventDefault();
    if (!gameStarted && !gameOver) startGame();
    setThrust(true);
    if (!event.repeat) nudgeCow('up');
  }
  if (['ArrowDown', 'KeyS'].includes(event.code)) {
    event.preventDefault();
    if (!gameStarted && !gameOver) startGame();
    diving = true;
    if (!event.repeat) nudgeCow('down');
  }
  if (event.code === 'Enter' && !gameStarted && ui.finishOverlay.hidden) startGame();
  if (event.code === 'Escape' && gameStarted) {
    gameStarted = false;
    clearInputState();
    ui.canvasStatusText.textContent = '已暂停';
    cancelAnimationFrame(rafId);
  }
});
window.addEventListener('keyup', (event) => { if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) setThrust(false); });
window.addEventListener('keyup', (event) => { if (['ArrowDown', 'KeyS'].includes(event.code)) diving = false; });
window.addEventListener('blur', clearInputState);
window.addEventListener('pointerup', clearInputState);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInputState(); });

document.getElementById('launchBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', () => {
  const nextLevel = retryLevel;
  const advancing = resultMode === 'success';
  resetGame(nextLevel, { newSeed: advancing, steady: advancing ? false : steadyMode });
  startGame();
});
ui.levelSelectBtn.addEventListener('click', () => {
  const selectedLevel = resultMode === 'success' ? retryLevel : currentLevel;
  resetGame(selectedLevel, { newSeed: resultMode === 'success', steady: false });
  ui.levelMap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  requestAnimationFrame(() => ui.levelMapList.querySelector('[aria-current="step"]')?.focus());
});
ui.rerollBtn.addEventListener('click', () => {
  resetGame(currentLevel, { newSeed: true, steady: steadyMode });
  startGame();
});
ui.steadyBtn.addEventListener('click', () => {
  resetGame(currentLevel, { newSeed: false, steady: true });
  startGame();
});
document.getElementById('soundBtn').addEventListener('click', () => {
  soundOn = !soundOn;
  document.getElementById('soundLabel').textContent = soundOn ? '声效开' : '声效关';
  document.getElementById('soundBtn').setAttribute('aria-pressed', String(soundOn));
});
document.getElementById('fullscreenBtn').addEventListener('click', async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { /* Fullscreen can be unavailable in embedded previews. */ }
});
bindHoldButton(document.getElementById('touchUp'), 'up');
bindHoldButton(document.getElementById('touchDown'), 'down');
window.addEventListener('resize', draw);

let audioContext;
function playTone(frequency, duration, type) {
  if (!soundOn) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration + 0.02);
  } catch { /* Audio is optional and may be blocked until user gesture. */ }
}

drawStaticCowCanvases();
resetGame();
