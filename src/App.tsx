import { CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <CircleCheck className="size-5" />
        <span>React + Vite + TypeScript + Tailwind + shadcn/ui</span>
      </div>
      <Button>Button</Button>
    </div>
  )
}

export default App
