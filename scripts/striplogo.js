// One-off: remove the near-uniform background (white OR black) from a logo PNG,
// outputting a transparent-background version. Usage: node scripts/striplogo.js in.png out.png
const sharp = require('sharp');

const [, , inPath = 'public/KANDOlogo.png', outPath = 'public/kando-mark.png'] = process.argv;

(async () => {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Sample the corners to decide whether the background is light or dark.
  const corner = (x, y) => {
    const i = (y * width + x) * channels;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };
  const avgCorner = (corner(2, 2) + corner(width - 3, 2) + corner(2, height - 3) + corner(width - 3, height - 3)) / 4;
  const lightBg = avgCorner > 128;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let bgMatch; // 0 = fully background, 1 = fully foreground
    if (lightBg) {
      const m = Math.min(r, g, b); // near-white => high
      bgMatch = (m - 232) / 18; // 232..250 feather
    } else {
      const m = Math.max(r, g, b); // near-black => low
      bgMatch = (m - 22) / 24; // 22..46 feather
    }
    const fg = Math.max(0, Math.min(1, lightBg ? 1 - bgMatch : bgMatch));
    data[i + 3] = Math.round(data[i + 3] * fg);
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log(`wrote ${outPath} (${width}x${height}, ${lightBg ? 'light' : 'dark'} bg removed)`);
})();
