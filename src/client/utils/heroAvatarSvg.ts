import { HERO_STYLES, type HeroStyle } from "../constants/heroAvatar.constants";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function darken(hex: string): string {
  try {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map((x) => x + x).join("");
    const r = Math.max(0, parseInt(c.substring(0, 2), 16) - 40);
    const g = Math.max(0, parseInt(c.substring(2, 4), 16) - 40);
    const b = Math.max(0, parseInt(c.substring(4, 6), 16) - 40);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

/** lv: 0–9 visual index, hero: 0–2 style index */
export function buildHeroAvatarSvg(
  lv: number,
  hero: number,
  size = 110,
): { inner: string; viewHeight: number } {
  const h: HeroStyle = HERO_STYLES[hero] ?? HERO_STYLES[0];
  const t = Math.min(1, Math.max(0, lv / 9));

  const chest = lerp(22, 17, t);
  const armW = lerp(10, 6, t);
  const legW = lerp(11, 7, t);
  const headR = lerp(18, 14, t);
  const bodyH = lerp(26, 30, t);
  const cx = 55;

  const headY = 22;
  const neckY = headY + headR + 1;
  const bodyTop = neckY + 5;
  const bodyBot = bodyTop + bodyH;
  const legTop = bodyBot;
  const legBot = legTop + 22;
  const footY = legBot + 4;

  const c1 = h.accent;
  const c2 = h.accent2;
  const bg = h.bg;
  const dark1 = darken(c1);
  const dark2 = darken(c2);

  let inner = "";

  inner += `<ellipse cx="${cx}" cy="${footY + 2}" rx="${legW * 1.8}" ry="3" fill="rgba(0,0,0,0.25)"/>`;

  const lgL = cx - legW - 1;
  const lgR = cx + 1;
  inner += `<rect x="${lgL}" y="${legTop}" width="${legW}" height="${legBot - legTop}" rx="${legW * 0.45}" fill="${c1}"/>`;
  inner += `<rect x="${lgR}" y="${legTop}" width="${legW}" height="${legBot - legTop}" rx="${legW * 0.45}" fill="${dark1}"/>`;
  inner += `<rect x="${lgL - 1}" y="${legBot - 5}" width="${legW + 2}" height="8" rx="4" fill="${dark2}"/>`;
  inner += `<rect x="${lgR - 1}" y="${legBot - 5}" width="${legW + 2}" height="8" rx="4" fill="${dark2}"/>`;

  const hip = lerp(21, 15, t);
  inner += `<path d="M${cx - chest} ${bodyTop} L${cx + chest} ${bodyTop} L${cx + hip} ${bodyBot} L${cx - hip} ${bodyBot} Z" fill="${c1}"/>`;

  if (t > 0.4) {
    const opacity = (t - 0.4) * 1.5;
    inner += `<path d="M${cx - chest * 0.8} ${bodyTop + 5} Q${cx} ${bodyTop + 8} ${cx + chest * 0.8} ${bodyTop + 5}" stroke="${dark1}" stroke-width="1.5" fill="none" opacity="${opacity}"/>`;
    inner += `<line x1="${cx}" y1="${bodyTop + 4}" x2="${cx}" y2="${bodyTop + bodyH * 0.6}" stroke="${dark1}" stroke-width="1" opacity="${opacity}"/>`;
  }

  if (hero === 0) {
    inner += `<circle cx="${cx}" cy="${bodyTop + 9}" r="5" fill="${c2}" opacity="0.9"/>`;
    inner += `<circle cx="${cx}" cy="${bodyTop + 9}" r="3" fill="${bg}" opacity="0.7"/>`;
  } else if (hero === 1) {
    inner += `<path d="M${cx - 6} ${bodyTop + 7} Q${cx - 3} ${bodyTop + 4} ${cx} ${bodyTop + 7} Q${cx + 3} ${bodyTop + 4} ${cx + 6} ${bodyTop + 7} L${cx + 4} ${bodyTop + 12} L${cx} ${bodyTop + 10} L${cx - 4} ${bodyTop + 12} Z" fill="${c2}" opacity="0.85"/>`;
  } else {
    inner += `<circle cx="${cx}" cy="${bodyTop + 8}" r="5" fill="none" stroke="${c2}" stroke-width="1.2" opacity="0.9"/>`;
    inner += `<path d="M${cx - 5} ${bodyTop + 8} L${cx + 5} ${bodyTop + 8} M${cx} ${bodyTop + 3} L${cx} ${bodyTop + 13} M${cx - 4} ${bodyTop + 5} L${cx + 4} ${bodyTop + 11} M${cx + 4} ${bodyTop + 5} L${cx - 4} ${bodyTop + 11}" stroke="${c2}" stroke-width="0.8" opacity="0.7"/>`;
  }

  inner += `<rect x="${cx - hip}" y="${bodyBot - 5}" width="${hip * 2}" height="5" rx="2" fill="${dark2}"/>`;

  const armTopY = bodyTop + 3;
  const armBotY = bodyTop + bodyH * 0.75;
  inner += `<path d="M${cx - chest + 2} ${armTopY} L${cx - chest - armW + 2} ${armBotY} Q${cx - chest - armW} ${armBotY + 4} ${cx - chest - armW + 4} ${armBotY + 6} L${cx - chest + 5} ${armBotY + 2} Z" fill="${c1}"/>`;
  inner += `<path d="M${cx + chest - 2} ${armTopY} L${cx + chest + armW - 2} ${armBotY} Q${cx + chest + armW} ${armBotY + 4} ${cx + chest + armW - 4} ${armBotY + 6} L${cx + chest - 5} ${armBotY + 2} Z" fill="${dark1}"/>`;
  inner += `<ellipse cx="${cx - chest - armW + 5}" cy="${armBotY + 7}" rx="${armW * 0.8}" ry="${armW * 0.6}" fill="${dark2}"/>`;
  inner += `<ellipse cx="${cx + chest + armW - 5}" cy="${armBotY + 7}" rx="${armW * 0.8}" ry="${armW * 0.6}" fill="${dark2}"/>`;

  inner += `<rect x="${cx - 5}" y="${neckY}" width="10" height="6" rx="3" fill="${darken(c1)}"/>`;
  inner += `<ellipse cx="${cx}" cy="${headY}" rx="${headR}" ry="${headR}" fill="${c1}"/>`;

  if (hero === 0) {
    inner += `<ellipse cx="${cx - 6}" cy="${headY - 1}" rx="4" ry="3" fill="${c2}"/>`;
    inner += `<ellipse cx="${cx + 6}" cy="${headY - 1}" rx="4" ry="3" fill="${c2}"/>`;
    inner += `<ellipse cx="${cx - 6}" cy="${headY - 1}" rx="2.5" ry="1.8" fill="#fff8e0" opacity="0.9"/>`;
    inner += `<ellipse cx="${cx + 6}" cy="${headY - 1}" rx="2.5" ry="1.8" fill="#fff8e0" opacity="0.9"/>`;
    inner += `<path d="M${cx - 10} ${headY + 4} L${cx + 10} ${headY + 4}" stroke="${dark1}" stroke-width="1.5" stroke-linecap="round"/>`;
  } else if (hero === 1) {
    inner += `<path d="M${cx - headR + 2} ${headY - headR + 4} L${cx - headR + 4} ${headY - headR - 4} L${cx - headR + 8} ${headY - headR + 2} Z" fill="${dark1}"/>`;
    inner += `<path d="M${cx + headR - 2} ${headY - headR + 4} L${cx + headR - 4} ${headY - headR - 4} L${cx + headR - 8} ${headY - headR + 2} Z" fill="${dark1}"/>`;
    inner += `<ellipse cx="${cx - 5}" cy="${headY - 1}" rx="4" ry="2.5" fill="white" opacity="0.85"/>`;
    inner += `<ellipse cx="${cx + 5}" cy="${headY - 1}" rx="4" ry="2.5" fill="white" opacity="0.85"/>`;
    inner += `<path d="M${cx - 8} ${headY + 5} L${cx + 8} ${headY + 5}" stroke="${dark2}" stroke-width="1" stroke-linecap="round"/>`;
  } else {
    inner += `<ellipse cx="${cx - 6}" cy="${headY - 1}" rx="5" ry="3.5" fill="white" opacity="0.9"/>`;
    inner += `<ellipse cx="${cx + 6}" cy="${headY - 1}" rx="5" ry="3.5" fill="white" opacity="0.9"/>`;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI;
      inner += `<line x1="${cx - 6 + Math.cos(angle) * 5}" y1="${headY - 1 + Math.sin(angle) * 3.5}" x2="${cx - 6 - Math.cos(angle) * 5}" y2="${headY - 1 - Math.sin(angle) * 3.5}" stroke="${c1}" stroke-width="0.6" opacity="0.4"/>`;
    }
  }

  if (t > 0.7) {
    const op = (t - 0.7) * 2;
    inner += `<circle cx="${cx}" cy="${headY}" r="${headR + 5}" fill="none" stroke="${c2}" stroke-width="1.5" opacity="${op * 0.5}"/>`;
  }

  if (t < 0.2) {
    inner += `<ellipse cx="${cx + headR - 2}" cy="${headY - headR + 4}" rx="2.5" ry="3.5" fill="#5bc8e8" opacity="0.7"/>`;
  }

  void size;
  return { inner, viewHeight: footY + 8 };
}

export function toHeroVisualLevel(gameLevel: number): number {
  return Math.min(9, Math.max(0, gameLevel - 1));
}
