// Generate build/icon.png — a 512x512 aurora flower mark (pink sakura blossom
// glyph on dark). Pure Node, no deps.
const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const S = 512
const px = Buffer.alloc(S * S * 4)

const BLOOM = 96 // blur radius around the glyph
function glow(x, y) {
  // distance to a 5-petal flower silhouette via petals as circles
  const cx = 256
  const cy = 250
  let d = Math.hypot(x - cx, y - cy)
  let v = 0
  // 5 petals
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const px2 = cx + Math.cos(a) * 74
    const py2 = cy + Math.sin(a) * 74
    const r = Math.hypot(x - px2, y - py2)
    const petal = Math.max(0, 1 - r / 58)
    v = Math.max(v, petal * petal)
  }
  // center
  const center = Math.max(0, 1 - d / 46)
  v = Math.max(v, center * center)
  return v
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let acc = 0
    let n = 0
    for (let dy = -BLOOM; dy <= BLOOM; dy += 8) {
      for (let dx = -BLOOM; dx <= BLOOM; dx += 8) {
        const g = glow(x + dx, y + dy)
        acc += g
        n++
      }
    }
    const avg = acc / n
    const i = (y * S + x) * 4
    // dark bg + pink glow + bright core
    const bg = 10 / 255
    const pink = 1 - Math.exp(-avg * 6)
    const core = glow(x, y)
    const r = Math.min(1, bg + pink * 0.92 + core * 0.2)
    const g2 = Math.min(1, bg + pink * 0.48 + core * 0.12)
    const b = Math.min(1, bg + pink * 0.62 + core * 0.16)
    px[i] = Math.round(r * 255)
    px[i + 1] = Math.round(g2 * 255)
    px[i + 2] = Math.round(b * 255)
    px[i + 3] = 255
  }
}

// PNG encode
function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, "ascii")
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}
const idat = zlib.deflateSync(raw, { level: 9 })
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])

const out = path.join(__dirname, "..", "build", "icon.png")
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, png)
console.log("wrote", out, png.length, "bytes")