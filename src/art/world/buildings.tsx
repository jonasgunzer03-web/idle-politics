import type { ReactNode } from 'react';
import type { LocationId } from '../../engine/ids';
import { GROUND, type Painter, wallColor } from './paint';
import type { ArchPalette } from './palette';

// Die Gebäude der Straße, jedes in fünf Ausbaustufen. Alle stehen auf der Bodenlinie
// GROUND (y = 250) und sind um x zentriert. Gezeichnet wird mit dem Painter (paint.tsx),
// der Tag-Ebene, Licht-Ebene (nachts) und Effekte (Rauch, Fahnen) trennt.

export interface BuildingProps {
  x: number;
  p: ArchPalette;
  /** 0–3: Ausstattung des Viertels. */
  grandeur: number;
  label: string;
  /** Parteifarbe (für das Parteibüro). */
  partyColor: string;
  /** Autokratisch: Propaganda statt Werbung. */
  autocratic: boolean;
  /** Büroangestellte arbeiten im Büro statt im Werk. */
  office: boolean;
  /** Ausbaustufe des Gebäudes (1–5). */
  level?: number;
}

interface BlockOpts {
  wall: string;
  floorH?: number;
  groundH?: number;
  cols?: number;
  winW?: number;
  winH?: number;
  arched?: boolean;
  cornice?: string;
  lit?: number;
  roof?: boolean;
  frame?: string;
  /** Erdgeschoss ohne Fenster (für Türen, Schaufenster). */
  plainGround?: boolean;
  depth?: number;
}

/** Mehrstöckiger Baukörper mit Fensterreihen und Gesimsen. Gibt Oberkante und linken Rand. */
function block(P: Painter, p: ArchPalette, cx: number, w: number, floors: number, o: BlockOpts) {
  const floorH = o.floorH ?? 24;
  const groundH = o.groundH ?? 30;
  const top = GROUND - groundH - (floors - 1) * floorH;
  const left = cx - w / 2;
  P.wall(left, top, w, GROUND - top, o.wall, o.depth ?? 5);
  const cols = o.cols ?? Math.max(2, Math.floor((w - 12) / 22));
  const winW = o.winW ?? 12;
  const winH = o.winH ?? 15;
  const gap = (w - cols * winW) / (cols + 1);
  for (let f = 1; f < floors; f++) {
    const y = top + (f - 1) * floorH;
    P.cornice(left, y + floorH - 2, w, o.cornice ?? p.trim, 2);
    for (let c = 0; c < cols; c++) {
      P.win(left + gap + c * (winW + gap), y + (floorH - winH) / 2, winW, winH, {
        arched: o.arched,
        lit: o.lit,
        frame: o.frame,
      });
    }
  }
  if (!o.plainGround) {
    for (let c = 0; c < cols; c++) {
      if (Math.abs(left + gap + c * (winW + gap) + winW / 2 - cx) < winW + 4) continue;
      P.win(left + gap + c * (winW + gap), GROUND - groundH + 6, winW, winH + 2, {
        arched: o.arched,
        lit: o.lit,
        frame: o.frame,
      });
    }
  }
  if (o.roof !== false) P.roof(left, w, top, p);
  return { top, left };
}

// ---------------------------------------------------------------- Werk / Büro

function sawtooth(P: Painter, left: number, w: number, top: number, teeth: number, color: string) {
  const tw = w / teeth;
  for (let i = 0; i < teeth; i++) {
    const x0 = left + i * tw;
    P.path(`M${x0} ${top} L${x0 + tw} ${top - 15} V${top} Z`, color);
    P.path(
      `M${x0 + tw - 3} ${top - 13} L${x0 + tw} ${top - 15} V${top} H${x0 + tw - 3} Z`,
      'url(#glass)',
    );
  }
}

function factory(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const brick = '#a5563f';
  const hallW = [0, 112, 142, 160, 124, 132][L] ?? 112;
  const hallH = [0, 62, 74, 86, 96, 104][L] ?? 62;
  const hallCx = L >= 4 ? x + 26 : x;
  const left = hallCx - hallW / 2;
  const top = GROUND - hallH;
  // Schornsteine hinter der Halle
  P.chimney(
    hallCx + hallW / 2 - 16,
    [0, 150, 118, 96, 60, 40][L] ?? 150,
    L >= 4 ? 13 : 9,
    '#8a4533',
    L >= 4,
  );
  if (L >= 3) P.chimney(hallCx - hallW / 2 + 18, L >= 5 ? 74 : 100, 9, '#7f3f2e');
  // Bürotrakt links ab Stufe 4
  if (L >= 4) {
    const annexFloors = L >= 5 ? 6 : 4;
    const a = block(P, p, x - 58, 64, annexFloors, {
      wall: '#c9b79a',
      floorH: 20,
      groundH: 26,
      cols: 3,
      winW: 12,
      winH: 12,
      roof: false,
      lit: 0.7,
    });
    P.rect(x - 92, a.top - 6, 68, 6, '#6f675c');
    // Verbindungsbrücke mit Förderband
    P.rect(x - 26, GROUND - 70, 18, 8, '#5c6770');
    P.glass(x - 26, GROUND - 69, 18, 6, true);
    if (L >= 5) P.neon(x - 58, a.top - 26, 'WERK', '#ff5a4f', 58);
  }
  P.wall(left, top, hallW, hallH, brick, 6);
  P.bricks(left, top, hallW, hallH);
  sawtooth(P, left, hallW, top, Math.max(2, Math.round(hallW / 36)), '#6f675c');
  P.cornice(left, top, hallW, '#6f675c', 3);
  // Fensterband
  const band = Math.max(2, Math.floor((hallW - 16) / 26));
  for (let i = 0; i < band; i++) {
    const wx = left + 8 + i * 26;
    if (Math.abs(wx + 9 - hallCx) < 36) continue;
    P.win(wx, top + 14, 18, 22, { lit: 0.8, frame: '#e8e2d6' });
    if (L >= 3) P.win(wx, top + 44, 18, 16, { lit: 0.8, frame: '#e8e2d6' });
  }
  // Rolltor
  const doorW = L >= 3 ? 58 : 50;
  const doorH = L >= 3 ? 62 : 50;
  P.rect(hallCx - doorW / 2 - 3, GROUND - doorH - 3, doorW + 6, doorH + 3, '#47515a');
  P.rect(hallCx - doorW / 2, GROUND - doorH, doorW, doorH, '#6c7880');
  for (let y = GROUND - doorH + 6; y < GROUND; y += 7) {
    P.line(hallCx - doorW / 2, y, hallCx + doorW / 2, y, '#4f5a62', 1.2);
  }
  P.add(
    <rect
      x={hallCx - doorW / 2 + 3}
      y={GROUND - doorH + 3}
      width={doorW - 6}
      height={doorH * 0.35}
      fill="url(#windowGlow)"
      opacity={0.55}
    />,
    'lights',
  );
  P.sign(hallCx, GROUND - doorH - 17, b.label, '#d9b54a', '#2b2f36', Math.min(hallW - 20, 90));
  // Laderampe mit Kisten
  if (L >= 2) {
    for (let i = 0; i < Math.min(4, L); i++) {
      const cx2 = hallCx + doorW / 2 + 6 + i * 11;
      if (cx2 > left + hallW - 12) break;
      P.rect(cx2, GROUND - 10 - (i % 2) * 9, 10, 10, '#b98a55', { stroke: '#8a6238', sw: 0.8 });
    }
  }
  // Wasserturm auf dem Dach
  if (L >= 5) {
    const tx = hallCx + 18;
    P.rect(tx - 2, top - 44, 2, 30, '#5a5f66');
    P.rect(tx + 14, top - 44, 2, 30, '#5a5f66');
    P.rect(tx - 4, top - 64, 22, 22, '#8a8f96', { rx: 3 });
    P.path(`M${tx - 6} ${top - 64} L${tx + 7} ${top - 74} L${tx + 20} ${top - 64} Z`, '#6f675c');
  }
}

function office(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const floors = [0, 3, 4, 6, 8, 10][L] ?? 3;
  const w = [0, 112, 130, 150, 164, 176][L] ?? 112;
  const modern = L >= 3;
  const floorH = 18;
  const groundH = 30;
  const top = GROUND - groundH - (floors - 1) * floorH;
  const left = x - w / 2;
  P.wall(left, top, w, GROUND - top, modern ? '#dfe3e6' : wallColor(p, 2), 7);
  if (modern) {
    // Glasbänder mit senkrechten Lamellen
    for (let f = 1; f < floors; f++) {
      const y = top + (f - 1) * floorH + 3;
      P.glass(left + 6, y, w - 12, floorH - 6, (f + L) % 3 !== 0, '#8a959e');
    }
    for (let fx = left + 6; fx <= left + w - 6; fx += 18) {
      P.rect(fx - 1, top, 2, GROUND - groundH - top, '#b5bec5');
    }
  } else {
    for (let f = 1; f < floors; f++) {
      const y = top + (f - 1) * floorH;
      P.cornice(left, y + floorH - 2, w, p.trim, 1.5);
      P.windows(left + 10, y + 3, Math.floor((w - 14) / 22), 1, 14, 11, 8, 0, { lit: 0.7 });
    }
  }
  // Eingangshalle
  P.rect(left, GROUND - groundH, w, 3, '#8a959e');
  P.glass(x - 30, GROUND - groundH + 5, 60, groundH - 5, true, '#4a4f57');
  P.door(x, 18, 24, '#3b4a55');
  P.sign(x, GROUND - groundH - 14, b.label, '#2b2f36', '#fff', Math.min(w - 20, 90));
  if (L >= 4) P.neon(x, top - 20, L >= 5 ? 'HOLDING' : 'BÜRO', '#6fd0ff', 60);
  if (L >= 5) {
    P.rect(x + w / 2 - 20, top - 40, 2, 34, '#5a5f66');
    P.add(<circle cx={x + w / 2 - 19} cy={top - 41} r={2} className="beacon" />, 'fx');
  }
}

// ---------------------------------------------------------------- Kneipe

function pub(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const floors = [0, 2, 2, 3, 3, 3][L] ?? 2;
  const w = [0, 92, 98, 104, 108, 110][L] ?? 92;
  const wall = L >= 3 ? '#f0e2c6' : wallColor(p, 1);
  const { top, left } = block(P, p, x, w, floors, {
    wall,
    floorH: 26,
    groundH: 40,
    cols: 3,
    winW: 16,
    winH: 16,
    plainGround: true,
    lit: 0.75,
  });
  // Fachwerk ab Stufe 3
  if (L >= 3) {
    const beam = '#6b4226';
    P.rect(left, top, 3, GROUND - 40 - top, beam);
    P.rect(left + w - 3, top, 3, GROUND - 40 - top, beam);
    for (let f = 0; f < floors - 1; f++) {
      const y = top + f * 26;
      P.line(left + 2, y + 24, left + 22, y + 2, beam, 2.5);
      P.line(left + w - 2, y + 24, left + w - 22, y + 2, beam, 2.5);
    }
  }
  // Gaststube mit großen Fenstern
  P.rect(left, GROUND - 40, w, 40, '#5a3b24');
  P.glass(left + 6, GROUND - 34, w / 2 - 20, 22, true, '#3b2a20');
  P.glass(x + 14, GROUND - 34, w / 2 - 20, 22, true, '#3b2a20');
  P.door(x, 20, 30, '#7a4a26', true);
  if (L >= 2) P.awning(left + 2, GROUND - 44, w - 4, '#2e6b3f');
  P.sign(x, GROUND - 60, b.label, '#2e6b3f', '#fff', Math.min(w - 16, 80));
  // Hängeschild
  P.rect(left + w - 4, GROUND - 76, 12, 2, '#3b2a20');
  P.circle(left + w + 4, GROUND - 67, 6, '#d9b54a', { stroke: '#8a6d1f', sw: 1.2 });
  // Brauhaus: Kupferkessel im Fenster
  if (L >= 4) {
    P.circle(left + 18, GROUND - 22, 7, '#c07a3e');
    P.circle(x + w / 2 - 18, GROUND - 22, 7, '#c07a3e');
  }
  if (L >= 5) {
    P.festoon(left - 4, left + w + 4, GROUND - 48, 5);
    P.flag(left + 10, top - 34, '#c0392b', 30);
    P.flag(left + w - 26, top - 34, '#f2c14e', 30);
    P.neon(x, top - 52, 'PROST', '#ffd34d', 50);
  }
}

// ---------------------------------------------------------------- Markt

function stall(P: Painter, sx: number, color: string, goods: string[]) {
  P.rect(sx - 22, GROUND - 26, 44, 26, '#8b6b4a');
  P.rect(sx - 22, GROUND - 26, 44, 4, '#6b4a32');
  goods.forEach((g, i) => {
    P.circle(sx - 15 + i * 7.5, GROUND - 28, 3.5, g);
  });
  P.rect(sx - 22, GROUND - 48, 2, 22, '#6b4a32');
  P.rect(sx + 20, GROUND - 48, 2, 22, '#6b4a32');
  P.awning(sx - 24, GROUND - 52, 48, color);
  P.add(
    <rect x={sx - 20} y={GROUND - 42} width={40} height={14} fill="url(#lightCone)" />,
    'lights',
  );
}

function market(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const fruit = ['#e67e22', '#c0392b', '#2e7d4f', '#f2c14e', '#8e44ad'];
  if (L <= 2) {
    const stalls = L === 1 ? [x] : [x - 54, x, x + 54];
    stalls.forEach((sx, i) => {
      stall(P, sx, ['#c0392b', '#2e7d4f', '#1f5fa8'][i] ?? '#c0392b', fruit.slice(i, i + 4));
    });
    P.rect(x - 2, GROUND - 90, 4, 38, p.trim);
    P.sign(x, GROUND - 102, b.label, p.accent);
    if (L === 2) P.festoon(x - 76, x + 76, GROUND - 60, 4);
    return;
  }
  if (L === 3) {
    // Markthalle aus Eisen und Glas
    const w = 156;
    const left = x - w / 2;
    P.wall(left, GROUND - 58, w, 58, wallColor(p, 3), 5);
    P.path(
      `M${left - 4} ${GROUND - 56} Q${x} ${GROUND - 112} ${left + w + 4} ${GROUND - 56} Z`,
      'url(#glass)',
    );
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const xx = left + w * t;
      P.line(
        xx,
        GROUND - 56,
        x + (xx - x) * 0.3,
        GROUND - 100 + Math.abs(t - 0.5) * 36,
        '#4a4f57',
        1,
      );
    }
    P.path(
      `M${left - 4} ${GROUND - 56} Q${x} ${GROUND - 112} ${left + w + 4} ${GROUND - 56}`,
      'none',
      {
        stroke: '#4a4f57',
        sw: 2,
      },
    );
    P.add(
      <path
        d={`M${left} ${GROUND - 56} Q${x} ${GROUND - 108} ${left + w} ${GROUND - 56} Z`}
        fill="url(#windowGlow)"
        opacity={0.55}
      />,
      'lights',
    );
    for (const ax of [left + 26, x, left + w - 26]) {
      P.path(
        `M${ax - 16} ${GROUND} V${GROUND - 34} A16 16 0 0 1 ${ax + 16} ${GROUND - 34} V${GROUND} Z`,
        '#3b2e24',
      );
      P.glass(ax - 12, GROUND - 40, 24, 16, true);
      fruit.slice(0, 3).forEach((g, i) => {
        P.circle(ax - 8 + i * 8, GROUND - 6, 3.5, g);
      });
    }
    P.sign(x, GROUND - 70, b.label, p.accent, '#fff', 90);
    return;
  }
  // Kaufhaus (4) und Einkaufspassage (5)
  const floors = L >= 5 ? 5 : 4;
  const w = 160;
  const { top, left } = block(P, p, x, w, floors, {
    wall: wallColor(p, 2),
    floorH: 24,
    groundH: 38,
    cols: 6,
    winW: 16,
    winH: 14,
    plainGround: true,
    lit: 0.8,
  });
  P.glass(left + 6, GROUND - 32, w / 2 - 22, 28, true);
  P.glass(x + 16, GROUND - 32, w / 2 - 22, 28, true);
  P.door(x, 24, 32, '#3b4a55');
  P.awning(left + 4, GROUND - 42, w - 8, '#c0392b');
  P.sign(x, top + 4, L >= 5 ? 'PASSAGE' : 'KAUFHAUS', '#1c1f24', '#ffd34d', 70);
  if (L >= 5) {
    P.dome(x, top, 30, { ...p, domeShape: 'glass' });
    P.festoon(left - 6, x - 30, top + 30, 6);
    P.festoon(x + 30, left + w + 6, top + 30, 6);
    P.neon(x, top - 54, b.label.toUpperCase(), '#ff6fb1', 84);
  }
}

// ---------------------------------------------------------------- Parteibüro

function partyOffice(P: Painter, b: BuildingProps, L: number) {
  const { x, p, partyColor } = b;
  const floors = [0, 1, 2, 3, 4, 6][L] ?? 1;
  const w = [0, 92, 104, 112, 120, 124][L] ?? 92;
  const left = x - w / 2;
  const floorH = 22;
  const groundH = 44;
  const top = GROUND - groundH - (floors - 1) * floorH;
  P.wall(left, top, w, GROUND - top, wallColor(p, 0), 5);
  for (let f = 1; f < floors; f++) {
    const y = top + (f - 1) * floorH;
    P.cornice(left, y + floorH - 2, w, p.trim, 2);
    P.windows(left + 10, y + 4, Math.floor((w - 16) / 24), 1, 14, 13, 10, 0, { lit: 0.85 });
  }
  if (floors > 1) P.roof(left, w, top, p);
  else P.cornice(left, top, w, p.trim, 5);
  // Ladenlokal in Parteifarbe
  P.rect(left + 3, GROUND - groundH + 4, w - 6, groundH - 4, partyColor);
  P.rect(left + 3, GROUND - groundH + 4, w - 6, groundH - 4, 'url(#facadeShade)');
  P.glass(left + 10, GROUND - 36, w / 2 - 22, 28, true);
  P.glass(x + 12, GROUND - 36, w / 2 - 22, 28, true);
  P.door(x, 18, 36, '#3a2e24');
  // Plakat im Fenster
  P.rect(left + 14, GROUND - 32, 12, 16, '#f4efe2');
  P.circle(left + 20, GROUND - 26, 3.5, partyColor);
  P.sign(x, GROUND - groundH - 12, b.label, partyColor, '#fff', Math.min(w - 12, 86));
  // Transparent über dem Obergeschoss
  if (L >= 2) {
    P.rect(left + 6, top + 4, w - 12, 10, partyColor);
    P.text(x, top + 12, b.autocratic ? '★ ★ ★' : '• • •', '#fff', { size: 6.5, glow: true });
  }
  if (L >= 3) {
    P.rect(x - 22, top + floorH + 14, 44, 3, p.trim);
    for (let bx = x - 20; bx <= x + 20; bx += 5) P.rect(bx, top + floorH + 5, 1.2, 9, p.trim);
    P.flag(x + 18, top + floorH - 18, partyColor, 26);
  }
  if (L >= 4) {
    // Großes Logo und Laufschrift
    P.circle(x, top + 38, 12, '#f4efe2', { stroke: partyColor, sw: 4 });
    P.circle(x, top + 38, 5, partyColor);
    P.rect(left + 4, GROUND - groundH - 2, w - 8, 5, '#1c1f24');
    P.add(
      <rect
        x={left + 6}
        y={GROUND - groundH - 1}
        width={w - 12}
        height={3}
        fill={partyColor}
        className="ticker"
      />,
      'lights',
    );
  }
  if (L >= 5) {
    P.flag(left + 10, top - 44, partyColor, 34);
    P.flag(left + w - 26, top - 44, partyColor, 34);
    for (const sx of [left + 8, left + w - 8]) {
      P.add(
        <path
          d={`M${sx} ${top} L${sx - 20} ${top - 110} L${sx + 6} ${top - 110} Z`}
          fill="url(#lightCone)"
          className="sweep"
        />,
        'lights',
      );
    }
  }
  if (b.autocratic) P.rect(left, top - 2, w, 6, '#8b1e1e');
}

// ---------------------------------------------------------------- Rathaus

function townHall(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const w = [0, 140, 168, 180, 188, 190][L] ?? 140;
  const floors = [0, 2, 2, 3, 3, 3][L] ?? 2;
  // Turm hinter dem Hauptbau
  if (L >= 2) {
    const towerTop = [0, 0, 70, 58, 46, 26][L] ?? 70;
    const tw = L >= 5 ? 40 : 34;
    P.wall(x - tw / 2, towerTop, tw, 150 - towerTop, wallColor(p, 4), 4);
    P.roof(x - tw / 2, tw, towerTop, p, 22);
    P.circle(x, towerTop + 24, 11, L >= 5 ? '#f6e7b0' : '#f4efe2', {
      stroke: L >= 5 ? '#d9b54a' : p.trim,
      sw: 2.5,
    });
    P.add(
      <circle cx={x} cy={towerTop + 24} r={9} fill="url(#windowGlow)" opacity={0.8} />,
      'lights',
    );
    P.line(x, towerTop + 24, x, towerTop + 17, '#2b2f36', 1.6);
    P.line(x, towerTop + 24, x + 5, towerTop + 26, '#2b2f36', 1.6);
    P.win(x - 5, towerTop + 44, 10, 16, { arched: true, lit: 1 });
    if (L >= 5) P.flag(x, towerTop - 62, p.accent, 36);
  }
  // Seitenpavillons
  if (L >= 4) {
    for (const px of [x - w / 2 + 18, x + w / 2 - 18]) {
      block(P, p, px, 36, floors + 1, {
        wall: wallColor(p, 4),
        floorH: 24,
        groundH: 30,
        cols: 1,
        winW: 12,
        winH: 16,
        arched: true,
        lit: 0.8,
      });
    }
  }
  const mainW = L >= 4 ? w - 72 : w;
  const main = block(P, p, x, mainW, floors, {
    wall: wallColor(p, 4),
    floorH: 26,
    groundH: 34,
    arched: true,
    winW: 13,
    winH: 17,
    plainGround: L >= 3,
    lit: 0.75,
  });
  // Arkaden
  if (L >= 3) {
    const count = Math.floor(mainW / 24);
    for (let i = 0; i < count; i++) {
      const ax = x - mainW / 2 + 12 + (i * (mainW - 24)) / Math.max(1, count - 1);
      P.path(
        `M${ax - 8} ${GROUND} V${GROUND - 20} A8 8 0 0 1 ${ax + 8} ${GROUND - 20} V${GROUND} Z`,
        '#3b2e24',
        {
          opacity: 0.85,
        },
      );
      P.add(
        <path
          d={`M${ax - 7} ${GROUND} V${GROUND - 20} A7 7 0 0 1 ${ax + 7} ${GROUND - 20} V${GROUND} Z`}
          fill="url(#windowGlow)"
          opacity={0.5}
        />,
        'lights',
      );
    }
  } else {
    P.door(x, 30, 34, '#4a3a2e', true);
  }
  P.sign(x, main.top - 30, b.label, p.accent, '#fff', 86);
  if (L >= 4) {
    for (const sx of [x - 40, x + 40]) {
      P.rect(sx - 4, main.top - 22, 8, 4, p.stone);
      P.rect(sx - 2, main.top - 36, 4, 14, p.stone);
      P.circle(sx, main.top - 39, 3, p.stone);
    }
  }
  if (L >= 5) P.festoon(x - w / 2, x + w / 2, main.top + 8, 6);
  if (b.grandeur >= 1) P.rect(x - w / 2, GROUND - 4, w, 4, p.stone);
}

// ---------------------------------------------------------------- Zeitung

function newspaper(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const floors = [0, 1, 2, 4, 5, 7][L] ?? 1;
  const w = [0, 112, 122, 132, 138, 142][L] ?? 112;
  const { top, left } = block(P, p, x, w, floors, {
    wall: L >= 5 ? '#d8dde2' : wallColor(p, 2),
    floorH: 22,
    groundH: 46,
    winW: 14,
    winH: 13,
    plainGround: true,
    roof: floors > 1,
    lit: 0.8,
  });
  if (floors === 1) P.cornice(left, top, w, p.trim, 5);
  // Druckhalle im Erdgeschoss
  P.glass(left + 6, GROUND - 32, w - 44, 26, true);
  if (L >= 4) {
    // Papierrollen sichtbar
    for (let i = 0; i < 3; i++) {
      P.circle(left + 20 + i * 18, GROUND - 16, 7, '#efe9dc', { stroke: '#8a8f96', sw: 1 });
    }
  }
  P.door(left + w - 20, 18, 30, '#2b2f36');
  P.rect(left, GROUND - 46, w, 12, '#1c1f24');
  P.text(x, GROUND - 37, L >= 2 ? 'TAGESBOTE' : 'DRUCKEREI', '#f4efe2', {
    size: 8,
    family: 'serif',
    glow: true,
  });
  P.sign(x, top - (floors > 1 ? 30 : 16), b.label, '#2b2f36', '#fff', Math.min(w - 20, 90));
  if (L >= 3) P.neon(x, top - 52, 'NEWS', '#ff6b4a', 44);
  if (L >= 5) {
    // Großbildschirm
    P.rect(left + 12, top + 10, w - 24, 34, '#111');
    P.add(
      <rect
        x={left + 14}
        y={top + 12}
        width={w - 28}
        height={30}
        fill="#3fa9f5"
        opacity={0.85}
        className="screenFlicker"
      />,
      'lights',
    );
    P.rect(x - 1, top - 84, 2, 30, '#5a5f66');
    P.add(<circle cx={x} cy={top - 85} r={2} className="beacon" />, 'fx');
  }
}

// ---------------------------------------------------------------- Bank

function bank(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const gold = '#d9b54a';
  if (L >= 4) {
    // Bankturm dahinter
    const tw = 70;
    const tTop = L >= 5 ? 44 : 64;
    P.wall(x - tw / 2 + 24, tTop, tw, GROUND - tTop, '#c7d0d6', 6);
    for (let y = tTop + 8; y < GROUND - 90; y += 14)
      P.glass(x - tw / 2 + 30, y, tw - 12, 9, true, '#7e8a93');
    if (L >= 5) P.neon(x + 24, tTop - 18, '€ $ ¥', gold, 50);
  }
  const w = [0, 118, 140, 156, 160, 164][L] ?? 118;
  const h = [0, 70, 90, 104, 104, 110][L] ?? 70;
  const left = x - w / 2;
  const top = GROUND - h;
  P.wall(left, top, w, h, p.stone, 5);
  if (L === 1) {
    P.windows(left + 12, top + 12, 4, 1, 16, 18, 12, 0, { lit: 0.7 });
    P.cornice(left, top, w, p.trim, 4);
  } else {
    P.portico(x, w - 30, top + 8, L >= 3 ? 6 : 4, p);
  }
  P.door(x, 22, 38, '#2b2f36', true);
  P.sign(x, top - (L === 1 ? 16 : 34), b.label, p.accent, '#fff', 80);
  if (L >= 3) P.rect(left - 4, top - 6, w + 8, 6, p.stone);
  if (L >= 5) {
    P.dome(x, top - 24, 26, p, true);
    // Kurstafeln
    P.rect(left + 6, GROUND - 60, 28, 16, '#111');
    P.add(
      <rect
        x={left + 8}
        y={GROUND - 58}
        width={24}
        height={12}
        fill="#39d98a"
        opacity={0.9}
        className="screenFlicker"
      />,
      'lights',
    );
    P.rect(left + w - 34, GROUND - 60, 28, 16, '#111');
    P.add(
      <rect
        x={left + w - 32}
        y={GROUND - 58}
        width={24}
        height={12}
        fill="#ff5a4f"
        opacity={0.9}
        className="screenFlicker"
      />,
      'lights',
    );
  }
  if (b.grandeur >= 2 || L >= 4) P.rect(x - 16, GROUND - 42, 32, 3, gold);
}

// ---------------------------------------------------------------- Parlament

function parliament(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const w = [0, 200, 220, 240, 256, 262][L] ?? 200;
  const left = x - w / 2;
  if (L >= 4) {
    for (const wx of [left + 34, left + w - 34]) {
      block(P, p, wx, 68, 4, {
        wall: wallColor(p, 2),
        floorH: 22,
        groundH: 30,
        cols: 3,
        winW: 11,
        winH: 14,
        lit: 0.7,
      });
      if (L >= 5) P.flag(wx, 110 - 44, p.accent, 30);
    }
  }
  const mainW = L >= 4 ? w - 136 : w;
  const main = block(P, p, x, mainW, 3, {
    wall: wallColor(p, 2),
    floorH: 26,
    groundH: 36,
    winW: 12,
    winH: 17,
    arched: true,
    roof: false,
    lit: 0.7,
  });
  P.cornice(x - mainW / 2, main.top - 4, mainW, p.stone, 5);
  if (L >= 3) {
    const domeStyle =
      L >= 5 && p.domeShape === 'classic' ? { ...p, domeShape: 'glass' as const } : p;
    P.dome(x, main.top - 4, L >= 5 ? 46 : 36, domeStyle, L >= 5);
  }
  if (L >= 2) P.portico(x, Math.min(mainW - 30, 120), main.top + 14, 6, p);
  else P.door(x, 30, 40, '#3b2e24', true);
  P.rect(x - 70, GROUND - 6, 140, 6, p.stone);
  P.sign(x, GROUND - 20, b.label, p.accent, '#fff', 84);
  if (L >= 5) P.festoon(x - mainW / 2, x + mainW / 2, main.top + 6, 5);
}

// ---------------------------------------------------------------- Ministerium

function ministry(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const floors = [0, 3, 4, 5, 6, 8][L] ?? 3;
  const w = [0, 160, 176, 190, 198, 204][L] ?? 160;
  const { top } = block(P, p, x, w, floors, {
    wall: wallColor(p, 1),
    floorH: 20,
    groundH: 34,
    winW: 13,
    winH: 13,
    plainGround: true,
    lit: 0.55,
  });
  P.rect(x - w / 2, GROUND - 34, w, 34, p.stone);
  P.rect(x - w / 2, GROUND - 34, w, 34, 'url(#facadeShade)');
  for (let ax = x - w / 2 + 16; ax < x + w / 2 - 10; ax += 22) {
    if (Math.abs(ax - x) < 30) continue;
    P.win(ax - 6, GROUND - 28, 12, 20, { arched: true, lit: 0.5 });
  }
  P.rect(x - 26, GROUND - 42, 52, 42, p.stone);
  P.door(x, 30, 34, '#2b2f36', true);
  P.sign(x, GROUND - 56, b.label, p.accent, '#fff', 84);
  if (L >= 3) P.flag(x, top - 40, p.accent, 30);
  if (L >= 5) {
    P.rect(x + w / 2 - 30, top - 36, 2, 26, '#5a5f66');
    P.add(<circle cx={x + w / 2 - 29} cy={top - 37} r={2} className="beacon" />, 'fx');
  }
}

// ---------------------------------------------------------------- Botschaft

function embassy(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const floors = [0, 2, 2, 3, 3, 3][L] ?? 2;
  const w = [0, 112, 118, 132, 136, 150][L] ?? 112;
  const flagColors = ['#1f3a5f', '#12848a', '#2e7d4f', '#9e1b1b', '#c9a227', '#6a3d9a'];
  const flags = [0, 0, 2, 4, 4, 6][L] ?? 0;
  for (let i = 0; i < flags; i++) {
    const fx = x - 70 + (140 / Math.max(1, flags - 1)) * i;
    P.flag(fx, GROUND - 118, flagColors[i] ?? '#999', 118);
  }
  const { top } = block(P, p, x, w, floors, {
    wall: wallColor(p, 2),
    floorH: 28,
    groundH: 36,
    winW: 15,
    winH: 20,
    arched: true,
    lit: 0.7,
  });
  P.door(x, 24, 36, '#2b2f36', true);
  P.sign(x, top - 32, b.label, p.accent, '#fff', 96);
  if (L >= 4) {
    // Gartenmauer mit Tor
    P.rect(x - 76, GROUND - 14, 50, 14, p.stone);
    P.rect(x + 26, GROUND - 14, 50, 14, p.stone);
    for (const gx of [x - 26, x + 26]) P.rect(gx - 3, GROUND - 22, 6, 22, p.stone);
  }
  if (L >= 5) P.festoon(x - w / 2, x + w / 2, top + 4, 5);
}

// ---------------------------------------------------------------- Regierungssitz

function palace(P: Painter, b: BuildingProps, L: number) {
  const { x, p } = b;
  const w = [0, 220, 260, 290, 320, 340][L] ?? 220;
  const floors = [0, 2, 3, 3, 3, 3][L] ?? 2;
  const gilded = L >= 5 || b.grandeur >= 3;
  if (L >= 4) {
    for (const tx of [x - w / 2 + 22, x + w / 2 - 22]) {
      block(P, p, tx, 44, floors + 2, {
        wall: wallColor(p, 2),
        floorH: 24,
        groundH: 30,
        cols: 1,
        winW: 14,
        winH: 16,
        arched: true,
        lit: 0.8,
      });
      P.dome(tx, GROUND - 30 - (floors + 1) * 24 - 6, 16, p, gilded);
    }
  }
  const mainW = L >= 4 ? w - 88 : w;
  const main = block(P, p, x, mainW, floors, {
    wall: wallColor(p, 2),
    floorH: 28,
    groundH: 36,
    winW: 14,
    winH: 19,
    arched: true,
    roof: false,
    lit: 0.8,
  });
  P.cornice(x - mainW / 2, main.top - 5, mainW, p.stone, 6);
  if (L >= 3) {
    const r = L >= 5 ? 50 : 40;
    P.wall(x - 50, main.top - 50, 100, 46, wallColor(p, 2), 4);
    P.windows(x - 40, main.top - 40, 4, 1, 12, 18, 12, 0, { arched: true, lit: 1 });
    P.dome(x, main.top - 50, r, p, gilded);
    P.flag(x, main.top - 50 - r * 1.2 - 44, p.accent, 36);
  }
  if (L >= 2) P.portico(x, 104, main.top + 16, 6, p);
  else P.door(x, 34, 44, '#5a3b24', true);
  P.sign(x, GROUND - 26, b.label, p.accent, '#fff', 96);
  if (b.autocratic) {
    for (const bx of [x - mainW / 2 + 16, x + mainW / 2 - 56])
      P.rect(bx, main.top + 8, 40, 64, '#8b1e1e');
  }
  if (L >= 5) {
    P.festoon(x - mainW / 2, x - 52, main.top + 10, 6);
    P.festoon(x + 52, x + mainW / 2, main.top + 10, 6);
  }
}

// ---------------------------------------------------------------- Einstieg

const HALF: Record<LocationId, number> = {
  workplace: 92,
  pub: 60,
  market: 82,
  partyOffice: 62,
  townHall: 96,
  newspaper: 72,
  bank: 82,
  parliament: 132,
  ministry: 102,
  embassy: 78,
  palace: 172,
};

/** Zeichnet ein Gebäude in einen Painter (für die Straße mit Licht-Ebene). */
export function paintLocation(P: Painter, id: LocationId, props: BuildingProps): void {
  const L = Math.max(1, Math.min(5, props.level ?? 1));
  P.shadow(props.x, HALF[id] * 2 * (0.6 + L * 0.08));
  switch (id) {
    case 'workplace':
      if (props.office) office(P, props, L);
      else factory(P, props, L);
      return;
    case 'pub':
      pub(P, props, L);
      return;
    case 'market':
      market(P, props, L);
      return;
    case 'partyOffice':
      partyOffice(P, props, L);
      return;
    case 'townHall':
      townHall(P, props, L);
      return;
    case 'newspaper':
      newspaper(P, props, L);
      return;
    case 'bank':
      bank(P, props, L);
      return;
    case 'parliament':
      parliament(P, props, L);
      return;
    case 'ministry':
      ministry(P, props, L);
      return;
    case 'embassy':
      embassy(P, props, L);
      return;
    case 'palace':
      palace(P, props, L);
      return;
  }
}

/** Füllhaus zwischen den Orten; `seed` variiert Höhe, Farbe und Details. */
export function paintFiller(
  P: Painter,
  o: {
    x: number;
    width: number;
    p: ArchPalette;
    seed: number;
    grandeur: number;
    poster: ReactNode;
    stage: number;
  },
): void {
  const { x, width, p, seed, grandeur } = o;
  const s = Math.round(seed * 10);
  const floors = 2 + (s % 3) + grandeur + (o.stage >= 9 ? 1 : 0);
  const floorH = 22;
  const groundH = 28;
  const top = GROUND - groundH - (floors - 1) * floorH;
  const left = x - width / 2;
  const wall = wallColor(p, s);
  P.wall(left, top, width, GROUND - top, wall, 4);
  if (grandeur === 0 && s % 2 === 0) P.bricks(left, top, width, GROUND - top);
  const cols = Math.max(1, Math.floor((width - 10) / 22));
  const gap = (width - cols * 12) / (cols + 1);
  for (let f = 1; f < floors; f++) {
    const y = top + (f - 1) * floorH;
    if (grandeur >= 1) P.cornice(left, y + floorH - 2, width, p.trim, 1.5);
    for (let c = 0; c < cols; c++) {
      const wx = left + gap + c * (12 + gap);
      P.win(wx, y + 4, 12, 14, { arched: grandeur >= 1 && s % 2 === 0, lit: 0.55 });
      // Blumenkästen in den schöneren Vierteln
      if (grandeur >= 1 && (c + f) % 2 === 0) P.rect(wx - 1, y + 19, 14, 2.5, '#c0392b');
    }
  }
  // Erdgeschoss: Laden oder Haustür
  const shop = s % 3 !== 0;
  if (shop && width > 44) {
    P.glass(left + 5, GROUND - 22, width - 26, 18, true);
    P.awning(
      left + 4,
      GROUND - 26,
      width - 24,
      ['#c0392b', '#2e6b8a', '#2e7d4f', '#b7791f'][s % 4] ?? '#c0392b',
    );
    P.door(left + width - 10, 10, 20, '#4a3a2e');
  } else {
    P.door(x, 14, 22, '#4a3a2e');
  }
  P.roof(left, width, top, p, 16);
  if (grandeur === 0 && s % 4 === 0) {
    // Antennen im Arbeiterviertel
    P.line(left + 10, top - 8, left + 10, top - 22, '#5a5f66', 1);
    P.line(left + 5, top - 18, left + 15, top - 18, '#5a5f66', 1);
  }
  if (o.poster) P.add(o.poster);
}
