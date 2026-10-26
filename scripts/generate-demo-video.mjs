// generate-demo-video.mjs
// Full automated CareDesk SaaS demo video generator
// Uses Chrome headless screenshots + FFmpeg zoompan/overlay compositing
import { execSync, spawnSync } from 'child_process'
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, join } from 'path'

const CHROME = String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`
const ROOT = resolve('.')
const ASSETS = join(ROOT, 'video-assets')
const OUTPUT = join(ROOT, 'CareDesk_SaaS_Demo.mp4')

if (!existsSync(ASSETS)) mkdirSync(ASSETS, { recursive: true })

// ── 1. Capture screenshots ──────────────────────────────────────────

const PAGES = [
  { name: '01_hero',            url: 'http://localhost:3000/' },
  { name: '02_signup_caregiver', url: 'http://localhost:3000/sign-up?role=caregiver' },
  { name: '03_signup_patient',  url: 'http://localhost:3000/sign-up?role=patient' },
  { name: '04_signin',          url: 'http://localhost:3000/sign-in' },
  { name: '05_privacy',         url: 'http://localhost:3000/privacy' },
]

function shot(name, url) {
  const out = join(ASSETS, `${name}.png`)
  const tmpDir = join(ASSETS, `tmp_${name}_${Date.now()}`)
  try {
    const r = spawnSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      `--window-size=1920,1080`,
      `--screenshot=${out}`,
      `--virtual-time-budget=6000`,
      `--user-data-dir=${tmpDir}`,
      url,
    ], { timeout: 20000, stdio: 'pipe' })
    if (existsSync(out)) {
      console.log(`  [OK] ${name}`)
      return out
    }
    console.log(`  [MISS] ${name} — file not created`)
  } catch (e) {
    console.log(`  [ERR] ${name}: ${e.message?.slice(0, 80)}`)
  }
  return null
}

console.log('=== Step 1: Capturing screenshots from localhost:3000 ===\n')
const paths = []
for (const p of PAGES) {
  const r = shot(p.name, p.url)
  if (r) paths.push({ ...p, path: r })
}
console.log(`\nCaptured ${paths.length}/${PAGES.length} screenshots.\n`)

if (paths.length < 1) {
  console.error('No screenshots captured. Aborting.')
  process.exit(1)
}

// ── 2. Generate SaaS Intro Card with FFmpeg ─────────────────────────

console.log('=== Step 2: Generating SaaS Intro Card ===\n')

const introPath = join(ASSETS, '00_intro.png')

// Create a 1920x1080 intro card with CareDesk branding using FFmpeg lavfi
try {
  execSync(`ffmpeg -y -f lavfi -i "color=c=0x001736:s=1920x1080:d=1" -vframes 1 ` +
    `-vf "drawtext=text='CareDesk 2.0':fontsize=96:fontcolor=white:x=(w-text_w)/2:y=300:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf:font=Segoe UI, ` +
    `drawtext=text='Connected Elder Care Health Platform':fontsize=36:fontcolor=0x00E0FF:x=(w-text_w)/2:y=440:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='AI-Powered Health Intelligence for Aging Loved Ones':fontsize=28:fontcolor=0xA9C7FF:x=(w-text_w)/2:y=520:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='___________________________________':fontsize=28:fontcolor=0x00E0FF44:x=(w-text_w)/2:y=580:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='10-Second Care Code Pairing  |  Real-Time Vitals  |  AI Health Consultations':fontsize=22:fontcolor=0x88AADD:x=(w-text_w)/2:y=650:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='Row-Level Security  |  Multi-Elder Switching  |  Zero Emojis':fontsize=22:fontcolor=0x88AADD:x=(w-text_w)/2:y=690:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf"` +
    ` "${introPath}"`, { stdio: 'pipe', timeout: 15000 })
  if (existsSync(introPath)) {
    console.log('  [OK] Intro card generated\n')
  }
} catch (e) {
  console.log('  [WARN] Intro card generation failed, creating fallback...')
  // Fallback: plain color card
  try {
    execSync(`ffmpeg -y -f lavfi -i "color=c=0x001736:s=1920x1080:d=1" -vframes 1 "${introPath}"`,
      { stdio: 'pipe', timeout: 10000 })
  } catch {}
}

// ── 3. Generate Outro Card ──────────────────────────────────────────

console.log('=== Step 3: Generating Outro Card ===\n')

const outroPath = join(ASSETS, '99_outro.png')
try {
  execSync(`ffmpeg -y -f lavfi -i "color=c=0x001736:s=1920x1080:d=1" -vframes 1 ` +
    `-vf "drawtext=text='Try CareDesk Free Today':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=380:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='caredesk.app':fontsize=42:fontcolor=0x00E0FF:x=(w-text_w)/2:y=500:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf, ` +
    `drawtext=text='Connected Health Intelligence for Families':fontsize=26:fontcolor=0xA9C7FF:x=(w-text_w)/2:y=580:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf"` +
    ` "${outroPath}"`, { stdio: 'pipe', timeout: 15000 })
  if (existsSync(outroPath)) {
    console.log('  [OK] Outro card generated\n')
  }
} catch {
  try {
    execSync(`ffmpeg -y -f lavfi -i "color=c=0x001736:s=1920x1080:d=1" -vframes 1 "${outroPath}"`,
      { stdio: 'pipe', timeout: 10000 })
  } catch {}
}

// ── 4. Build the sequence list ──────────────────────────────────────

const CAPTIONS = {
  '00_intro':           '',
  '01_hero':            'Landing Page — Dual Role Onboarding & Live Demo Dropzone',
  '02_signup_caregiver': 'Sign Up as Family Caregiver — One-Click Role Selection',
  '03_signup_patient':  'Sign Up as Senior / Patient — Independent Health Management',
  '04_signin':          'Secure Sign-In — Email + Google OAuth via Supabase Auth',
  '05_privacy':         'Privacy & Data Security — HIPAA-Aligned Record Isolation',
  '99_outro':           '',
}

// Build ordered frame list
const frames = []
if (existsSync(introPath)) frames.push({ path: introPath, name: '00_intro', duration: 5 })
for (const p of paths) {
  frames.push({ path: p.path, name: p.name, duration: 5 })
}
if (existsSync(outroPath)) frames.push({ path: outroPath, name: '99_outro', duration: 4 })

console.log(`=== Step 4: Compositing ${frames.length} scenes into video ===\n`)

// ── 5. Generate individual scene clips with zoompan + captions ──────

const clips = []
for (let i = 0; i < frames.length; i++) {
  const f = frames[i]
  const clipPath = join(ASSETS, `clip_${String(i).padStart(2, '0')}.mp4`)
  const caption = CAPTIONS[f.name] || ''
  
  // Alternate zoom direction for visual variety
  let zoomFilter
  if (f.name === '00_intro' || f.name === '99_outro') {
    // Gentle static with subtle zoom in
    zoomFilter = `zoompan=z='min(zoom+0.001,1.08)':d=${f.duration * 30}:s=1920x1080:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
  } else if (i % 2 === 0) {
    // Zoom in from wide to close
    zoomFilter = `zoompan=z='min(zoom+0.0015,1.15)':d=${f.duration * 30}:s=1920x1080:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
  } else {
    // Pan from left to right with gentle zoom
    zoomFilter = `zoompan=z='min(zoom+0.001,1.10)':d=${f.duration * 30}:s=1920x1080:fps=30:x='min(zoom*iw/10,iw/zoom-iw)':y='ih/2-(ih/zoom/2)'`
  }
  
  let filterChain = zoomFilter
  
  // Add caption banner for feature scenes
  if (caption) {
    // Semi-transparent dark banner at bottom + white text
    filterChain += `,drawbox=x=0:y=ih-90:w=iw:h=90:color=0x001736CC:t=fill`
    filterChain += `,drawtext=text='${caption.replace(/'/g, "\\'")}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=h-65:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf`
  }
  
  try {
    execSync(
      `ffmpeg -y -loop 1 -i "${f.path}" -vf "${filterChain}" ` +
      `-t ${f.duration} -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 "${clipPath}"`,
      { stdio: 'pipe', timeout: 60000 }
    )
    if (existsSync(clipPath)) {
      clips.push(clipPath)
      console.log(`  [OK] Scene ${i + 1}/${frames.length}: ${f.name} (${f.duration}s)`)
    }
  } catch (e) {
    console.log(`  [ERR] Scene ${f.name}: ${e.message?.slice(0, 100)}`)
  }
}

console.log(`\nGenerated ${clips.length}/${frames.length} clips.\n`)

if (clips.length < 2) {
  console.error('Too few clips generated. Aborting.')
  process.exit(1)
}

// ── 6. Concatenate all clips into final video ───────────────────────

console.log('=== Step 5: Concatenating into final video ===\n')

const concatListPath = join(ASSETS, 'concat_list.txt')
const concatContent = clips.map(c => `file '${c.replace(/\\/g, '/')}'`).join('\n')
writeFileSync(concatListPath, concatContent)

try {
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" ` +
    `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart "${OUTPUT}"`,
    { stdio: 'pipe', timeout: 120000 }
  )
  
  if (existsSync(OUTPUT)) {
    const stats = statSync(OUTPUT)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1)
    console.log(`  [OK] Final video: ${OUTPUT}`)
    console.log(`  [OK] Size: ${sizeMB} MB`)
    console.log(`  [OK] Duration: ~${frames.reduce((a, f) => a + f.duration, 0)} seconds\n`)
    console.log('=== VIDEO GENERATION COMPLETE ===\n')
  } else {
    console.error('Final video not created!')
    process.exit(1)
  }
} catch (e) {
  console.error('Concatenation failed:', e.message?.slice(0, 200))
  process.exit(1)
}
