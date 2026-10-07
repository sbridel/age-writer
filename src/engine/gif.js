"use strict";
const gifenc = require("./vendor/gifenc");
const { WINDOW_H, WINDOW_LOOP_MS, WINDOW_W, paintWindow } = require("./scene");

const GIF_FRAMES = 48;

async function renderWindowGif(e, o, t = GIF_FRAMES) {
  let r = o(WINDOW_W, WINDOW_H).getContext("2d"),
    s = (0, gifenc.GIFEncoder)(),
    n = Math.round(WINDOW_LOOP_MS / t);
  for (let a = 0; a < t; a++) {
    paintWindow(r, e, a / t, WINDOW_W, WINDOW_H);
    let { data: c } = r.getImageData(0, 0, WINDOW_W, WINDOW_H),
      g = (0, gifenc.quantize)(c, 256);
    (s.writeFrame((0, gifenc.applyPalette)(c, g), WINDOW_W, WINDOW_H, { palette: g, delay: n }),
      a % 5 === 4 && (await new Promise((h) => setTimeout(h, 0))));
  }
  return (s.finish(), s.bytes());
}

module.exports = { GIF_FRAMES, renderWindowGif };
