import { AiOrb } from '@/components/ai-orb'

export default function RootLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-container-low/40 animate-fadeIn">
      <div className="glass-panel organic-radius p-8 flex flex-col items-center gap-4 shadow-xl border border-electric-blue/15">
        <AiOrb mode="chat" size={20} state="searching" statusText="Loading CareDesk...." />
        <div className="space-y-2 text-center">
          <div className="h-4 w-40 bg-surface-container-high/80 rounded animate-pulse mx-auto" />
          <div className="h-3 w-56 bg-surface-container/70 rounded animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  )
}
