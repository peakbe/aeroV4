// pfd.js — FULL GLASS PFD Airbus A320 (version simplifiée PRO+++)

/**
 * data attendu :
 * {
 *   pitch: number,        // degrés
 *   bank: number,         // degrés
 *   speed: number,        // kt
 *   altitude: number,     // ft
 *   vsi: number,          // ft/min
 *   locDev: number,       // points LOC (-1 à +1)
 *   gsDev: number,        // points GS (-1 à +1)
 *   ap: boolean,
 *   athr: boolean,
 *   loc: boolean,
 *   gs: boolean
 * }
 */

export function drawPFD(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Fond
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);

  drawHorizon(ctx, w, h, data.pitch || 0, data.bank || 0);
  drawPitchLadder(ctx, w, h, data.pitch || 0);
  drawBankIndicator(ctx, w, h, data.bank || 0);
  drawFPV(ctx, w, h, data.pitch || 0, data.bank || 0);
  drawILS(ctx, w, h, data.locDev || 0, data.gsDev || 0);
  drawSpeedTape(ctx, w, h, data.speed || 0);
  drawAltitudeTape(ctx, w, h, data.altitude || 0);
  drawVSI(ctx, w, h, data.vsi || 0);
  drawFMA(ctx, w, h, data);
}

/* ---------- Horizon artificiel ---------- */
function drawHorizon(ctx, w, h, pitch, bank) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-bank * Math.PI) / 180);

  const pitchPx = pitch * 3; // 3 px par degré

  // Ciel
  ctx.fillStyle = "#004b87";
  ctx.fillRect(-w, -h * 2 + pitchPx, w * 2, h * 2);

  // Sol
  ctx.fillStyle = "#5a3b00";
  ctx.fillRect(-w, pitchPx, w * 2, h * 2);

  // Ligne d'horizon
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w, pitchPx);
  ctx.lineTo(w, pitchPx);
  ctx.stroke();

  ctx.restore();
}

/* ---------- Échelle de pitch ---------- */
function drawPitchLadder(ctx, w, h, pitch) {
  ctx.save();
  ctx.translate(w / 2, h / 2);

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1;

  for (let deg = -30; deg <= 30; deg += 5) {
    const offset = (deg - pitch) * 3;
    if (Math.abs(offset) > h / 2 + 20) continue;

    ctx.beginPath();
    const len = deg % 10 === 0 ? 40 : 20;
    ctx.moveTo(-len, -offset);
    ctx.lineTo(len, -offset);
    ctx.stroke();

    if (deg !== 0 && deg % 10 === 0) {
      ctx.font = "10px Consolas";
      ctx.fillText(`${deg}`, len + 5, -offset + 3);
      ctx.fillText(`${deg}`, -len - 20, -offset + 3);
    }
  }

  ctx.restore();
}

/* ---------- Indicateur de bank ---------- */
function drawBankIndicator(ctx, w, h, bank) {
  const cx = w / 2;
  const top = 30;
  const radius = 40;

  ctx.save();
  ctx.translate(cx, top);

  // Arc
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 2 * Math.PI, false);
  ctx.stroke();

  // Marques
  const marks = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60];
  marks.forEach((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    const x1 = radius * Math.cos(rad);
    const y1 = radius * Math.sin(rad);
    const x2 = (radius - 8) * Math.cos(rad);
    const y2 = (radius - 8) * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // Triangle bank actuel
  const bankRad = ((bank - 90) * Math.PI) / 180;
  const tx = (radius + 5) * Math.cos(bankRad);
  const ty = (radius + 5) * Math.sin(bankRad);

  ctx.fillStyle = "#00ff00";
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 5, ty + 10);
  ctx.lineTo(tx + 5, ty + 10);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/* ---------- FPV (Flight Path Vector) ---------- */
function drawFPV(ctx, w, h, pitch, bank) {
  const cx = w / 2;
  const cy = h / 2;
  const pitchOffset = -pitch * 3;
  const bankOffset = bank * 1.5;

  const x = cx + bankOffset;
  const y = cy + pitchOffset;

  ctx.save();
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;

  // Cercle central
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, 2 * Math.PI);
  ctx.stroke();

  // Ailes
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x + 18, y);
  ctx.stroke();

  // Queue
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x, y + 18);
  ctx.stroke();

  ctx.restore();
}

/* ---------- ILS (LOC + GS) ---------- */
function drawILS(ctx, w, h, locDev, gsDev) {
  const cx = w / 2;
  const cy = h / 2;

  ctx.save();
  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 2;

  // LOC (horizontal)
  ctx.beginPath();
  ctx.moveTo(cx - 60, cy);
  ctx.lineTo(cx + 60, cy);
  ctx.stroke();

  const locX = cx + locDev * 50;
  ctx.beginPath();
  ctx.moveTo(locX, cy - 8);
  ctx.lineTo(locX, cy + 8);
  ctx.stroke();

  // GS (vertical)
  ctx.beginPath();
  ctx.moveTo(cx, cy - 60);
  ctx.lineTo(cx, cy + 60);
  ctx.stroke();

  const gsY = cy - gsDev * 50;
  ctx.beginPath();
  ctx.moveTo(cx - 8, gsY);
  ctx.lineTo(cx + 8, gsY);
  ctx.stroke();

  ctx.restore();
}

/* ---------- Speed tape ---------- */
function drawSpeedTape(ctx, w, h, speed) {
  const x = 20;
  const y = 20;
  const tapeW = 60;
  const tapeH = h - 40;

  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, tapeW, tapeH);

  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x, y, tapeW, tapeH);

  const centerSpeed = speed;
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Consolas";

  for (let s = centerSpeed - 40; s <= centerSpeed + 40; s += 10) {
    const offset = (centerSpeed - s) * 3;
    const sy = h / 2 + offset;
    if (sy < y || sy > y + tapeH) continue;

    ctx.beginPath();
    ctx.moveTo(x, sy);
    ctx.lineTo(x + 10, sy);
    ctx.stroke();

    ctx.fillText(`${s}`, x + 15, sy + 4);
  }

  // Speed box
  ctx.fillStyle = "#000000";
  ctx.fillRect(x + tapeW, h / 2 - 12, 40, 24);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x + tapeW, h / 2 - 12, 40, 24);
  ctx.fillStyle = "#00ff00";
  ctx.fillText(`${Math.round(speed)}`, x + tapeW + 5, h / 2 + 6);

  ctx.restore();
}

/* ---------- Altitude tape ---------- */
function drawAltitudeTape(ctx, w, h, altitude) {
  const x = w - 80;
  const y = 20;
  const tapeW = 60;
  const tapeH = h - 40;

  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, tapeW, tapeH);

  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x, y, tapeW, tapeH);

  const centerAlt = altitude;
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px Consolas";

  for (let a = centerAlt - 1000; a <= centerAlt + 1000; a += 200) {
    const offset = (centerAlt - a) * 0.06; // 0.06 px/ft ≈ 200 ft → 12 px
    const ay = h / 2 + offset;
    if (ay < y || ay > y + tapeH) continue;

    ctx.beginPath();
    ctx.moveTo(x + tapeW - 10, ay);
    ctx.lineTo(x + tapeW, ay);
    ctx.stroke();

    ctx.fillText(`${a}`, x + 5, ay + 4);
  }

  // Altitude box
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - 40, h / 2 - 12, 40, 24);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x - 40, h / 2 - 12, 40, 24);
  ctx.fillStyle = "#00ff00";
  ctx.fillText(`${Math.round(altitude)}`, x - 35, h / 2 + 6);

  ctx.restore();
}

/* ---------- VSI ---------- */
function drawVSI(ctx, w, h, vsi) {
  const x = w - 30;
  const y = 20;
  const hVsi = h - 40;

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x - 10, y, 20, hVsi);

  const vsiNorm = Math.max(-3000, Math.min(3000, vsi));
  const offset = (-vsiNorm / 3000) * (hVsi / 2);

  ctx.strokeStyle = "#00ff00";
  ctx.beginPath();
  ctx.moveTo(x - 10, h / 2 + offset);
  ctx.lineTo(x + 10, h / 2 + offset);
  ctx.stroke();

  ctx.restore();
}

/* ---------- FMA (Flight Mode Annunciator) ---------- */
function drawFMA(ctx, w, h, data) {
  const x = 60;
  const y = 10;
  const wBox = w - 120;
  const hBox = 20;

  ctx.save();
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x, y, wBox, hBox);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(x, y, wBox, hBox);

  ctx.fillStyle = "#00ff00";
  ctx.font = "11px Consolas";

  const modes = [];
  if (data.ap) modes.push("AP1");
  if (data.athr) modes.push("A/THR");
  if (data.loc) modes.push("LOC");
  if (data.gs) modes.push("GS");

  ctx.fillText(modes.join("  "), x + 8, y + 14);

  ctx.restore();
}
