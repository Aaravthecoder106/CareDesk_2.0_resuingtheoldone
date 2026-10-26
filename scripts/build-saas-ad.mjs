// build-saas-ad.mjs — High-energy, fast-paced CareDesk 2.0 SaaS Promo Video
// Includes: Voiceover narration, sleek kinetic caption bars, fast transitions, and showcases EVERY feature live!
import { execSync } from 'child_process'
import { writeFileSync, existsSync, statSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = resolve('.')
const ASSETS = join(ROOT, 'video-assets')
const OUTPUT = join(ROOT, 'CareDesk_SaaS_Demo.mp4')
if (!existsSync(ASSETS)) mkdirSync(ASSETS, { recursive: true })

console.log('===============================================================')
console.log('=== CAREDESK 2.0 — HIGH-ENERGY SAAS AD VIDEO GENERATOR ===')
console.log('===============================================================\n')

// ── 1. Define Scenes with Every Feature & Matched Narration ─────────

const SCENES = [
  {
    id: '01_intro',
    image: join(ASSETS, '00_intro.png'),
    tag: 'CAREDESK 2.0 // ELDER CARE INTELLIGENCE',
    caption: 'Connected Health Platform for Aging Loved Ones',
    voice: 'Meet CareDesk. Connected elder care and health intelligence.',
    zoom: 'zoom_in',
    minDur: 2.2,
  },
  {
    id: '02_roles',
    image: join(ASSETS, 'test_roles.png'),
    tag: 'DUAL-ROLE ONBOARDING',
    caption: 'Tailored Portals for Family Caregivers & Seniors',
    voice: 'Dedicated portals for family caregivers and seniors.',
    zoom: 'zoom_in',
    minDur: 1.8,
  },
  {
    id: '03_dropzone',
    image: join(ASSETS, 'test_dropzone.png'),
    tag: 'INSTANT LAB & RX DIGITIZATION',
    caption: 'Drop Any Blood Test or Prescription for Instant AI Scanning',
    voice: 'Drop any lab report or prescription for instant AI extraction.',
    zoom: 'pan_right',
    minDur: 2.0,
  },
  {
    id: '04_pairing',
    image: join(ASSETS, 'test_pairing.png'),
    tag: 'GAME-STYLE PAIRING // CARE-782',
    caption: 'Connect in 10 Seconds Like a Game Invite with Care Codes',
    voice: 'Connect in ten seconds with a game-style Care Code.',
    zoom: 'zoom_in',
    minDur: 1.9,
  },
  {
    id: '05_vitals',
    image: join(ASSETS, 'test_vitals.png'),
    tag: 'REAL-TIME BIOMARKERS MATRIX',
    caption: 'Track Blood Pressure 122/80, Glucose 98 mg/dL and HbA1c',
    voice: 'Track live blood pressure, glucose, and vital trends.',
    zoom: 'zoom_in',
    minDur: 1.9,
  },
  {
    id: '06_aichat',
    image: join(ASSETS, 'test_aichat.png'),
    tag: 'CAREGIVER AI CONSULTATION',
    caption: 'Clinically Grounded Answers Referencing Verified Medications',
    voice: 'Ask clinical questions grounded strictly in verified health records.',
    zoom: 'pan_right',
    minDur: 2.2,
  },
  {
    id: '07_workflow',
    image: join(ASSETS, 'feat_how_it_works.png'),
    tag: 'CARE CIRCLE WORKFLOW',
    caption: 'Share with Siblings over WhatsApp in a Single Tap',
    voice: 'Share with siblings over WhatsApp so the family stays aligned.',
    zoom: 'zoom_out',
    minDur: 2.0,
  },
  {
    id: '08_switching',
    image: join(ASSETS, 'feat_command_ctr.png'),
    tag: 'PRESCRIPTION SYNC & MULTI-ELDER SWITCHING',
    caption: 'Manage Both Mom & Dad with One-Click Profile Switching',
    voice: 'Sync medications and switch between parents in one click.',
    zoom: 'zoom_in',
    minDur: 2.0,
  },
  {
    id: '09_portal',
    image: join(ASSETS, '02_signup_caregiver.png'),
    tag: 'CAREGIVER COMMAND CENTER',
    caption: 'Dedicated Dashboards Built Specifically for Families',
    voice: 'Real-time command center built for family caregivers.',
    zoom: 'pan_right',
    minDur: 1.8,
  },
  {
    id: '10_security',
    image: join(ASSETS, '05_privacy.png'),
    tag: 'NATIVE ROW-LEVEL SECURITY',
    caption: 'Bank-Grade Data Isolation & Private Medical Records',
    voice: 'Protected by bank-grade row-level security and privacy.',
    zoom: 'zoom_in',
    minDur: 1.9,
  },
  {
    id: '11_outro',
    image: join(ASSETS, '99_outro.png'),
    tag: 'GET STARTED TODAY // CAREDESK.APP',
    caption: 'Connected Health Intelligence & Peace of Mind for Families',
    voice: 'CareDesk. Health intelligence, simplified. Try it free today.',
    zoom: 'zoom_out',
    minDur: 2.2,
  },
]

// ── 2. Batch-Generate Professional Voiceover with PowerShell TTS ────

console.log('=== Step 1: Generating Voiceover Audio Clips ===\n')

const psScriptLines = [
  'Add-Type -AssemblyName System.Speech',
  '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
  "$synth.SelectVoice('Microsoft David Desktop')",
  '$synth.Rate = 4', // Energetic, fast-paced modern SaaS commercial pace
]

SCENES.forEach((s) => {
  const wavPath = join(ASSETS, `voice_${s.id}.wav`).replace(/\\/g, '/')
  const safeText = s.voice.replace(/'/g, "''")
  psScriptLines.push(`$synth.SetOutputToWaveFile('${wavPath}')`)
  psScriptLines.push(`$synth.Speak('${safeText}')`)
})

psScriptLines.push('$synth.Dispose()')

const psScriptPath = join(ASSETS, 'gen_voices.ps1')
writeFileSync(psScriptPath, psScriptLines.join('\r\n'), 'utf8')

try {
  execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`, { stdio: 'inherit' })
  console.log('✔ All voiceover clips generated successfully.\n')
} catch (err) {
  console.error('Voice generation error:', err.message)
  process.exit(1)
}

// ── 3. Calculate Exact Clip Durations Matched to Voice ───────────────

console.log('=== Step 2: Synchronizing Clip Durations to Speech ===\n')

SCENES.forEach((s) => {
  const wav = join(ASSETS, `voice_${s.id}.wav`)
  let dur = s.minDur
  if (existsSync(wav)) {
    try {
      const probe = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wav}"`,
        { encoding: 'utf8' }
      ).trim()
      const parsed = parseFloat(probe)
      if (!isNaN(parsed) && parsed > 0) {
        dur = Math.max(parsed + 0.35, s.minDur) // 350ms buffer for breathing room
      }
    } catch {}
  }
  s.actualDur = Math.round(dur * 10) / 10
  console.log(`  [Scene ${s.id}] Voice: "${s.voice.slice(0, 35)}..." -> Duration: ${s.actualDur}s`)
})

const totalSec = SCENES.reduce((acc, s) => acc + s.actualDur, 0)
console.log(`\nTotal Video Duration: ~${totalSec.toFixed(1)} seconds (${SCENES.length} dynamic scenes)\n`)

// ── 4. Render Each Scene with Smooth Zooms, Captions & Synced Audio ─

console.log('=== Step 3: Rendering High-Definition Clips with Motion & Audio ===\n')

const renderedClips = []

for (let i = 0; i < SCENES.length; i++) {
  const s = SCENES[i]
  const clipOut = join(ASSETS, `pro_clip_${String(i).padStart(2, '0')}.mp4`)
  const wavIn = join(ASSETS, `voice_${s.id}.wav`)
  const totalFrames = Math.ceil(s.actualDur * 30)

  // Configure dynamic motion zoompan
  let zoomExpr
  if (s.zoom === 'zoom_in') {
    // Smooth zoom in toward center-bottom
    zoomExpr = `zoompan=z='min(zoom+0.0025,1.20)':d=${totalFrames}:s=1920x1080:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
  } else if (s.zoom === 'zoom_out') {
    // Zoom out to reveal full context
    zoomExpr = `zoompan=z='max(1.18-0.0025*on,1.0)':d=${totalFrames}:s=1920x1080:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`
  } else {
    // Pan right with subtle zoom
    zoomExpr = `zoompan=z='min(zoom+0.0018,1.12)':d=${totalFrames}:s=1920x1080:fps=30:x='min(on*1.5,iw-iw/zoom)':y='ih/2-(ih/zoom/2)'`
  }

  // Construct caption banner filters
  const safeTag = s.tag.replace(/'/g, "\\'")
  const safeCap = s.caption.replace(/'/g, "\\'")
  
  // Sleek lower-third banner:
  // Dark navy background box + electric blue accent line + uppercase tag + white main caption
  const bannerFilters = [
    zoomExpr,
    // Base semi-transparent dark navy container
    `drawbox=x=0:y=ih-110:w=iw:h=110:color=0x001736EE:t=fill`,
    // Electric blue neon top border accent (3px)
    `drawbox=x=0:y=ih-110:w=iw:h=3:color=0x00E0FFFF:t=fill`,
    // Cyan category pill tag
    `drawtext=text='${safeTag}':fontsize=16:fontcolor=0x00E0FF:x=70:y=h-88:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf`,
    // Crisp white description text
    `drawtext=text='${safeCap}':fontsize=26:fontcolor=white:x=70:y=h-60:fontfile=C\\\\:/Windows/Fonts/segoeui.ttf`,
  ].join(',')

  // Audio filter: boost voice clarity with compressor and highpass
  const afFilter = `volume=1.25,acompressor=threshold=-12dB:ratio=3:attack=5:release=50`

  const cmd = [
    'ffmpeg -y',
    `-loop 1 -i "${s.image}"`,
    `-i "${wavIn}"`,
    `-vf "${bannerFilters}"`,
    `-af "${afFilter}"`,
    `-t ${s.actualDur}`,
    '-c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p',
    '-c:a aac -b:a 192k',
    '-r 30',
    `"${clipOut}"`,
  ].join(' ')

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 60000 })
    if (existsSync(clipOut)) {
      renderedClips.push(clipOut)
      console.log(`  ✔ [${i + 1}/${SCENES.length}] ${s.id} (${s.actualDur}s) rendered`)
    }
  } catch (err) {
    console.error(`  ✖ Failed to render ${s.id}:`, err.message?.slice(0, 150))
  }
}

console.log(`\nSuccessfully rendered ${renderedClips.length}/${SCENES.length} clips.\n`)

if (renderedClips.length < SCENES.length) {
  console.error('Some clips failed to render. Aborting concatenation.')
  process.exit(1)
}

// ── 5. Concatenate All Clips into Final Master MP4 ───────────────────

console.log('=== Step 4: Master Assembly & Faststart Web Optimization ===\n')

const concatTxt = join(ASSETS, 'pro_concat.txt')
const concatLines = renderedClips.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
writeFileSync(concatTxt, concatLines, 'utf8')

try {
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatTxt}" ` +
    `-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 192k -movflags +faststart "${OUTPUT}"`,
    { stdio: 'inherit', timeout: 120000 }
  )

  if (existsSync(OUTPUT)) {
    const stats = statSync(OUTPUT)
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
    console.log('\n===============================================================')
    console.log('✔ MASTER SAAS DEMO VIDEO GENERATED SUCCESSFULLY!')
    console.log(`✔ File: ${OUTPUT}`)
    console.log(`✔ Size: ${sizeMB} MB`)
    console.log(`✔ Duration: ~${totalSec.toFixed(1)} seconds`)
    console.log('✔ Resolution: 1920x1080 (Full HD, 30 FPS, H.264 + AAC Audio)')
    console.log('===============================================================\n')
  } else {
    throw new Error('Final output file missing after ffmpeg concat!')
  }
} catch (err) {
  console.error('Master assembly error:', err.message)
  process.exit(1)
}
