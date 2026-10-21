import { AiOrb } from '@/components/ai-orb'

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-5 md:p-8 space-y-6 animate-fadeIn">
      {/* Dynamic Thinking Orb Indicator */}
      <div className="flex justify-center pt-2 pb-4">
        <AiOrb mode="chat" size={20} state="searching" statusText="Loading health data...." />
      </div>

      {/* Greeting Skeleton */}
      <div className="glass-panel organic-radius p-6 space-y-3">
        <div className="h-6 w-48 bg-surface-container-high/70 rounded-md animate-pulse" />
        <div className="h-4 w-72 bg-surface-container/70 rounded-md animate-pulse" />
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="size-9 rounded-xl bg-surface-container-high/70 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-20 bg-surface-container/70 rounded animate-pulse" />
              <div className="h-6 w-16 bg-surface-container-high/80 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Panels Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
          <div className="h-5 w-40 bg-surface-container-high/70 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-16 w-full bg-surface-container/60 rounded-xl animate-pulse" />
            <div className="h-16 w-full bg-surface-container/60 rounded-xl animate-pulse" />
            <div className="h-16 w-full bg-surface-container/60 rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="h-5 w-32 bg-surface-container-high/70 rounded animate-pulse" />
          <div className="h-44 w-full bg-surface-container/60 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  )
}
