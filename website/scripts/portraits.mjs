/**
 * Build web sized team portraits.
 *
 * Full resolution originals live in assets/team and are never served. This
 * writes square, head and shoulders crops into public/team at the sizes the
 * site actually uses, so a 4 MB phone photo does not land on a student's
 * mobile data.
 *
 * Crops are hand picked per photo, as fractions of the original, because
 * automatic cropping frames a full body shot as a full body shot and the face
 * ends up too small to recognise at 132px. To add someone: drop the original in
 * assets/team, run this once, look at the result, and add a CROPS entry if the
 * automatic framing is wrong.
 *
 * Run with: npm run portraits
 */
import sharp from "sharp";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = "assets/team";
const OUT_DIR = "public/team";
const SIZES = [{ suffix: "", width: 320 }, { suffix: "@2x", width: 640 }];

/** left and top are fractions of width and height; size is a fraction of width. */
const CROPS = {
  "abhiraaj-konduru": { left: 0.2, top: 0.153, size: 0.649 },
  "vikyatt-bommireddy": { left: 0.275, top: 0.079, size: 0.413 },
};

const slug = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

await mkdir(OUT_DIR, { recursive: true });

const files = (await readdir(SOURCE_DIR)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
if (!files.length) {
  console.log(`No source images in ${SOURCE_DIR}. Drop full size photos there and run again.`);
}

for (const file of files) {
  const name = slug(file);
  const source = sharp(path.join(SOURCE_DIR, file)).rotate();
  const meta = await source.metadata();
  const crop = CROPS[name];

  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `${name}${size.suffix}.webp`);
    let pipeline = sharp(path.join(SOURCE_DIR, file)).rotate();

    if (crop) {
      const side = Math.round(meta.width * crop.size);
      pipeline = pipeline.extract({
        left: Math.round(meta.width * crop.left),
        top: Math.round(meta.height * crop.top),
        width: Math.min(side, meta.width),
        height: Math.min(side, meta.height),
      });
    }

    await pipeline
      .resize({
        width: size.width,
        height: size.width,
        fit: "cover",
        position: crop ? "centre" : sharp.strategy.attention,
      })
      .webp({ quality: 82 })
      .toFile(out);
    console.log("wrote", out, crop ? "(hand cropped)" : "(auto cropped)");
  }
}
