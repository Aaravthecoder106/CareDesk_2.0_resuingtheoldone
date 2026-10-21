'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset when route transition finishes
  useEffect(() => {
    if (visible) {
      setProgress(100)
      const timeout = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(timeout)
    }
  }, [pathname, searchParams])

  // Intercept click on internal links to give 0ms instant visual feedback
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Ignore external, anchor links, or same page
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        target.getAttribute('target') === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      // Check if target is different from current path
      const url = new URL(href, window.location.href)
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return
      }

      // Start progress bar immediately
      setVisible(true)
      setProgress(25)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 85
          }
          return prev + Math.floor(Math.random() * 15 + 8)
        })
      }, 250)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-transparent">
      {/* Progress Track Bar */}
      <div
        className="h-full bg-gradient-to-r from-secondary via-[#00E0FF] to-secondary transition-all duration-300 ease-out shadow-[0_0_12px_rgba(0,224,255,0.8)]"
        style={{
          width: `${progress}%`,
        }}
      >
        {/* Glowing Head Point */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/70 blur-[2px] shadow-[0_0_15px_#00E0FF]" />
      </div>
    </div>
  )
}
