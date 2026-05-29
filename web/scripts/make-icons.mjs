import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const OUT = 'public/icons'

function iconSvg({ rounded, scale }) {
  const r = rounded ? 96 : 0
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="${r}" ry="${r}" fill="#b8395a"/>
  <g transform="${t}">
    <path d="M256 96 C256 200 312 256 416 256 C312 256 256 312 256 416 C256 312 200 256 96 256 C200 256 256 200 256 96 Z" fill="#ffffff"/>
  </g>
</svg>`)
}

async function render(svg, size, file) {
  await sharp(svg).resize(size, size).png().toFile(`${OUT}/${file}`)
  console.log('wrote', `${OUT}/${file}`)
}

await mkdir(OUT, { recursive: true })
await render(iconSvg({ rounded: true,  scale: 0.78 }), 192, 'icon-192.png')
await render(iconSvg({ rounded: true,  scale: 0.78 }), 512, 'icon-512.png')
await render(iconSvg({ rounded: false, scale: 0.60 }), 512, 'icon-maskable.png') // full-bleed + padding for the OS mask
await render(iconSvg({ rounded: false, scale: 0.72 }), 180, 'apple-touch-icon.png')
console.log('done')