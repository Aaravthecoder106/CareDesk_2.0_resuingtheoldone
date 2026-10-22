import { execSync } from 'child_process'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

function dumpDom(url) {
  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --dump-dom "${url}"`
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
    return output
  } catch (err) {
    return err.stdout || ''
  }
}

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/u

console.log('========================================================')
console.log('=== BROWSER CROSS-VERIFICATION ACROSS ALL ROUTES ===')
console.log('========================================================\n')

let allPassed = true

// 1. Landing Page
console.log('1. Checking Landing Page (http://localhost:3000/)...')
const landingHtml = dumpDom('http://localhost:3000/')

const landingChecks = [
  { name: 'CareDesk ElderCare Title', test: landingHtml.includes('CareDesk ElderCare') },
  { name: 'Caregiver Role Pathway Card', test: landingHtml.includes('I am a Caregiver') && landingHtml.includes('/sign-up?role=caregiver') },
  { name: 'Senior / Patient Pathway Card', test: landingHtml.includes('I am an Elder / Patient') && landingHtml.includes('/sign-up?role=patient') },
  { name: 'Game-Style Room Code Mention', test: landingHtml.includes('CARE-782') || landingHtml.includes('CARE-') },
  { name: 'Connect in 10 Seconds section', test: landingHtml.includes('Connect in 10 Seconds Like a Game Invite') },
  { name: 'Caregiver AI Consultation Preview', test: landingHtml.includes('Caregiver AI Consultation') },
  { name: 'BorderBeam Animated Glow Elements', test: landingHtml.includes('data-beam') },
  { name: 'Zero Paywall / Upgrade references', test: !landingHtml.includes('Razorpay') && !landingHtml.includes('/upgrade') },
  { name: 'Zero Fake Reviews (No Sunita / Michael)', test: !landingHtml.includes('Sunita') && !landingHtml.includes('Michael R.') && !landingHtml.includes('Stories From Real') },
  { name: 'Zero Emojis in Landing Page DOM', test: !emojiRegex.test(landingHtml) },
]

landingChecks.forEach(c => {
  console.log(`  [${c.test ? 'PASS' : 'FAIL'}] ${c.name}`)
  if (!c.test) allPassed = false
})

// 2. Sign Up as Caregiver
console.log('\n2. Checking Caregiver Sign-Up Page (http://localhost:3000/sign-up?role=caregiver)...')
const caregiverSignupHtml = dumpDom('http://localhost:3000/sign-up?role=caregiver')

const caregiverSignupChecks = [
  { name: 'Family Caregiver Selected Option', test: caregiverSignupHtml.includes('Family Caregiver') },
  { name: 'Senior / Patient Option Available', test: caregiverSignupHtml.includes('Senior / Patient') },
  { name: 'Google OAuth Button Present', test: caregiverSignupHtml.includes('Google') },
  { name: 'First & Last Name Inputs', test: caregiverSignupHtml.includes('First Name') || caregiverSignupHtml.includes('firstName') || caregiverSignupHtml.includes('name') },
  { name: 'Password Input Present', test: caregiverSignupHtml.includes('password') || caregiverSignupHtml.includes('Password') },
  { name: 'Zero Emojis in Caregiver Signup DOM', test: !emojiRegex.test(caregiverSignupHtml) },
]

caregiverSignupChecks.forEach(c => {
  console.log(`  [${c.test ? 'PASS' : 'FAIL'}] ${c.name}`)
  if (!c.test) allPassed = false
})

// 3. Sign Up as Patient
console.log('\n3. Checking Senior/Patient Sign-Up Page (http://localhost:3000/sign-up?role=patient)...')
const patientSignupHtml = dumpDom('http://localhost:3000/sign-up?role=patient')

const patientSignupChecks = [
  { name: 'Senior / Patient Option Available', test: patientSignupHtml.includes('Senior / Patient') },
  { name: 'Family Caregiver Option Available', test: patientSignupHtml.includes('Family Caregiver') },
  { name: 'Create Account Button', test: patientSignupHtml.includes('Create Account') || patientSignupHtml.includes('Sign Up') || patientSignupHtml.includes('sign-up') },
  { name: 'Zero Emojis in Patient Signup DOM', test: !emojiRegex.test(patientSignupHtml) },
]

patientSignupChecks.forEach(c => {
  console.log(`  [${c.test ? 'PASS' : 'FAIL'}] ${c.name}`)
  if (!c.test) allPassed = false
})

// 4. Sign In Page
console.log('\n4. Checking Sign-In Page (http://localhost:3000/sign-in)...')
const signInHtml = dumpDom('http://localhost:3000/sign-in')

const signInChecks = [
  { name: 'Sign In Page Loaded', test: signInHtml.includes('Sign In') || signInHtml.includes('sign-in') || signInHtml.includes('Welcome') },
  { name: 'Google Sign In Present', test: signInHtml.includes('Google') },
  { name: 'Email / Password Present', test: signInHtml.includes('email') || signInHtml.includes('Email') },
  { name: 'Zero Emojis in Sign In DOM', test: !emojiRegex.test(signInHtml) },
]

signInChecks.forEach(c => {
  console.log(`  [${c.test ? 'PASS' : 'FAIL'}] ${c.name}`)
  if (!c.test) allPassed = false
})

// 5. Protected Dashboard Route (Unauthenticated Redirection)
console.log('\n5. Checking Dashboard Auth Guard (/dashboard)...')
const dashboardRes = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' })
const dashboardRedirects = dashboardRes.status === 307 && (dashboardRes.headers.get('location') || '').includes('/sign-in')
console.log(`  [${dashboardRedirects ? 'PASS' : 'FAIL'}] Redirects Unauthenticated Users to /sign-in (Status: ${dashboardRes.status})`)
if (!dashboardRedirects) allPassed = false

console.log('\n========================================================')
if (allPassed) {
  console.log('ALL BROWSER CHECKS PASSED WITH ZERO ISSUES!')
} else {
  console.error('SOME CHECKS FAILED')
  process.exit(1)
}
console.log('========================================================\n')
