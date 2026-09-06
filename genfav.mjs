import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
// pull the ring path from the wordmark component
const logo = readFileSync('/home/user/incensostudio/src/components/Logo.tsx','utf8')
const ring = logo.match(/d="(M970\.484[^"]+)"/)[1]
const SAND = '#e3ddc9'
// ring bbox center (1120.75,107.75); scale into 512 canvas, transparent bg
const svg = (scale) => {
  const tx = 256 - 1120.75*scale, ty = 256 - 107.75*scale
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale})"><path d="${ring}" fill="${SAND}"/></g></svg>`
}
const vec = svg(1.15)
writeFileSync('/home/user/incenso-website/favicon.svg', vec)
for (const [out,size] of [['favicon-32.png',32],['favicon-180.png',180],['apple-touch-icon.png',180],['favicon-512.png',512]]) {
  const buf = await sharp(Buffer.from(vec)).resize(size,size).png().toBuffer()
  writeFileSync('/home/user/incenso-website/'+out, buf)
}
console.log('favicons written, sand', SAND)
