"use strict";
const gifenc = require("./vendor/gifenc");
const { WINDOW_H, WINDOW_LOOP_MS, WINDOW_W, paintWindow } = require("./scene");

const GIF_FRAMES = 48;

async function renderWindowGif(age, createCanvas, frameCount = GIF_FRAMES) {
  let ctx = createCanvas(WINDOW_W, WINDOW_H).getContext("2d"),
    encoder = (0, gifenc.GIFEncoder)(),
    frameDelay = Math.round(WINDOW_LOOP_MS / frameCount);
  for (let frame = 0; frame < frameCount; frame++) {
    paintWindow(ctx, age, frame / frameCount, WINDOW_W, WINDOW_H);
    let { data: pixels } = ctx.getImageData(0, 0, WINDOW_W, WINDOW_H),
      palette = (0, gifenc.quantize)(pixels, 256);
    (encoder.writeFrame((0, gifenc.applyPalette)(pixels, palette), WINDOW_W, WINDOW_H, {
      palette: palette,
      delay: frameDelay,
    }),
      frame % 5 === 4 && (await new Promise((resolve) => setTimeout(resolve, 0))));
  }
  return (encoder.finish(), encoder.bytes());
}

module.exports = { GIF_FRAMES, renderWindowGif };
