import { redirect } from 'next/navigation'

/**
 * Upgrade page is removed because CareDesk is 100% free and unlimited.
 * Any direct navigation automatically redirects to the main dashboard.
 */
export default function UpgradePage() {
  redirect('/dashboard')
}
