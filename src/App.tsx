import { OsProvider } from '@/app/os/OsProvider'
import { RuntimeClock } from '@/app/runtime/RuntimeClock'
import { MockServicesProvider } from '@/app/services/MockServicesProvider'
import { DesktopShell } from '@/app/shell/DesktopShell'
import { StudioProvider } from '@/app/studio/StudioProvider'

function App() {
  return (
    <MockServicesProvider>
      <OsProvider>
        <StudioProvider>
          <RuntimeClock />
          <DesktopShell />
        </StudioProvider>
      </OsProvider>
    </MockServicesProvider>
  )
}

export default App
