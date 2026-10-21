'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

export type AiOrbMode = 'chat' | 'image' | 'report' | 'thinking'
export type AiOrbSize = 'sm' | 'md' | 'lg' | 'hero'

interface AiOrbProps {
  size?: AiOrbSize
  mode?: AiOrbMode
  statusText?: string
  showLabel?: boolean
  className?: string
}

const CHAT_STAGES = [
  'Analyzing your medical question',
  'Reviewing health profile & records',
  'Cross-referencing laboratory biomarkers',
  'Checking clinical guidelines & interactions',
  'Synthesizing diagnostic insights',
  'Formulating personalized explanation',
]

const IMAGE_STAGES = [
  'Scanning medical document image',
  'Performing document OCR & extraction',
  'Extracting diagnostic biomarkers & units',
  'Cross-referencing clinical reference ranges',
  'Synthesizing comprehensive medical report',
]

const REPORT_STAGES = [
  'Ingesting diagnostic report',
  'Detecting clinical abnormalities & flags',
  'Calculating biomarker historical trends',
  'Generating patient-friendly clinical breakdown',
]

const THINKING_STAGES = [
  'Thinking deeply',
  'Synthesizing medical records',
  'Cross-verifying clinical facts',
  'Structuring clear response',
]

export function AiOrb({
  size = 'md',
  mode = 'chat',
  statusText,
  showLabel = true,
  className,
}: AiOrbProps) {
  const stages =
    mode === 'image'
      ? IMAGE_STAGES
      : mode === 'report'
      ? REPORT_STAGES
      : mode === 'thinking'
      ? THINKING_STAGES
      : CHAT_STAGES

  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    if (statusText) return
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [stages.length, statusText])

  const activeStage = statusText || stages[stageIndex]

  // Dimension mapping
  const sizeMap = {
    sm: {
      wrapper: 'size-7',
      orb: 'size-7',
      aura: 'size-12',
      text: 'text-[11px]',
      badge: 'text-[10px] px-2 py-0.5',
    },
    md: {
      wrapper: 'size-12',
      orb: 'size-12',
      aura: 'size-20',
      text: 'text-[13px]',
      badge: 'text-[11px] px-2.5 py-1',
    },
    lg: {
      wrapper: 'size-20',
      orb: 'size-20',
      aura: 'size-32',
      text: 'text-[15px]',
      badge: 'text-[12px] px-3 py-1',
    },
    hero: {
      wrapper: 'size-28',
      orb: 'size-28',
      aura: 'size-44',
      text: 'text-[17px]',
      badge: 'text-[13px] px-3.5 py-1.5',
    },
  }[size]

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {/* Orb Canvas */}
      <div className={cn('relative flex items-center justify-center', sizeMap.wrapper)}>
        {/* Layer 1: Ambient Glowing Aura */}
        <div
          className={cn(
            'absolute rounded-full pointer-events-none transition-all duration-700',
            sizeMap.aura,
            'bg-gradient-to-tr from-[#00E0FF]/40 via-[#0059bb]/35 to-[#8b5cf6]/40 blur-xl animate-orb-breathe'
          )}
        />

        {/* Layer 2: Sonic Pulse Ripple Rings */}
        <div className="absolute inset-0 rounded-full border border-[#00E0FF]/40 animate-orb-pulse-ring pointer-events-none" />
        <div className="absolute inset-0 rounded-full border border-[#8b5cf6]/35 animate-orb-pulse-ring-delayed pointer-events-none" />

        {/* Layer 3: Main Floating Orb Body */}
        <div
          className={cn(
            'relative rounded-full shadow-2xl overflow-hidden animate-orb-float',
            sizeMap.orb
          )}
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #ffffff 0%, #38bdf8 20%, #0070ea 48%, #7c3aed 78%, #001736 100%)',
            boxShadow:
              '0 0 24px rgba(0, 224, 255, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.8), inset 0 -6px 12px rgba(0, 23, 54, 0.7)',
          }}
        >
          {/* Internal Chromatic Neural Swirl 1 */}
          <div
            className="absolute inset-[-40%] rounded-full opacity-65 mix-blend-color-dodge animate-orb-swirl"
            style={{
              background:
                'conic-gradient(from 0deg, #00E0FF, #3b82f6, #a855f7, #ec4899, #00E0FF)',
              filter: 'blur(4px)',
            }}
          />

          {/* Internal Chromatic Neural Swirl 2 (counter-rotation) */}
          <div
            className="absolute inset-[-20%] rounded-full opacity-55 mix-blend-overlay animate-orb-swirl-reverse"
            style={{
              background:
                'radial-gradient(circle at 70% 60%, rgba(0,224,255,0.9) 0%, rgba(139,92,246,0.6) 40%, transparent 80%)',
            }}
          />

          {/* Core Energy Flare */}
          <div className="absolute top-[22%] left-[24%] size-[28%] rounded-full bg-white/90 blur-[1.5px] pointer-events-none" />
          <div className="absolute top-[16%] left-[20%] size-[18%] rounded-full bg-white blur-[0.5px] pointer-events-none" />

          {/* Glass Convex Surface Sheen */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-transparent to-black/30 pointer-events-none" />
        </div>
      </div>

      {/* Dynamic Status / Activity Label */}
      {showLabel && (
        <div className="flex flex-col items-center gap-1.5 text-center max-w-sm px-2">
          {/* Active Status Badge */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-medium shadow-sm transition-all duration-300',
              'bg-surface-container-high/90 border border-outline-variant/40 text-on-surface backdrop-blur-md',
              sizeMap.badge
            )}
          >
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E0FF] opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-[#0070ea]" />
            </span>
            <span className="font-semibold tracking-wide uppercase text-[10px] text-secondary">
              {mode === 'image' ? 'Vision AI' : mode === 'report' ? 'Clinical AI' : 'CareDesk AI'}
            </span>
          </div>

          {/* Animated Thought Stage Text */}
          <p
            key={activeStage}
            className={cn(
              'font-medium text-deep-navy/85 animate-thought-fade',
              sizeMap.text
            )}
          >
            {activeStage}
            <span className="inline-flex tracking-widest text-secondary ml-1 animate-pulse">
              ...
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
