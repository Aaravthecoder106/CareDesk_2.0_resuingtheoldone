'use client'

import React, { useState, useEffect } from 'react'
import { ThinkingOrb, type OrbState, type OrbSize, type OrbTheme } from '@/components/thinking-orbs'
import { cn } from '@/lib/utils'

export type AiOrbMode = 'chat' | 'image' | 'report' | 'thinking'

export interface AiOrbProps {
  /** 20 for inline/pill, 64 for avatar scale. Defaults to 20 for compact indicator. */
  size?: OrbSize
  mode?: AiOrbMode
  state?: OrbState
  statusText?: string
  showLabel?: boolean
  className?: string
  theme?: OrbTheme
}

interface Stage {
  state: OrbState
  label: string
}

const CHAT_STAGES: Stage[] = [
  { state: 'searching', label: 'Searching records....' },
  { state: 'solving', label: 'Analyzing biomarkers....' },
  { state: 'connecting', label: 'Checking guidelines....' },
  { state: 'weaving', label: 'Synthesizing insights....' },
  { state: 'breathing', label: 'Thinking....' },
  { state: 'working', label: 'Formulating response....' },
]

const IMAGE_STAGES: Stage[] = [
  { state: 'shaping', label: 'Scanning image....' },
  { state: 'searching', label: 'Extracting text & labs....' },
  { state: 'solving', label: 'Analyzing clinical metrics....' },
  { state: 'weaving', label: 'Synthesizing report....' },
]

const REPORT_STAGES: Stage[] = [
  { state: 'searching', label: 'Ingesting document....' },
  { state: 'solving', label: 'Analyzing test ranges....' },
  { state: 'connecting', label: 'Detecting abnormalities....' },
  { state: 'working', label: 'Generating summary....' },
]

const THINKING_STAGES: Stage[] = [
  { state: 'breathing', label: 'Thinking....' },
  { state: 'solving', label: 'Solving....' },
  { state: 'working', label: 'Working....' },
]

export function AiOrb({
  size = 20,
  mode = 'chat',
  state,
  statusText,
  showLabel = true,
  className,
  theme = 'dark',
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
    if (state && statusText) return
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [stages.length, state, statusText])

  const activeStage = stages[stageIndex]
  const currentState: OrbState = state || activeStage.state
  const currentLabel = statusText || activeStage.label

  if (!showLabel) {
    return (
      <ThinkingOrb
        state={currentState}
        size={size}
        theme={theme}
        className={className}
        aria-label={currentLabel}
      />
    )
  }

  // Pill badge layout in dark navy blue (matching CareDesk primary theme)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 shadow-sm transition-all duration-200 select-none',
        'bg-primary text-white border border-white/15 shadow-md backdrop-blur-md',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="shrink-0 flex items-center justify-center">
        <ThinkingOrb
          state={currentState}
          size={size}
          theme="dark"
          aria-label={currentLabel}
        />
      </div>
      <span className="text-[13px] font-medium tracking-normal text-white/95">
        {currentLabel}
      </span>
    </div>
  )
}
