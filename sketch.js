/**
CYBERCITY AR-AD TUBE  (p5.js WEBGL)
Drag: orbit | Wheel: zoom | Right-drag/Ctrl-drag: pan
[R] auto-rotate | [G] grid | [F] flicker | [B] glow | [0] reset
*/


// CONCEPT: REPETITION, RANDOMNESS, IMMERSION
// MATERIALS: rectangles (planes), 3D position, texture, light
// PARAMETER: geometry mapping (2D rectangles wrapped around a tube)
// QUALITY: spatial, continuous
// Translating a grid of random rectangles into a 3D tube creates an immersive environment that feels like walking through digital architecture.


let rings = 18, segments = 36;
let baseRadius = 170, tubeHalfLen = 180, lift = 10;
let tiles = [];
let tStart;
let autoRotate = false, showGrid = true, enableFlicker = true, enableGlow = true;

let camDefault = {};
let adTex = []; // pool of animated ad textures

function setup() {
  createCanvas(600, 600, WEBGL);
  noStroke();
  randomSeed(42);
  noiseSeed(7);
  tStart = millis();

  // small library of reusable ad textures
  for (let i = 0; i < 12; i++) adTex.push(createGraphics(256, 256));

  // tiles on tube
  for (let r = 0; r < rings; r++) {
    for (let c = 0; c < segments; c++) {
      const w = random(28, 72);
      const h = random(28, 72);
      tiles.push({
        rIndex: r, cIndex: c, w, h,
        jitterA: random(-0.12, 0.12),
        jitterY: random(-6, 6),
        nOff: createVector(random(1000), random(1000), random(1000)),
        texId: floor(random(adTex.length)),
        hue: random(360),
        flickerPhase: random(TWO_PI),
        glowScale: random(1.25, 1.6)
      });
    }
  }

  // camera defaults
  perspective();
  const fov = PI/3;
  const camZ = (height/2) / tan(fov/2);
  camera(0, 0, camZ, 0, 0, 0, 0, 1, 0);
  camDefault = { camZ };
}

function draw() {
  background(12);

  orbitControl(1.0, 1.0, 0.2);

  if (showGrid) drawGrid(900, 40);

  ambientLight(30, 30, 40);
  directionalLight(180, 180, 220, -0.3, -0.5, -1);

  if (autoRotate) rotateY(frameCount * 0.01);

  const t = (millis() - tStart) * 0.001;
  for (let i = 0; i < adTex.length; i++) drawAd(adTex[i], t, i);

  // lift above grid
  push();
  translate(0, -tubeHalfLen - lift, 0);

  // draw tiles
  for (const tile of tiles) {
    const yBase = map(tile.rIndex, 0, rings - 1, tubeHalfLen, -tubeHalfLen) + tile.jitterY;
    const angleBase = map(tile.cIndex, 0, segments, 0, TWO_PI) + tile.jitterA;

    const n = noise(
      2.0 + tile.nOff.x + 0.008 * cos(angleBase),
      2.0 + tile.nOff.y + 0.008 * yBase,
      2.0 + tile.nOff.z + 0.22 * t
    );
    const radius = baseRadius * map(n, 0, 1, 0.8, 1.16);

    push();
    rotateY(angleBase);
    translate(0, yBase, radius);

    // flicker
    let flicker = 1.0;
    if (enableFlicker) flicker = 0.75 + 0.25 * abs(sin(t * 8.0 + tile.flickerPhase));

    // glow pass (additive)
    if (enableGlow) {
      push();
      blendMode(ADD);
      const glowRGBA = hslToRgb(tile.hue, 80, 55, 110 * flicker);
      tint(...glowRGBA);
      texture(adTex[tile.texId]);
      plane(tile.w * tile.glowScale, tile.h * tile.glowScale);
      pop();
    }

    // main panel
    resetTint();
    tint(255, 255 * flicker);
    texture(adTex[tile.texId]);
    plane(tile.w, tile.h);

    pop();
  }

  pop();
  drawHUD();
}

// ---------- ad texture generator ----------
function drawAd(g, t, idx) {
  g.push();
  g.pixelDensity(1);
  g.clear();

  const baseHue = (idx * 37) % 360;
  const h1 = baseHue, h2 = (baseHue + 200) % 360;

  // neon gradient background
  for (let y = 0; y < g.height; y++) {
    const k = y / g.height;
    const c = hslRGBA(h1, 80, 20 + 20 * k);
    g.stroke(...c);
    g.line(0, y, g.width, y);
  }

  // scanlines
  g.noStroke();
  g.fill(255, 30);
  for (let y = 0; y < g.height; y += 4) g.rect(0, y, g.width, 1);

  // moving band
  const bandY = (t * 40 + idx * 20) % (g.height + 40) - 40;
  g.fill(...hslRGBA(h2, 90, 60, 160));
  g.rect(0, bandY, g.width, 20);

  // corner brackets
  g.stroke(...hslRGBA(h2, 100, 75));
  g.strokeWeight(4);
  const m = 18;
  g.noFill();
  g.line(m, m, m + 30, m);
  g.line(m, m, m, m + 30);
  g.line(g.width - m, m, g.width - m - 30, m);
  g.line(g.width - m, m, g.width - m, m + 30);
  g.line(m, g.height - m, m + 30, g.height - m);
  g.line(m, g.height - m, m, g.height - m - 30);
  g.line(g.width - m, g.height - m, g.width - m - 30, g.height - m);
  g.line(g.width - m, g.height - m, g.width - m, g.height - m - 30);

  // scrolling text
  g.noStroke();
  g.textFont('monospace');
  g.textSize(20);
  g.fill(255);
  const msg = ["NOVA","SECTOR-7","NEON","00110011","CYBER","AR/AD","CITY","BUY","SYNC","VOID"][idx % 10];
  const x = (g.width + 200 - (t * 120) % (g.width + 200));
  g.text(msg + " ▷▹▸", x - g.width, g.height * 0.55);

  // pulse ring/logo
  const r = 22 + 6 * sin(t * 3 + idx);
  g.noFill();
  g.stroke(...hslRGBA(h1, 100, 70));
  g.strokeWeight(3);
  g.circle(g.width * 0.2, g.height * 0.35, 2 * r);
  g.stroke(...hslRGBA(h1, 100, 50));
  g.strokeWeight(1);
  g.circle(g.width * 0.2, g.height * 0.35, 2 * r * 0.7);

  g.pop();
}

// ---------- input & UI ----------
function keyPressed() {
  if (key === 'R' || key === 'r') autoRotate = !autoRotate;
  if (key === 'G' || key === 'g') showGrid = !showGrid;
  if (key === '0') {
    perspective();
    camera(0, 0, camDefault.camZ, 0, 0, 0, 0, 1, 0);
    autoRotate = false;
  }
  if (key === 'F' || key === 'f') enableFlicker = !enableFlicker;
  if (key === 'B' || key === 'b') enableGlow = !enableGlow;
}

function drawGrid(size, step) {
  push();
  rotateX(HALF_PI);
  translate(0, 0, 0.01);
  stroke(255, 32);
  for (let x = -size/2; x <= size/2; x += step) line(x, -size/2, x, size/2);
  for (let y = -size/2; y <= size/2; y += step) line(-size/2, y, size/2, y);
  pop();
  noStroke();
}

function drawHUD() {
  push();
  resetMatrix();
  translate(-width/2, height/2 - 64, 0);
  noStroke();
  fill(0, 80);
  rect(0, 0, width, 64);
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Drag: orbit | Wheel: zoom | Right-drag/Ctrl-drag: pan", 12, 20);
  text(`[R] auto-rotate  [G] grid  [F] flicker ${enableFlicker?"ON":"OFF"}  [B] glow ${enableGlow?"ON":"OFF"}  [0] reset`, 12, 42);
  pop();
}

function resetTint(){ tint(255,255); }

// ---------- color helpers (renamed) ----------
function hslRGBA(h, s, l, a=255){
  const [r,g,b] = hslToRgb(h, s, l);
  return [r,g,b,a];
}
function hslToRgb(h, s, l, a=255){
  // h in [0,360], s/l in [0,100]
  h/=360; s/=100; l/=100;
  const f = (n,k=(n+h)%1) => l - s*Math.min(l,1-l)*Math.max(-1, Math.min(k*6-3, Math.min(4-k*6,1)));
  const r=f(0), g=f(2/3), b=f(1/3);
  return [floor(255*r), floor(255*g), floor(255*b), a];
}
