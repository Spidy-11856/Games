const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');

const ui = {
  areaName: document.querySelector('#areaName'),
  missionText: document.querySelector('#missionText'),
  respectScore: document.querySelector('#respectScore'),
  vehicleState: document.querySelector('#vehicleState'),
  prompt: document.querySelector('#prompt'),
  clock: document.querySelector('#clock'),
  staminaMeter: document.querySelector('#staminaMeter'),
};

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * pixelRatio);
  canvas.height = Math.floor(window.innerHeight * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  canvas.logicalWidth = window.innerWidth;
  canvas.logicalHeight = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const keys = new Set();
const world = { width: 2200, height: 1600 };
const camera = { x: 0, y: 0, distance: 330, tilt: 0.56 };
let showMap = true;
let respect = 0;
let minutes = 360;

const player = {
  x: 360,
  y: 620,
  radius: 13,
  color: '#f7d7a3',
  inVehicle: false,
  direction: 0,
};

const rickshaw = {
  x: 500,
  y: 650,
  width: 54,
  height: 34,
  color: '#ffce31',
  angle: 0,
};

const zones = [
  { name: 'Ganga Ghat', x: 0, y: 0, w: 780, h: 480, color: '#356f97' },
  { name: 'Patna Market', x: 780, y: 0, w: 690, h: 610, color: '#8b5a2b' },
  { name: 'Station Road', x: 1470, y: 0, w: 730, h: 720, color: '#59616f' },
  { name: 'Mithila Colony', x: 0, y: 480, w: 790, h: 620, color: '#406b45' },
  { name: 'Nalanda Campus', x: 790, y: 610, w: 620, h: 470, color: '#6c4e8f' },
  { name: 'Sonepur Fairground', x: 1410, y: 720, w: 790, h: 450, color: '#9d6c35' },
  { name: 'Village Fields', x: 0, y: 1100, w: 2200, h: 500, color: '#5e842d' },
];

const roads = [
  { x: 0, y: 565, w: 2200, h: 95 },
  { x: 0, y: 1060, w: 2200, h: 82 },
  { x: 705, y: 0, w: 90, h: 1600 },
  { x: 1360, y: 0, w: 90, h: 1600 },
  { x: 1700, y: 0, w: 80, h: 1180 },
];

const landmarks = [
  { label: 'Gandhi Setu View', x: 210, y: 160, icon: '🌉' },
  { label: 'Golghar Chowk', x: 1010, y: 260, icon: '🏛️' },
  { label: 'Patna Junction', x: 1810, y: 250, icon: '🚉' },
  { label: 'Litti Stall', x: 900, y: 780, icon: '🥣' },
  { label: 'Madhubani Mural Lane', x: 430, y: 840, icon: '🎨' },
  { label: 'Fair Ferris Wheel', x: 1880, y: 900, icon: '🎡' },
  { label: 'Paddy Fields', x: 1090, y: 1320, icon: '🌾' },
];

const missions = [
  {
    title: 'Deliver litti chokha to the ghat crew',
    x: 940,
    y: 790,
    target: { x: 260, y: 190 },
    reward: 25,
    state: 'ready',
  },
  {
    title: 'Pick up a mural artist from Mithila Colony',
    x: 420,
    y: 840,
    target: { x: 1030, y: 270 },
    reward: 35,
    state: 'ready',
  },
  {
    title: 'Race supplies from Junction to Sonepur fair',
    x: 1810,
    y: 260,
    target: { x: 1880, y: 900 },
    reward: 45,
    state: 'ready',
  },
];

const pedestrians = Array.from({ length: 42 }, (_, index) => ({
  x: 120 + (index * 157) % (world.width - 240),
  y: 120 + (index * 211) % (world.height - 240),
  phase: index * 0.8,
  color: ['#ef476f', '#ffd166', '#06d6a0', '#7bdff2', '#cdb4db'][index % 5],
}));

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function currentArea() {
  const zone = zones.find(({ x, y, w, h }) => player.x >= x && player.x <= x + w && player.y >= y && player.y <= y + h);
  return zone?.name ?? 'Bihar Streets';
}

function activeMission() {
  return missions.find((mission) => mission.state === 'active');
}

function updatePlayer(delta) {
  const turnInput = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
  const moveInput = Number(keys.has('arrowup') || keys.has('w')) - Number(keys.has('arrowdown') || keys.has('s'));

  const turnSpeed = player.inVehicle ? 2.25 : 3.15;
  player.direction += turnInput * turnSpeed * delta;

  if (moveInput === 0) return;

  const boost = keys.has('shift') ? 1.75 : 1;
  const speed = (player.inVehicle ? 360 : 185) * boost * moveInput;
  const dx = Math.cos(player.direction) * speed * delta;
  const dy = Math.sin(player.direction) * speed * delta;

  player.x = clamp(player.x + dx, 30, world.width - 30);
  player.y = clamp(player.y + dy, 30, world.height - 30);

  if (player.inVehicle) {
    rickshaw.x = player.x;
    rickshaw.y = player.y;
    rickshaw.angle = player.direction;
  }
}

function toggleVehicle() {
  if (player.inVehicle) {
    player.inVehicle = false;
    rickshaw.x = player.x + 48;
    rickshaw.y = player.y + 18;
    ui.prompt.textContent = 'Exited auto-rickshaw.';
    return;
  }

  if (distance(player, rickshaw) < 85) {
    player.inVehicle = true;
    player.x = rickshaw.x;
    player.y = rickshaw.y;
    ui.prompt.textContent = 'Auto-rickshaw ready. Hold Shift to accelerate.';
  } else {
    ui.prompt.textContent = 'Move closer to the auto-rickshaw to enter.';
  }
}

function interact() {
  const mission = activeMission();
  if (mission && distance(player, mission.target) < 70) {
    mission.state = 'done';
    respect += mission.reward;
    ui.prompt.textContent = `Mission complete: +${mission.reward} respect.`;
    return;
  }

  const next = missions.find((item) => item.state === 'ready' && distance(player, item) < 75);
  if (next) {
    next.state = 'active';
    ui.prompt.textContent = `Started: ${next.title}`;
    return;
  }

  ui.prompt.textContent = 'No mission marker nearby.';
}

function screenWidth() {
  return canvas.logicalWidth || canvas.width;
}

function screenHeight() {
  return canvas.logicalHeight || canvas.height;
}

function drawAtmosphere() {
  const width = screenWidth();
  const height = screenHeight();
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, 'rgba(255, 187, 94, 0.22)');
  sky.addColorStop(0.45, 'rgba(87, 154, 150, 0.06)');
  sky.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 218, 118, 0.72)';
  ctx.beginPath();
  ctx.arc(width * 0.74, height * 0.2, 72, 0, Math.PI * 2);
  ctx.fill();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.86);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}


function prepareChaseCamera() {
  const width = screenWidth();
  const height = screenHeight();
  camera.x = clamp(player.x - Math.cos(player.direction) * camera.distance, 0, world.width);
  camera.y = clamp(player.y - Math.sin(player.direction) * camera.distance, 0, world.height);
  ctx.translate(width / 2, height * 0.72);
  ctx.scale(1, camera.tilt);
  ctx.rotate(Math.PI / 2 - player.direction);
  ctx.translate(-camera.x, -camera.y);
}

function shade(color, amount) {
  const value = Number.parseInt(color.slice(1), 16);
  const r = clamp(((value >> 16) & 255) + amount, 0, 255);
  const g = clamp(((value >> 8) & 255) + amount, 0, 255);
  const b = clamp((value & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawExtrudedBox(x, y, width, depth, height, color) {
  const lift = height / camera.tilt;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 14, y + 18, width, depth);

  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, depth);

  ctx.fillStyle = shade(color, -34);
  ctx.beginPath();
  ctx.moveTo(x + width, y);
  ctx.lineTo(x + width, y + depth);
  ctx.lineTo(x + width, y + depth - lift);
  ctx.lineTo(x + width, y - lift);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shade(color, 24);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y - lift);
  ctx.lineTo(x, y - lift);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.24)';
  ctx.lineWidth = 2;
  for (let wx = x + 10; wx < x + width - 8; wx += 20) {
    ctx.beginPath();
    ctx.moveTo(wx, y - 10);
    ctx.lineTo(wx + 8, y - 10);
    ctx.stroke();
  }
}

function drawBillboardText(text, x, y, size = 26, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.direction - Math.PI / 2);
  ctx.scale(1, 1 / camera.tilt);
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px Impact, system-ui`;
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#10131a';
  ctx.strokeText(text, -ctx.measureText(text).width / 2, 0);
  ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
  ctx.restore();
}

function drawWorld() {
  zones.forEach((zone) => {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    drawBillboardText(zone.name, zone.x + 150, zone.y + 86, 24, 'rgba(255,255,255,0.72)');
  });

  roads.forEach((road) => {
    ctx.fillStyle = '#20242c';
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.strokeStyle = '#f7d154';
    ctx.setLineDash([28, 28]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (road.w > road.h) {
      ctx.moveTo(road.x, road.y + road.h / 2);
      ctx.lineTo(road.x + road.w, road.y + road.h / 2);
    } else {
      ctx.moveTo(road.x + road.w / 2, road.y);
      ctx.lineTo(road.x + road.w / 2, road.y + road.h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  for (let x = 80; x < world.width; x += 170) {
    for (let y = 80; y < world.height; y += 155) {
      if (roads.some((road) => x > road.x && x < road.x + road.w && y > road.y && y < road.y + road.h)) continue;
      const color = ['#d96459', '#f2ae72', '#588b8b', '#b56576'][(x + y) % 4];
      drawExtrudedBox(x, y, 64, 48, 76 + ((x + y) % 70), color);
    }
  }
}

function drawLandmarks() {
  landmarks.forEach((item) => {
    ctx.font = '34px serif';
    ctx.fillText(item.icon, item.x - 18, item.y + 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px system-ui';
    ctx.fillText(item.label, item.x - 44, item.y + 36);
  });
}

function drawMissions() {
  missions.forEach((mission) => {
    if (mission.state === 'done') return;
    const point = mission.state === 'active' ? mission.target : mission;
    const pulse = 18 + Math.sin(performance.now() / 180) * 6;
    ctx.strokeStyle = mission.state === 'active' ? '#37d6a6' : '#f5b642';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(point.x, point.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '900 24px system-ui';
    ctx.fillText(mission.state === 'active' ? '✓' : '!', point.x - 7, point.y + 8);
  });
}

function drawPedestrians(time) {
  pedestrians.forEach((ped) => {
    const x = ped.x + Math.sin(time * 0.001 + ped.phase) * 24;
    const y = ped.y + Math.cos(time * 0.0012 + ped.phase) * 18;
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawRickshaw() {
  if (player.inVehicle) return;
  ctx.save();
  ctx.translate(rickshaw.x, rickshaw.y);
  ctx.rotate(rickshaw.angle);
  ctx.fillStyle = '#111827';
  ctx.fillRect(-rickshaw.width / 2, -rickshaw.height / 2, rickshaw.width, rickshaw.height);
  ctx.fillStyle = rickshaw.color;
  ctx.fillRect(-20, -13, 34, 26);
  ctx.fillStyle = '#37d6a6';
  ctx.fillRect(4, -10, 18, 20);
  ctx.fillStyle = '#0b0f17';
  [-19, 19].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, 18, 6, 0, Math.PI * 2);
    ctx.arc(x, -18, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.direction);
  if (player.inVehicle) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(-34, -20, 68, 40);
    ctx.fillStyle = '#ffce31';
    ctx.fillRect(-25, -16, 42, 32);
    ctx.fillStyle = '#37d6a6';
    ctx.fillRect(4, -12, 24, 24);
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(-28, -25, 12, 8);
    ctx.fillRect(-28, 17, 12, 8);
    ctx.fillRect(16, -25, 12, 8);
    ctx.fillRect(16, 17, 12, 8);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 9, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2dd4bf';
    ctx.fillRect(-9, -1, 18, 20);
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, -10, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(5, -13, 11, 4);
  }
  ctx.restore();
}

function drawHorizonScrim() {
  const width = screenWidth();
  const height = screenHeight();
  const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.52);
  gradient.addColorStop(0, 'rgba(255, 190, 92, 0.24)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height * 0.55);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.fillRect(0, height * 0.78, width, height * 0.22);
}

function drawMiniMap() {
  if (!showMap) return;
  const scale = 0.11;
  const w = world.width * scale;
  const h = world.height * scale;
  const x = 34;
  const y = screenHeight() - h - 34;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.max(w, h) / 2 + 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(3,7,18,0.84)';
  ctx.fill();
  ctx.clip();
  zones.forEach((zone) => {
    ctx.fillStyle = zone.color;
    ctx.fillRect(x + zone.x * scale, y + zone.y * scale, zone.w * scale, zone.h * scale);
  });
  roads.forEach((road) => {
    ctx.fillStyle = '#151922';
    ctx.fillRect(x + road.x * scale, y + road.y * scale, road.w * scale, road.h * scale);
  });
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + player.x * scale, y + player.y * scale, 6, 0, Math.PI * 2);
  ctx.fill();
  missions.filter((mission) => mission.state !== 'done').forEach((mission) => {
    const point = mission.state === 'active' ? mission.target : mission;
    ctx.fillStyle = mission.state === 'active' ? '#37d6a6' : '#f5b642';
    ctx.fillRect(x + point.x * scale - 4, y + point.y * scale - 4, 8, 8);
  });
  ctx.restore();
  ctx.strokeStyle = '#10131a';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, Math.max(w, h) / 2 + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#f8fbff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#f8fbff';
  ctx.font = '900 18px system-ui';
  ctx.fillText('N', x + w / 2 - 7, y + 19);
}

function updateUi() {
  const mission = activeMission();
  ui.areaName.textContent = currentArea();
  ui.missionText.textContent = mission ? `Go to ${nearestLandmark(mission.target)}` : 'Find a marker';
  ui.respectScore.textContent = `₹${String(respect * 10).padStart(6, '0')}`;
  ui.vehicleState.textContent = player.inVehicle ? 'Auto-rickshaw' : 'On foot';
  ui.staminaMeter.style.width = `${keys.has('shift') ? 52 : 82}%`;
  ui.clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
}

function nearestLandmark(point) {
  return landmarks.reduce((best, landmark) => (
    distance(point, landmark) < distance(point, best) ? landmark : best
  ), landmarks[0]).label;
}

function render(time) {
  const width = screenWidth();
  const height = screenHeight();
  ctx.clearRect(0, 0, width, height);
  drawAtmosphere();

  ctx.save();
  prepareChaseCamera();
  drawWorld();
  drawLandmarks();
  drawMissions();
  drawPedestrians(time);
  drawRickshaw();
  drawPlayer();
  ctx.restore();

  drawHorizonScrim();
  drawMiniMap();
}

let lastTime = performance.now();
function loop(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  minutes = (minutes + delta * 4) % 1440;
  updatePlayer(delta);
  updateUi();
  render(time);
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  if (key === 'e' && !event.repeat) toggleVehicle();
  if (key === ' ' && !event.repeat) interact();
  if (key === 'm' && !event.repeat) showMap = !showMap;
  keys.add(key);
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

requestAnimationFrame(loop);
