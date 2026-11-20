import * as THREE from 'three';

export interface CityTextureSet {
  asphaltTexture: THREE.CanvasTexture;
  sidewalkTexture: THREE.CanvasTexture;
  buildingTexture: THREE.CanvasTexture;
  earthRoadTexture: THREE.CanvasTexture;
  earthWallTexture: THREE.CanvasTexture;
  kitchenRoadTexture: THREE.CanvasTexture;
  bathRoadTexture: THREE.CanvasTexture;
  iceRoadTexture: THREE.CanvasTexture;
  lavaRoadTexture: THREE.CanvasTexture;
  labRoadTexture: THREE.CanvasTexture;
  spaceRoadTexture: THREE.CanvasTexture;
  chitinWingTexture: THREE.CanvasTexture;
  fabricWeaveTexture: THREE.CanvasTexture;
  reticleTexture: THREE.CanvasTexture;
  shadowTexture: THREE.CanvasTexture;
  snowFlakeTexture: THREE.CanvasTexture;
  bubbleParticleTexture: THREE.CanvasTexture;
  glowOrbParticleTexture: THREE.CanvasTexture;
  kitchenWallTexture: THREE.CanvasTexture;
  bathWallTexture: THREE.CanvasTexture;
  bathMirrorTextures: THREE.CanvasTexture[];
  labBoardTextures: THREE.CanvasTexture[];
  shopSigns: THREE.CanvasTexture[];
  recordBannerTexture: THREE.CanvasTexture;
  setAnisotropy: (level: number) => void;
  markNeedsUpdate: () => void;
  dispose: () => void;
}

const SHOP_SIGNS = [
  { name: 'ÇAY OCAĞI', sub: 'Bİ DEMLİ ÇAY KOYUN HELE', bg: '#7c2d12', accent: '#fde047' },
  { name: 'BAKKAL RIZA', sub: 'TAZE KIRINTI · SİMİT', bg: '#065f46', accent: '#a7f3d0' },
  { name: 'OTO TAMİR', sub: 'KAZIM USTA · LASTİK', bg: '#1e3a8a', accent: '#93c5fd' },
  { name: 'DİVA BUTİK', sub: 'DİVALAR YEMEK YAPMAZ', bg: '#831843', accent: '#fbcfe8' },
  { name: 'ACİL DUKTUR', sub: '7/24 NÖBETÇİ KLİNİK', bg: '#0f172a', accent: '#38bdf8' },
  { name: 'GECE BÜFESİ', sub: 'İKİ GÖZÜM AYDINLAT', bg: '#78350f', accent: '#fef08a' },
];

export function createCityTextures(maxAnisotropy: number): CityTextureSet {
  // 1. Precision 3-Lane Asphalt Road (Exact 1/3, 2/3 lane dividers so Sol/Orta/Sağ align 1:1!)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;

  rCtx.fillStyle = '#18202a';
  rCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.random() > 0.5 ? 255 : 0;
    rCtx.fillStyle = `rgba(${v},${v},${v},0.035)`;
    rCtx.fillRect(x, y, 2, 2);
  }

  // Exact lane centers at 1/6, 3/6, 5/6 (85.3, 256, 426.7)
  [85, 256, 427].forEach((cx) => {
    const grad = rCtx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.5, 'rgba(7,10,16,0.42)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    rCtx.fillStyle = grad;
    rCtx.fillRect(cx - 56, 0, 112, 512);
  });

  // Amber edge boundary lines
  rCtx.fillStyle = '#f59e0b';
  rCtx.fillRect(6, 0, 8, 512);
  rCtx.fillRect(498, 0, 8, 512);

  // Crisp white dashed dividers at exact 1/3 (170.6) and 2/3 (341.3)
  rCtx.fillStyle = '#f8fafc';
  for (let y = 16; y < 512; y += 128) {
    rCtx.fillRect(166, y, 9, 76);
    rCtx.fillRect(337, y, 9, 76);
  }

  const asphaltTexture = new THREE.CanvasTexture(roadCanvas);
  asphaltTexture.colorSpace = THREE.SRGBColorSpace;
  asphaltTexture.wrapS = THREE.ClampToEdgeWrapping;
  asphaltTexture.wrapT = THREE.RepeatWrapping;
  asphaltTexture.repeat.set(1, 2);
  asphaltTexture.anisotropy = maxAnisotropy;

  // 2. City Sidewalk Interlocking Pavement Stones
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 256;
  swCanvas.height = 256;
  const sCtx = swCanvas.getContext('2d')!;
  sCtx.fillStyle = '#475569';
  sCtx.fillRect(0, 0, 256, 256);

  const brickW = 64;
  const brickH = 32;
  for (let row = 0; row < 8; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 5; col++) {
      const shade = 104 + Math.floor(Math.random() * 26);
      sCtx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 14})`;
      sCtx.fillRect(col * brickW + offset + 2, row * brickH + 2, brickW - 4, brickH - 4);
    }
  }
  const sidewalkTexture = new THREE.CanvasTexture(swCanvas);
  sidewalkTexture.colorSpace = THREE.SRGBColorSpace;
  sidewalkTexture.wrapS = THREE.RepeatWrapping;
  sidewalkTexture.wrapT = THREE.RepeatWrapping;
  sidewalkTexture.repeat.set(1, 4);
  sidewalkTexture.anisotropy = maxAnisotropy;

  // 3. Detailed Neighborhood Apartment Facade (stone cornice bands, recessed framed windows, warm curtains & sills)
  const bCanvas = document.createElement('canvas');
  bCanvas.width = 512;
  bCanvas.height = 512;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#475569';
  bCtx.fillRect(0, 0, 512, 512);

  // Subtle horizontal stucco/brick courses
  for (let y = 0; y < 512; y += 16) {
    bCtx.fillStyle = y % 32 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.06)';
    bCtx.fillRect(0, y, 512, 2);
  }
  // Vertical architectural pilasters between bays
  for (let x = 0; x < 512; x += 128) {
    bCtx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    bCtx.fillRect(x, 0, 8, 512);
    bCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    bCtx.fillRect(x + 8, 0, 3, 512);
  }

  // Concrete floor slab cornices
  for (let y = 0; y < 512; y += 128) {
    bCtx.fillStyle = '#1e293b';
    bCtx.fillRect(0, y, 512, 10);
    bCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    bCtx.fillRect(0, y + 10, 512, 3);
  }

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const wx = 30 + col * 128;
      const wy = 24 + row * 128;
      const hash = row * 7 + col * 5;
      const isLit = hash % 3 !== 0;
      const isWarmTv = hash % 5 === 2;

      // Deep outer window recess
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(wx - 5, wy - 5, 74, 82);
      // Light stone window trim
      bCtx.fillStyle = '#64748b';
      bCtx.fillRect(wx - 3, wy - 3, 70, 78);

      if (isLit) {
        const wGrad = bCtx.createLinearGradient(wx, wy, wx, wy + 72);
        if (isWarmTv) {
          wGrad.addColorStop(0, '#bae6fd');
          wGrad.addColorStop(1, '#38bdf8');
        } else {
          wGrad.addColorStop(0, '#fef08a');
          wGrad.addColorStop(0.65, '#f59e0b');
          wGrad.addColorStop(1, '#b45309');
        }
        bCtx.fillStyle = wGrad;
      } else {
        const darkGrad = bCtx.createLinearGradient(wx, wy, wx, wy + 72);
        darkGrad.addColorStop(0, '#1e293b');
        darkGrad.addColorStop(1, '#0f172a');
        bCtx.fillStyle = darkGrad;
      }
      bCtx.fillRect(wx, wy, 64, 72);

      // Subtle curtain drape silhouettes on side edges
      bCtx.fillStyle = isLit ? 'rgba(124, 45, 18, 0.35)' : 'rgba(15, 23, 42, 0.55)';
      bCtx.fillRect(wx, wy, 12, 72);
      bCtx.fillRect(wx + 52, wy, 12, 72);

      // Window mullions (crossbars) + projecting sill
      bCtx.fillStyle = '#0f172a';
      bCtx.fillRect(wx + 30, wy, 4, 72);
      bCtx.fillRect(wx, wy + 34, 64, 4);
      bCtx.fillStyle = '#94a3b8';
      bCtx.fillRect(wx - 7, wy + 73, 78, 7);
    }
  }
  const buildingTexture = new THREE.CanvasTexture(bCanvas);
  buildingTexture.colorSpace = THREE.SRGBColorSpace;
  buildingTexture.wrapS = THREE.RepeatWrapping;
  buildingTexture.wrapT = THREE.RepeatWrapping;
  buildingTexture.anisotropy = maxAnisotropy;

  // 4. Realistic Cockroach Tegmina (Forewing) Chitin Texture (mahogany base + honey-amber rim + branching veins!)
  const wingCanvas = document.createElement('canvas');
  wingCanvas.width = 256;
  wingCanvas.height = 256;
  const wCtx = wingCanvas.getContext('2d')!;

  // Rich chestnut-mahogany gradient with warm translucent honey-amber costal border & wing tip
  const wGrad = wCtx.createLinearGradient(0, 0, 256, 256);
  wGrad.addColorStop(0, '#3a1606');
  wGrad.addColorStop(0.25, '#6b2e11');
  wGrad.addColorStop(0.58, '#8d4319');
  wGrad.addColorStop(0.84, '#a85a24');
  wGrad.addColorStop(1, '#4a1d08');
  wCtx.fillStyle = wGrad;
  wCtx.fillRect(0, 0, 256, 256);

  // Darker inner anal-field shading & warm amber costal margin highlight
  const edgeGrad = wCtx.createLinearGradient(0, 0, 256, 0);
  edgeGrad.addColorStop(0, 'rgba(32, 11, 4, 0.42)');
  edgeGrad.addColorStop(0.45, 'rgba(180, 95, 38, 0.14)');
  edgeGrad.addColorStop(0.85, 'rgba(217, 134, 62, 0.34)');
  edgeGrad.addColorStop(1, 'rgba(48, 18, 6, 0.45)');
  wCtx.fillStyle = edgeGrad;
  wCtx.fillRect(0, 0, 256, 256);

  // Subtle wet carapace highlight sheen along wing dome
  const ridgeGrad = wCtx.createRadialGradient(132, 96, 12, 128, 120, 128);
  ridgeGrad.addColorStop(0, 'rgba(255, 232, 198, 0.24)');
  ridgeGrad.addColorStop(0.55, 'rgba(255, 210, 160, 0.08)');
  ridgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  wCtx.fillStyle = ridgeGrad;
  wCtx.fillRect(0, 0, 256, 256);

  // Main longitudinal radial vein (humeral ridge)
  wCtx.strokeStyle = 'rgba(24, 8, 2, 0.52)';
  wCtx.lineWidth = 4;
  wCtx.beginPath();
  wCtx.moveTo(92, 0);
  wCtx.bezierCurveTo(118, 70, 126, 160, 116, 256);
  wCtx.stroke();

  // Delicate fan-like branching diagonal tegmina veins
  wCtx.strokeStyle = 'rgba(28, 10, 3, 0.34)';
  wCtx.lineWidth = 2;
  for (let y = 18; y < 238; y += 22) {
    wCtx.beginPath();
    wCtx.moveTo(106, y);
    wCtx.quadraticCurveTo(165, y + 18, 248, Math.min(254, y + 44));
    wCtx.stroke();

    wCtx.beginPath();
    wCtx.moveTo(96, y + 8);
    wCtx.quadraticCurveTo(54, y + 26, 12, Math.min(254, y + 50));
    wCtx.stroke();
  }

  // Fine cross-vein archetypical insect wing cells
  wCtx.strokeStyle = 'rgba(255, 205, 150, 0.1)';
  wCtx.lineWidth = 1;
  for (let x = 28; x < 236; x += 26) {
    wCtx.beginPath();
    wCtx.moveTo(x, 0);
    wCtx.lineTo(x + (x - 128) * 0.14, 256);
    wCtx.stroke();
  }
  const chitinWingTexture = new THREE.CanvasTexture(wingCanvas);
  chitinWingTexture.colorSpace = THREE.SRGBColorSpace;
  chitinWingTexture.anisotropy = maxAnisotropy;

  // 4b. Neutral High-Resolution Fabric Weave Texture (tints cleanly with outfit color!)
  const fabCanvas = document.createElement('canvas');
  fabCanvas.width = 128;
  fabCanvas.height = 128;
  const fCtx = fabCanvas.getContext('2d')!;
  fCtx.fillStyle = '#f4f4f6';
  fCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    fCtx.fillStyle = y % 8 === 0 ? 'rgba(0, 0, 0, 0.055)' : 'rgba(255, 255, 255, 0.06)';
    fCtx.fillRect(0, y, 128, 2);
  }
  for (let x = 0; x < 128; x += 4) {
    fCtx.fillStyle = x % 8 === 0 ? 'rgba(0, 0, 0, 0.045)' : 'rgba(255, 255, 255, 0.05)';
    fCtx.fillRect(x, 0, 2, 128);
  }
  const fabricWeaveTexture = new THREE.CanvasTexture(fabCanvas);
  fabricWeaveTexture.colorSpace = THREE.SRGBColorSpace;
  fabricWeaveTexture.wrapS = THREE.RepeatWrapping;
  fabricWeaveTexture.wrapT = THREE.RepeatWrapping;
  fabricWeaveTexture.repeat.set(4, 4);
  fabricWeaveTexture.anisotropy = maxAnisotropy;

  // 5. Red Target Reticle
  const retCanvas = document.createElement('canvas');
  retCanvas.width = 256;
  retCanvas.height = 256;
  const rtCtx = retCanvas.getContext('2d')!;
  rtCtx.fillStyle = 'rgba(239, 68, 68, 0.28)';
  rtCtx.beginPath();
  rtCtx.arc(128, 128, 108, 0, Math.PI * 2);
  rtCtx.fill();

  rtCtx.strokeStyle = '#ef4444';
  rtCtx.lineWidth = 14;
  rtCtx.beginPath();
  rtCtx.arc(128, 128, 100, 0, Math.PI * 2);
  rtCtx.stroke();

  rtCtx.strokeStyle = '#ffffff';
  rtCtx.lineWidth = 8;
  rtCtx.beginPath();
  rtCtx.arc(128, 128, 52, 0, Math.PI * 2);
  rtCtx.stroke();

  const reticleTexture = new THREE.CanvasTexture(retCanvas);
  reticleTexture.colorSpace = THREE.SRGBColorSpace;
  reticleTexture.anisotropy = maxAnisotropy;

  // 6. Soft Radial Shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 128;
  shCanvas.height = 128;
  const shCtx = shCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shCanvas);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;

  // 7. Illuminated Neighborhood Shop Signs (framed neon edge + crisp shadow typography)
  const shopSigns = SHOP_SIGNS.map((item) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 192;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 192);
    const bgGrad = ctx.createLinearGradient(0, 10, 0, 182);
    bgGrad.addColorStop(0, item.bg);
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(10, 10, 492, 172);
    ctx.strokeStyle = item.accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 480, 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, 464, 144);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = '800 44px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.fillText(item.name, 259, 77);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(item.name, 256, 74);

    ctx.fillStyle = item.accent;
    ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(item.sub, 256, 134);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  });

  // 8. Realistic Packed Earth & Pebble Soil Trail Texture (seamless vertical tile)
  const erCanvas = document.createElement('canvas');
  erCanvas.width = 512;
  erCanvas.height = 512;
  const erCtx = erCanvas.getContext('2d')!;
  erCtx.fillStyle = '#4e2f18';
  erCtx.fillRect(0, 0, 512, 512);

  // Subtle darker worn trail tracks in the 3 lanes
  [85, 256, 427].forEach((cx) => {
    const tGrad = erCtx.createLinearGradient(cx - 58, 0, cx + 58, 0);
    tGrad.addColorStop(0, 'rgba(30, 16, 8, 0)');
    tGrad.addColorStop(0.5, 'rgba(32, 18, 9, 0.45)');
    tGrad.addColorStop(1, 'rgba(30, 16, 8, 0)');
    erCtx.fillStyle = tGrad;
    erCtx.fillRect(cx - 58, 0, 116, 512);
  });

  // Organic soil clods & mineral flecks (wrapped vertically for zero seam)
  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1 + Math.random() * 3.5;
    const shade = Math.random();
    erCtx.fillStyle =
      shade < 0.35
        ? 'rgba(34, 19, 9, 0.45)'
        : shade < 0.72
          ? 'rgba(110, 68, 34, 0.35)'
          : 'rgba(148, 108, 72, 0.28)';
    erCtx.beginPath();
    erCtx.ellipse(x, y, r * 1.2, r * 0.85, Math.random() * Math.PI, 0, Math.PI * 2);
    erCtx.fill();
    if (y < 8 || y > 504) {
      erCtx.beginPath();
      erCtx.ellipse(x, y < 8 ? y + 512 : y - 512, r * 1.2, r * 0.85, 0, 0, Math.PI * 2);
      erCtx.fill();
    }
  }

  // Embedded small pebbles & root strands
  for (let i = 0; i < 140; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const pr = 2.5 + Math.random() * 4.5;
    erCtx.fillStyle = i % 3 === 0 ? '#78716c' : '#57534e';
    erCtx.beginPath();
    erCtx.ellipse(px, py, pr, pr * 0.72, Math.random() * 2, 0, Math.PI * 2);
    erCtx.fill();
  }

  const earthRoadTexture = new THREE.CanvasTexture(erCanvas);
  earthRoadTexture.colorSpace = THREE.SRGBColorSpace;
  earthRoadTexture.wrapS = THREE.RepeatWrapping;
  earthRoadTexture.wrapT = THREE.RepeatWrapping;
  earthRoadTexture.anisotropy = maxAnisotropy;

  // 9. Subterranean Earth Strata & Rock Wall Texture (for tunnel walls & dome roof)
  const ewCanvas = document.createElement('canvas');
  ewCanvas.width = 512;
  ewCanvas.height = 512;
  const ewCtx = ewCanvas.getContext('2d')!;
  ewCtx.fillStyle = '#331d0f';
  ewCtx.fillRect(0, 0, 512, 512);

  // Horizontal sedimentary earth layers
  for (let y = 0; y < 512; y += 32) {
    ewCtx.fillStyle =
      y % 64 === 0 ? 'rgba(72, 41, 20, 0.52)' : 'rgba(24, 13, 6, 0.45)';
    ewCtx.fillRect(0, y, 512, 18 + Math.random() * 10);
  }
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1.5 + Math.random() * 5;
    ewCtx.fillStyle =
      i % 4 === 0
        ? 'rgba(87, 83, 78, 0.38)'
        : i % 2 === 0
          ? 'rgba(92, 54, 24, 0.36)'
          : 'rgba(22, 12, 6, 0.42)';
    ewCtx.beginPath();
    ewCtx.arc(x, y, r, 0, Math.PI * 2);
    ewCtx.fill();
  }
  const earthWallTexture = new THREE.CanvasTexture(ewCanvas);
  earthWallTexture.colorSpace = THREE.SRGBColorSpace;
  earthWallTexture.wrapS = THREE.RepeatWrapping;
  earthWallTexture.wrapT = THREE.RepeatWrapping;
  earthWallTexture.repeat.set(2, 2);
  earthWallTexture.anisotropy = maxAnisotropy;

  // 10. Giant Kitchen Checkered Tile Countertop with Ketchup & Mustard Edge Stripes
  const ktCanvas = document.createElement('canvas');
  ktCanvas.width = 256;
  ktCanvas.height = 256;
  const ktCtx = ktCanvas.getContext('2d')!;
  const ktTile = 42.666;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      ktCtx.fillStyle = (row + col) % 2 === 0 ? '#fef3c7' : '#fed7aa';
      ktCtx.fillRect(col * ktTile, row * ktTile, ktTile, ktTile);
    }
  }
  ktCtx.fillStyle = '#dc2626'; // Ketchup left rail
  ktCtx.fillRect(0, 0, 10, 256);
  ktCtx.fillStyle = '#eab308'; // Mustard right rail
  ktCtx.fillRect(246, 0, 10, 256);
  ktCtx.fillStyle = 'rgba(180, 83, 9, 0.28)';
  for (let y = 10; y < 256; y += 64) {
    ktCtx.fillRect(83, y, 5, 38);
    ktCtx.fillRect(168, y, 5, 38);
  }
  const kitchenRoadTexture = new THREE.CanvasTexture(ktCanvas);
  kitchenRoadTexture.colorSpace = THREE.SRGBColorSpace;
  kitchenRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  kitchenRoadTexture.wrapT = THREE.RepeatWrapping;
  kitchenRoadTexture.repeat.set(1, 3);
  kitchenRoadTexture.anisotropy = maxAnisotropy;

  // 11. Bubbly Bathroom Aqua Gloss Ceramic Mosaic Floor (specular highlights, wet sheen & clear 3-lane guides)
  const btCanvas = document.createElement('canvas');
  btCanvas.width = 512;
  btCanvas.height = 512;
  const btCtx = btCanvas.getContext('2d')!;
  const btTile = 512 / 6;
  const btColors = ['#e0f2fe', '#cffafe', '#a5f3fc', '#67e8f9'];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const tx = col * btTile;
      const ty = row * btTile;
      const base = btColors[(row * 3 + col * 2) % btColors.length];
      btCtx.fillStyle = base;
      btCtx.fillRect(tx, ty, btTile, btTile);

      // Subtle glossy tile sheen gradient
      const sheen = btCtx.createLinearGradient(tx, ty, tx + btTile, ty + btTile);
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
      sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.06)');
      sheen.addColorStop(1, 'rgba(8, 145, 178, 0.16)');
      btCtx.fillStyle = sheen;
      btCtx.fillRect(tx + 3, ty + 3, btTile - 6, btTile - 6);

      // Clean ceramic grout lines
      btCtx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
      btCtx.lineWidth = 3;
      btCtx.strokeRect(tx + 1.5, ty + 1.5, btTile - 3, btTile - 3);
    }
  }
  // Subtle soapy foam & wet reflection spots near the edges
  for (let i = 0; i < 18; i++) {
    const sx = i % 2 === 0 ? 22 + (i % 5) * 9 : 490 - (i % 5) * 9;
    const sy = ((i * 67) % 480) + 16;
    const sr = 6 + (i % 4) * 3;
    btCtx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    btCtx.beginPath();
    btCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    btCtx.fill();
  }
  // Turquoise porcelain curb rails & crisp lane dividers at 1/3 and 2/3
  btCtx.fillStyle = '#0891b2';
  btCtx.fillRect(0, 0, 14, 512);
  btCtx.fillRect(498, 0, 14, 512);
  btCtx.fillStyle = 'rgba(6, 182, 212, 0.65)';
  for (let y = 18; y < 512; y += 96) {
    btCtx.fillRect(167, y, 7, 56);
    btCtx.fillRect(338, y, 7, 56);
  }
  const bathRoadTexture = new THREE.CanvasTexture(btCanvas);
  bathRoadTexture.colorSpace = THREE.SRGBColorSpace;
  bathRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  bathRoadTexture.wrapT = THREE.RepeatWrapping;
  bathRoadTexture.repeat.set(1, 3);
  bathRoadTexture.anisotropy = maxAnisotropy;

  // 11b. Cracked Arctic Glacier Ice Runway Texture (3 clear ice lanes + frost borders)
  const icCanvas = document.createElement('canvas');
  icCanvas.width = 512;
  icCanvas.height = 512;
  const icCtx = icCanvas.getContext('2d')!;
  const icGrad = icCtx.createLinearGradient(0, 0, 512, 0);
  icGrad.addColorStop(0, '#bae6fd');
  icGrad.addColorStop(0.2, '#7dd3fc');
  icGrad.addColorStop(0.5, '#bae6fd');
  icGrad.addColorStop(0.8, '#7dd3fc');
  icGrad.addColorStop(1, '#bae6fd');
  icCtx.fillStyle = icGrad;
  icCtx.fillRect(0, 0, 512, 512);

  // Subtle polished glacier skating tracks in the 3 lanes
  [85, 256, 427].forEach((cx) => {
    const trGrad = icCtx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    trGrad.addColorStop(0, 'rgba(255,255,255,0)');
    trGrad.addColorStop(0.5, 'rgba(224,242,254,0.48)');
    trGrad.addColorStop(1, 'rgba(255,255,255,0)');
    icCtx.fillStyle = trGrad;
    icCtx.fillRect(cx - 56, 0, 112, 512);
  });

  // Crystalline subsurface ice fractures (seam-matched vertically)
  icCtx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  icCtx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const x1 = 24 + ((i * 79) % 464);
    const y1 = (i * 43) % 512;
    const x2 = x1 + ((i % 2 === 0 ? 1 : -1) * (28 + (i % 5) * 8));
    const y2 = y1 + 36 + (i % 4) * 14;
    icCtx.beginPath();
    icCtx.moveTo(x1, y1);
    icCtx.lineTo(x2, y2);
    icCtx.stroke();
    if (y2 > 512) {
      icCtx.beginPath();
      icCtx.moveTo(x1, y1 - 512);
      icCtx.lineTo(x2, y2 - 512);
      icCtx.stroke();
    }
  }
  // Snow-dusted borders & crisp ice lane dashes
  icCtx.fillStyle = '#f0f9ff';
  icCtx.fillRect(0, 0, 14, 512);
  icCtx.fillRect(498, 0, 14, 512);
  icCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let y = 16; y < 512; y += 96) {
    icCtx.fillRect(167, y, 7, 52);
    icCtx.fillRect(338, y, 7, 52);
  }
  const iceRoadTexture = new THREE.CanvasTexture(icCanvas);
  iceRoadTexture.colorSpace = THREE.SRGBColorSpace;
  iceRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  iceRoadTexture.wrapT = THREE.RepeatWrapping;
  iceRoadTexture.repeat.set(1, 2);
  iceRoadTexture.anisotropy = maxAnisotropy;

  // 11c. Volcanic Basalt & Magma Fissure Bridge Texture
  const lvCanvas = document.createElement('canvas');
  lvCanvas.width = 512;
  lvCanvas.height = 512;
  const lvCtx = lvCanvas.getContext('2d')!;
  lvCtx.fillStyle = '#18181b';
  lvCtx.fillRect(0, 0, 512, 512);

  // Subtle basalt slab stone grain
  for (let i = 0; i < 2200; i++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 512;
    lvCtx.fillStyle = i % 2 === 0 ? 'rgba(63, 63, 70, 0.25)' : 'rgba(9, 9, 11, 0.45)';
    lvCtx.fillRect(sx, sy, 3, 3);
  }
  // Worn obsidian tracks along 3 lanes
  [85, 256, 427].forEach((cx) => {
    const trGrad = lvCtx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    trGrad.addColorStop(0, 'rgba(0,0,0,0)');
    trGrad.addColorStop(0.5, 'rgba(39,39,42,0.52)');
    trGrad.addColorStop(1, 'rgba(0,0,0,0)');
    lvCtx.fillStyle = trGrad;
    lvCtx.fillRect(cx - 56, 0, 112, 512);
  });
  // Glowing molten magma veins branching subtly from outer edges
  for (let i = 0; i < 16; i++) {
    const isLeft = i % 2 === 0;
    const xStart = isLeft ? 10 : 502;
    const xEnd = isLeft ? 34 + (i % 4) * 16 : 478 - (i % 4) * 16;
    const yStart = (i * 64) % 512;
    const yMid = yStart + 22;
    lvCtx.strokeStyle = 'rgba(249, 115, 22, 0.72)';
    lvCtx.lineWidth = 3;
    lvCtx.beginPath();
    lvCtx.moveTo(xStart, yStart);
    lvCtx.lineTo(xEnd, yMid);
    lvCtx.stroke();
    lvCtx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    lvCtx.lineWidth = 1;
    lvCtx.stroke();
  }
  // Glowing lava rails & orange lane markers
  lvCtx.fillStyle = '#ea580c';
  lvCtx.fillRect(0, 0, 12, 512);
  lvCtx.fillRect(500, 0, 12, 512);
  lvCtx.fillStyle = 'rgba(251, 146, 60, 0.85)';
  for (let y = 16; y < 512; y += 96) {
    lvCtx.fillRect(167, y, 7, 52);
    lvCtx.fillRect(338, y, 7, 52);
  }
  const lavaRoadTexture = new THREE.CanvasTexture(lvCanvas);
  lavaRoadTexture.colorSpace = THREE.SRGBColorSpace;
  lavaRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  lavaRoadTexture.wrapT = THREE.RepeatWrapping;
  lavaRoadTexture.repeat.set(1, 2);
  lavaRoadTexture.anisotropy = maxAnisotropy;

  // 12. Mad Lab Dark Metallic Tech Grid with Neon Toxic Hazard Borders
  const lbCanvas = document.createElement('canvas');
  lbCanvas.width = 256;
  lbCanvas.height = 256;
  const lbCtx = lbCanvas.getContext('2d')!;
  lbCtx.fillStyle = '#0f172a';
  lbCtx.fillRect(0, 0, 256, 256);
  lbCtx.strokeStyle = 'rgba(74, 222, 128, 0.25)';
  lbCtx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 42.666) {
    lbCtx.beginPath();
    lbCtx.moveTo(i, 0);
    lbCtx.lineTo(i, 256);
    lbCtx.stroke();
    lbCtx.beginPath();
    lbCtx.moveTo(0, i);
    lbCtx.lineTo(256, i);
    lbCtx.stroke();
  }
  // Caution hazard stripes along edges
  for (let y = 0; y < 256; y += 32) {
    lbCtx.fillStyle = (y / 32) % 2 === 0 ? '#22c55e' : '#052e16';
    lbCtx.fillRect(0, y, 10, 32);
    lbCtx.fillRect(246, y, 10, 32);
  }
  lbCtx.fillStyle = '#4ade80';
  for (let y = 12; y < 256; y += 64) {
    lbCtx.fillRect(84, y, 4, 34);
    lbCtx.fillRect(169, y, 4, 34);
  }
  const labRoadTexture = new THREE.CanvasTexture(lbCanvas);
  labRoadTexture.colorSpace = THREE.SRGBColorSpace;
  labRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  labRoadTexture.wrapT = THREE.RepeatWrapping;
  labRoadTexture.repeat.set(1, 3);
  labRoadTexture.anisotropy = maxAnisotropy;

  // 13. Cheese Galaxy Starlight Cosmic Runway
  const spCanvas = document.createElement('canvas');
  spCanvas.width = 256;
  spCanvas.height = 256;
  const spCtx = spCanvas.getContext('2d')!;
  spCtx.fillStyle = '#1e1b4b';
  spCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 160; i++) {
    spCtx.fillStyle = i % 4 === 0 ? '#fde047' : '#e0e7ff';
    spCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  spCtx.fillStyle = '#e879f9';
  spCtx.fillRect(0, 0, 8, 256);
  spCtx.fillRect(248, 0, 8, 256);
  spCtx.fillStyle = 'rgba(56, 189, 248, 0.55)';
  for (let y = 12; y < 256; y += 64) {
    spCtx.fillRect(84, y, 4, 34);
    spCtx.fillRect(169, y, 4, 34);
  }
  const spaceRoadTexture = new THREE.CanvasTexture(spCanvas);
  spaceRoadTexture.colorSpace = THREE.SRGBColorSpace;
  spaceRoadTexture.wrapS = THREE.ClampToEdgeWrapping;
  spaceRoadTexture.wrapT = THREE.RepeatWrapping;
  spaceRoadTexture.repeat.set(1, 3);
  spaceRoadTexture.anisotropy = maxAnisotropy;

  // 14. Soft Fluffy Snowflake Crystal Sprite (realistic snowfall, zero square pixels)
  const sfCanvas = document.createElement('canvas');
  sfCanvas.width = 128;
  sfCanvas.height = 128;
  const sfCtx = sfCanvas.getContext('2d')!;
  const sfGrad = sfCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  sfGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  sfGrad.addColorStop(0.32, 'rgba(240, 249, 255, 0.92)');
  sfGrad.addColorStop(0.68, 'rgba(224, 242, 254, 0.38)');
  sfGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');
  sfCtx.fillStyle = sfGrad;
  sfCtx.fillRect(0, 0, 128, 128);

  // Subtle 6-branch feathery ice star glints inside the flake
  sfCtx.save();
  sfCtx.translate(64, 64);
  sfCtx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  sfCtx.lineCap = 'round';
  sfCtx.lineWidth = 3;
  for (let a = 0; a < 6; a++) {
    sfCtx.rotate(Math.PI / 3);
    sfCtx.beginPath();
    sfCtx.moveTo(0, 0);
    sfCtx.lineTo(0, -40);
    sfCtx.moveTo(0, -24);
    sfCtx.lineTo(-10, -34);
    sfCtx.moveTo(0, -24);
    sfCtx.lineTo(10, -34);
    sfCtx.stroke();
  }
  sfCtx.restore();

  const snowFlakeTexture = new THREE.CanvasTexture(sfCanvas);
  snowFlakeTexture.colorSpace = THREE.SRGBColorSpace;
  snowFlakeTexture.anisotropy = maxAnisotropy;

  // 14b. Iridescent Translucent Soap Bubble Sprite (specifically for Köpüklü Banyo!)
  const bubCanvas = document.createElement('canvas');
  bubCanvas.width = 128;
  bubCanvas.height = 128;
  const bubCtx = bubCanvas.getContext('2d')!;
  const bubBody = bubCtx.createRadialGradient(64, 64, 18, 64, 64, 58);
  bubBody.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
  bubBody.addColorStop(0.65, 'rgba(186, 230, 253, 0.16)');
  bubBody.addColorStop(0.86, 'rgba(103, 232, 249, 0.78)');
  bubBody.addColorStop(0.95, 'rgba(244, 114, 182, 0.55)');
  bubBody.addColorStop(1, 'rgba(255, 255, 255, 0)');
  bubCtx.fillStyle = bubBody;
  bubCtx.beginPath();
  bubCtx.arc(64, 64, 58, 0, Math.PI * 2);
  bubCtx.fill();

  // Crisp glossy crescent highlight at top-left
  bubCtx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  bubCtx.beginPath();
  bubCtx.ellipse(42, 40, 14, 7, -Math.PI / 4, 0, Math.PI * 2);
  bubCtx.fill();

  bubCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  bubCtx.beginPath();
  bubCtx.arc(32, 54, 4.5, 0, Math.PI * 2);
  bubCtx.fill();

  // Subtle pastel bottom rim sheen
  bubCtx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  bubCtx.lineWidth = 3;
  bubCtx.beginPath();
  bubCtx.arc(64, 64, 46, Math.PI * 0.15, Math.PI * 0.42);
  bubCtx.stroke();

  const bubbleParticleTexture = new THREE.CanvasTexture(bubCanvas);
  bubbleParticleTexture.colorSpace = THREE.SRGBColorSpace;
  bubbleParticleTexture.anisotropy = maxAnisotropy;

  // 14c. Soft Radial Glow Orb Sprite (fire embers, lab spores, kitchen dust, cave glints, stars)
  const orbCanvas = document.createElement('canvas');
  orbCanvas.width = 128;
  orbCanvas.height = 128;
  const orbCtx = orbCanvas.getContext('2d')!;
  const orbGrad = orbCtx.createRadialGradient(64, 64, 2, 64, 64, 58);
  orbGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  orbGrad.addColorStop(0.28, 'rgba(255, 255, 255, 0.85)');
  orbGrad.addColorStop(0.62, 'rgba(255, 255, 255, 0.25)');
  orbGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  orbCtx.fillStyle = orbGrad;
  orbCtx.fillRect(0, 0, 128, 128);

  const glowOrbParticleTexture = new THREE.CanvasTexture(orbCanvas);
  glowOrbParticleTexture.colorSpace = THREE.SRGBColorSpace;
  glowOrbParticleTexture.anisotropy = maxAnisotropy;

  // 15. Giant Kitchen Glossy Subway Ceramic Wall Tile Texture
  const kwCanvas = document.createElement('canvas');
  kwCanvas.width = 512;
  kwCanvas.height = 512;
  const kwCtx = kwCanvas.getContext('2d')!;
  kwCtx.fillStyle = '#fefce8';
  kwCtx.fillRect(0, 0, 512, 512);
  const kwRows = 8;
  const kwCols = 4;
  const kwH = 512 / kwRows;
  const kwW = 512 / kwCols;
  for (let row = 0; row < kwRows; row++) {
    const offset = row % 2 === 0 ? 0 : kwW * 0.5;
    for (let col = -1; col <= kwCols; col++) {
      const tx = col * kwW + offset;
      const ty = row * kwH;
      const warmTint = (row + col) % 3 === 0 ? '#fef3c7' : (row * 2 + col) % 4 === 0 ? '#ffedd5' : '#fffbeb';
      kwCtx.fillStyle = warmTint;
      kwCtx.fillRect(tx + 3, ty + 3, kwW - 6, kwH - 6);
      kwCtx.fillStyle = 'rgba(255,255,255,0.55)';
      kwCtx.fillRect(tx + 6, ty + 6, kwW - 12, 8);
      kwCtx.fillStyle = 'rgba(180,83,9,0.14)';
      kwCtx.fillRect(tx, ty, kwW, 3);
      kwCtx.fillRect(tx, ty, 3, kwH);
    }
  }
  const kitchenWallTexture = new THREE.CanvasTexture(kwCanvas);
  kitchenWallTexture.colorSpace = THREE.SRGBColorSpace;
  kitchenWallTexture.wrapS = THREE.RepeatWrapping;
  kitchenWallTexture.wrapT = THREE.RepeatWrapping;
  kitchenWallTexture.repeat.set(3, 2);
  kitchenWallTexture.anisotropy = maxAnisotropy;

  // 16. Luxury Spa Bathroom Aqua Mosaic + Marble Wainscoting Wall Texture
  const bwCanvas = document.createElement('canvas');
  bwCanvas.width = 512;
  bwCanvas.height = 512;
  const bwCtx = bwCanvas.getContext('2d')!;
  bwCtx.fillStyle = '#e0f2fe';
  bwCtx.fillRect(0, 0, 512, 512);
  const bwGrid = 8;
  const bwSize = 512 / bwGrid;
  const bathShades = ['#ecfeff', '#cffafe', '#a5f3fc', '#bae6fd'];
  for (let r = 0; r < bwGrid; r++) {
    const isWainscot = r >= 5;
    for (let c = 0; c < bwGrid; c++) {
      const shade = isWainscot
        ? (r + c) % 2 === 0
          ? '#f8fafc'
          : '#e2e8f0'
        : bathShades[(r * 3 + c * 5) % bathShades.length];
      bwCtx.fillStyle = shade;
      bwCtx.fillRect(c * bwSize + 3, r * bwSize + 3, bwSize - 6, bwSize - 6);
      bwCtx.fillStyle = 'rgba(255,255,255,0.72)';
      bwCtx.fillRect(c * bwSize + 6, r * bwSize + 6, bwSize - 14, 7);
      bwCtx.fillStyle = 'rgba(14, 116, 144, 0.12)';
      bwCtx.fillRect(c * bwSize + 4, (r + 1) * bwSize - 6, bwSize - 8, 3);
    }
  }
  // Ornate cobalt & pearl mosaic border separating upper aqua tiles & lower marble wainscot
  bwCtx.fillStyle = '#0e7490';
  bwCtx.fillRect(0, 304, 512, 20);
  bwCtx.fillStyle = '#67e8f9';
  for (let x = 6; x < 512; x += 24) {
    bwCtx.fillRect(x, 309, 12, 10);
  }
  const bathWallTexture = new THREE.CanvasTexture(bwCanvas);
  bathWallTexture.colorSpace = THREE.SRGBColorSpace;
  bathWallTexture.wrapS = THREE.RepeatWrapping;
  bathWallTexture.wrapT = THREE.RepeatWrapping;
  bathWallTexture.repeat.set(3, 2);
  bathWallTexture.anisotropy = maxAnisotropy;

  // 16b. Bathroom Illuminated Vanity Mirror & Frosted Window Wall Panels
  const bathMirrorTextures: THREE.CanvasTexture[] = [];

  // Panel 0: Steamy Vanity LED Mirror with Heart Doodle & Sparkles
  const bmCanvas = document.createElement('canvas');
  bmCanvas.width = 512;
  bmCanvas.height = 256;
  const bmCtx = bmCanvas.getContext('2d')!;
  bmCtx.fillStyle = '#94a3b8';
  bmCtx.fillRect(0, 0, 512, 256);
  const mirrorGrad = bmCtx.createLinearGradient(0, 14, 512, 242);
  mirrorGrad.addColorStop(0, '#e0f2fe');
  mirrorGrad.addColorStop(0.45, '#bae6fd');
  mirrorGrad.addColorStop(1, '#7dd3fc');
  bmCtx.fillStyle = mirrorGrad;
  bmCtx.fillRect(14, 14, 484, 228);

  // Diagonal soft mirror reflection streaks
  bmCtx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  bmCtx.beginPath();
  bmCtx.moveTo(60, 14);
  bmCtx.lineTo(145, 14);
  bmCtx.lineTo(85, 242);
  bmCtx.lineTo(14, 242);
  bmCtx.closePath();
  bmCtx.fill();
  bmCtx.beginPath();
  bmCtx.moveTo(168, 14);
  bmCtx.lineTo(202, 14);
  bmCtx.lineTo(142, 242);
  bmCtx.lineTo(108, 242);
  bmCtx.closePath();
  bmCtx.fill();

  // Warm backlit LED mirror halo border
  bmCtx.strokeStyle = '#ffffff';
  bmCtx.lineWidth = 6;
  bmCtx.strokeRect(22, 22, 468, 212);

  // Misty steam fog cloud & finger-drawn heart + bubble sparkles
  bmCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  bmCtx.beginPath();
  bmCtx.arc(360, 130, 82, 0, Math.PI * 2);
  bmCtx.fill();
  bmCtx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
  bmCtx.lineWidth = 5;
  bmCtx.beginPath();
  bmCtx.moveTo(360, 162);
  bmCtx.bezierCurveTo(320, 136, 326, 98, 348, 102);
  bmCtx.bezierCurveTo(356, 104, 360, 112, 360, 116);
  bmCtx.bezierCurveTo(360, 112, 364, 104, 372, 102);
  bmCtx.bezierCurveTo(394, 98, 400, 136, 360, 162);
  bmCtx.stroke();

  bmCtx.fillStyle = '#0c4a6e';
  bmCtx.font = '800 24px "Bricolage Grotesque", system-ui, sans-serif';
  bmCtx.textAlign = 'left';
  bmCtx.textBaseline = 'middle';
  bmCtx.fillText('MİS GİBİ KÖPÜK', 42, 92);
  bmCtx.fillStyle = '#0369a1';
  bmCtx.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
  bmCtx.fillText('PARLAK AYNA · SPA', 42, 132);

  const bmTex = new THREE.CanvasTexture(bmCanvas);
  bmTex.colorSpace = THREE.SRGBColorSpace;
  bmTex.anisotropy = maxAnisotropy;
  bathMirrorTextures.push(bmTex);

  // Panel 1: Sunlit Frosted Bathroom Window with Soft Plant Silhouette & Water Droplets
  const bwWinCanvas = document.createElement('canvas');
  bwWinCanvas.width = 512;
  bwWinCanvas.height = 256;
  const bwWinCtx = bwWinCanvas.getContext('2d')!;
  bwWinCtx.fillStyle = '#f8fafc';
  bwWinCtx.fillRect(0, 0, 512, 256);
  const sunWinGrad = bwWinCtx.createRadialGradient(256, 118, 18, 256, 128, 240);
  sunWinGrad.addColorStop(0, '#ffffff');
  sunWinGrad.addColorStop(0.5, '#bae6fd');
  sunWinGrad.addColorStop(1, '#38bdf8');
  bwWinCtx.fillStyle = sunWinGrad;
  bwWinCtx.fillRect(14, 14, 484, 228);

  // Frosted horizontal privacy louver stripes
  bwWinCtx.fillStyle = 'rgba(255, 255, 255, 0.24)';
  for (let y = 22; y < 236; y += 22) {
    bwWinCtx.fillRect(14, y, 484, 9);
  }
  // Subtle silhouette of bathroom fern fronds behind frosted glass
  bwWinCtx.fillStyle = 'rgba(16, 185, 129, 0.24)';
  for (let i = 0; i < 6; i++) {
    bwWinCtx.beginPath();
    bwWinCtx.ellipse(115 + i * 16, 175 - i * 18, 28, 10, -0.5 + i * 0.14, 0, Math.PI * 2);
    bwWinCtx.fill();
  }
  // Crisp white window crossbars & condensation droplets
  bwWinCtx.fillStyle = '#f8fafc';
  bwWinCtx.fillRect(250, 14, 12, 228);
  bwWinCtx.fillRect(14, 122, 484, 12);
  bwWinCtx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  for (let i = 0; i < 14; i++) {
    bwWinCtx.beginPath();
    bwWinCtx.arc(44 + ((i * 39) % 420), 40 + ((i * 53) % 175), 3 + (i % 3), 0, Math.PI * 2);
    bwWinCtx.fill();
  }

  const bwWinTex = new THREE.CanvasTexture(bwWinCanvas);
  bwWinTex.colorSpace = THREE.SRGBColorSpace;
  bwWinTex.anisotropy = maxAnisotropy;
  bathMirrorTextures.push(bwWinTex);

  // 17. Mad Lab Illuminated Wall Boards (Periodic Table + Chemical Formulas H2O / CO2 / NaCl)
  const labBoardTextures: THREE.CanvasTexture[] = [];

  // Board 0: Periodic Table Display
  const ptCanvas = document.createElement('canvas');
  ptCanvas.width = 512;
  ptCanvas.height = 256;
  const ptCtx = ptCanvas.getContext('2d')!;
  ptCtx.fillStyle = '#06121e';
  ptCtx.fillRect(0, 0, 512, 256);
  ptCtx.strokeStyle = '#22d3ee';
  ptCtx.lineWidth = 5;
  ptCtx.strokeRect(8, 8, 496, 240);
  ptCtx.fillStyle = '#0f2942';
  ptCtx.fillRect(14, 14, 484, 38);
  ptCtx.fillStyle = '#67e8f9';
  ptCtx.font = '800 22px "Bricolage Grotesque", system-ui, sans-serif';
  ptCtx.textAlign = 'center';
  ptCtx.textBaseline = 'middle';
  ptCtx.fillText('PERİYODİK TABLO · ELEMENTLER', 256, 34);

  const elements = [
    { num: '1', sym: 'H', col: '#22c55e', gx: 0, gy: 0 },
    { num: '2', sym: 'He', col: '#a855f7', gx: 5, gy: 0 },
    { num: '3', sym: 'Li', col: '#ef4444', gx: 0, gy: 1 },
    { num: '6', sym: 'C', col: '#10b981', gx: 2, gy: 1 },
    { num: '7', sym: 'N', col: '#10b981', gx: 3, gy: 1 },
    { num: '8', sym: 'O', col: '#38bdf8', gx: 4, gy: 1 },
    { num: '10', sym: 'Ne', col: '#a855f7', gx: 5, gy: 1 },
    { num: '11', sym: 'Na', col: '#ef4444', gx: 0, gy: 2 },
    { num: '12', sym: 'Mg', col: '#f59e0b', gx: 1, gy: 2 },
    { num: '17', sym: 'Cl', col: '#06b6d4', gx: 4, gy: 2 },
    { num: '26', sym: 'Fe', col: '#f97316', gx: 2, gy: 2 },
    { num: '79', sym: 'Au', col: '#eab308', gx: 3, gy: 2 },
    { num: '29', sym: 'Cu', col: '#f97316', gx: 1, gy: 1 },
    { num: '47', sym: 'Ag', col: '#94a3b8', gx: 5, gy: 2 },
  ];
  const cellW = 74;
  const cellH = 56;
  const startX = 34;
  const startY = 64;
  elements.forEach((el) => {
    const x = startX + el.gx * cellW;
    const y = startY + el.gy * cellH;
    ptCtx.fillStyle = '#0f172a';
    ptCtx.fillRect(x, y, cellW - 6, cellH - 6);
    ptCtx.strokeStyle = el.col;
    ptCtx.lineWidth = 3;
    ptCtx.strokeRect(x, y, cellW - 6, cellH - 6);
    ptCtx.fillStyle = el.col;
    ptCtx.font = '700 12px system-ui, sans-serif';
    ptCtx.textAlign = 'left';
    ptCtx.fillText(el.num, x + 6, y + 12);
    ptCtx.fillStyle = '#f8fafc';
    ptCtx.font = '800 24px "Bricolage Grotesque", system-ui, sans-serif';
    ptCtx.textAlign = 'center';
    ptCtx.fillText(el.sym, x + (cellW - 6) / 2, y + 34);
  });
  const ptTex = new THREE.CanvasTexture(ptCanvas);
  ptTex.colorSpace = THREE.SRGBColorSpace;
  ptTex.anisotropy = maxAnisotropy;
  labBoardTextures.push(ptTex);

  // Board 1: Chemical Formulas & Reaction Display (H2O, CO2, NaCl, CH4 + Flask Icon)
  const fmCanvas = document.createElement('canvas');
  fmCanvas.width = 512;
  fmCanvas.height = 256;
  const fmCtx = fmCanvas.getContext('2d')!;
  fmCtx.fillStyle = '#071710';
  fmCtx.fillRect(0, 0, 512, 256);
  fmCtx.strokeStyle = '#4ade80';
  fmCtx.lineWidth = 5;
  fmCtx.strokeRect(8, 8, 496, 240);
  fmCtx.fillStyle = '#052e16';
  fmCtx.fillRect(14, 14, 484, 38);
  fmCtx.fillStyle = '#86efac';
  fmCtx.font = '800 21px "Bricolage Grotesque", system-ui, sans-serif';
  fmCtx.textAlign = 'center';
  fmCtx.textBaseline = 'middle';
  fmCtx.fillText('KİMYA FORMÜLLERİ · AKTİF DENEY', 256, 34);

  const formulas = [
    { formula: 'H₂O', label: 'SU · SAF', color: '#38bdf8', x: 26, y: 68 },
    { formula: 'CO₂', label: 'GAZ · KÖPÜK', color: '#4ade80', x: 186, y: 68 },
    { formula: 'NaCl', label: 'TUZ KRİSTALİ', color: '#facc15', x: 26, y: 156 },
    { formula: 'CH₄', label: 'METAN GAZI', color: '#f472b6', x: 186, y: 156 },
  ];
  formulas.forEach((f) => {
    fmCtx.fillStyle = '#0f172a';
    fmCtx.fillRect(f.x, f.y, 146, 74);
    fmCtx.strokeStyle = f.color;
    fmCtx.lineWidth = 3;
    fmCtx.strokeRect(f.x, f.y, 146, 74);
    fmCtx.fillStyle = '#ffffff';
    fmCtx.font = '800 32px "Bricolage Grotesque", system-ui, sans-serif';
    fmCtx.textAlign = 'center';
    fmCtx.fillText(f.formula, f.x + 73, f.y + 30);
    fmCtx.fillStyle = f.color;
    fmCtx.font = '700 13px system-ui, sans-serif';
    fmCtx.fillText(f.label, f.x + 73, f.y + 58);
  });

  // Glowing Erlenmeyer Flask illustration on right side of board
  fmCtx.strokeStyle = '#67e8f9';
  fmCtx.lineWidth = 4;
  fmCtx.beginPath();
  fmCtx.moveTo(404, 78);
  fmCtx.lineTo(404, 112);
  fmCtx.lineTo(364, 212);
  fmCtx.lineTo(476, 212);
  fmCtx.lineTo(436, 112);
  fmCtx.lineTo(436, 78);
  fmCtx.closePath();
  fmCtx.stroke();
  fmCtx.fillStyle = 'rgba(74, 222, 128, 0.72)';
  fmCtx.beginPath();
  fmCtx.moveTo(382, 168);
  fmCtx.lineTo(368, 208);
  fmCtx.lineTo(472, 208);
  fmCtx.lineTo(458, 168);
  fmCtx.closePath();
  fmCtx.fill();
  // Bubbles rising out of flask
  [
    { x: 416, y: 148, r: 7 },
    { x: 428, y: 126, r: 5 },
    { x: 418, y: 92, r: 6 },
    { x: 424, y: 66, r: 8 },
  ].forEach((b) => {
    fmCtx.fillStyle = '#86efac';
    fmCtx.beginPath();
    fmCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    fmCtx.fill();
  });

  const fmTex = new THREE.CanvasTexture(fmCanvas);
  fmTex.colorSpace = THREE.SRGBColorSpace;
  fmTex.anisotropy = maxAnisotropy;
  labBoardTextures.push(fmTex);

  // 14. Championship "YENİ REKOR!" Overhead Arch Banner
  const recCanvas = document.createElement('canvas');
  recCanvas.width = 512;
  recCanvas.height = 128;
  const recCtx = recCanvas.getContext('2d')!;
  const recGrad = recCtx.createLinearGradient(0, 0, 512, 128);
  recGrad.addColorStop(0, '#0f172a');
  recGrad.addColorStop(0.5, '#1e1b4b');
  recGrad.addColorStop(1, '#0f172a');
  recCtx.fillStyle = recGrad;
  recCtx.fillRect(0, 0, 512, 128);
  recCtx.strokeStyle = '#fbbf24';
  recCtx.lineWidth = 8;
  recCtx.strokeRect(6, 6, 500, 116);
  recCtx.fillStyle = '#fde047';
  recCtx.font = '900 46px system-ui, -apple-system, sans-serif';
  recCtx.textAlign = 'center';
  recCtx.textBaseline = 'middle';
  recCtx.fillText('★ YENİ REKOR! ★', 256, 66);

  const recordBannerTexture = new THREE.CanvasTexture(recCanvas);
  recordBannerTexture.colorSpace = THREE.SRGBColorSpace;
  recordBannerTexture.anisotropy = maxAnisotropy;

  const allTextures: THREE.Texture[] = [
    asphaltTexture,
    sidewalkTexture,
    buildingTexture,
    earthRoadTexture,
    earthWallTexture,
    kitchenRoadTexture,
    bathRoadTexture,
    iceRoadTexture,
    lavaRoadTexture,
    labRoadTexture,
    spaceRoadTexture,
    chitinWingTexture,
    fabricWeaveTexture,
    reticleTexture,
    shadowTexture,
    snowFlakeTexture,
    bubbleParticleTexture,
    glowOrbParticleTexture,
    kitchenWallTexture,
    bathWallTexture,
    ...bathMirrorTextures,
    ...labBoardTextures,
    ...shopSigns,
    recordBannerTexture,
  ];

  let currentAniso = maxAnisotropy;

  return {
    asphaltTexture,
    sidewalkTexture,
    buildingTexture,
    earthRoadTexture,
    earthWallTexture,
    kitchenRoadTexture,
    bathRoadTexture,
    iceRoadTexture,
    lavaRoadTexture,
    labRoadTexture,
    spaceRoadTexture,
    chitinWingTexture,
    fabricWeaveTexture,
    reticleTexture,
    shadowTexture,
    snowFlakeTexture,
    bubbleParticleTexture,
    glowOrbParticleTexture,
    kitchenWallTexture,
    bathWallTexture,
    bathMirrorTextures,
    labBoardTextures,
    shopSigns,
    recordBannerTexture,
    setAnisotropy: (level: number) => {
      const clamped = Math.max(1, Math.min(maxAnisotropy, Math.round(level)));
      if (clamped === currentAniso) return;
      currentAniso = clamped;
      for (const tex of allTextures) {
        tex.anisotropy = clamped;
      }
    },
    markNeedsUpdate: () => {
      for (const tex of allTextures) {
        tex.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const tex of allTextures) {
        tex.dispose();
      }
    },
  };
}
