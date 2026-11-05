import { OsProvider } from '@/app/os/OsProvider'
import { MockServicesProvider } from '@/app/services/MockServicesProvider'
import { DesktopShell } from '@/app/shell/DesktopShell'
import { StudioProvider } from '@/app/studio/StudioProvider'

function App() {
  return (
    <MockServicesProvider>
      <OsProvider>
        <StudioProvider>
          <DesktopShell />
        </StudioProvider>
      </OsProvider>
    </MockServicesProvider>
  )
}

export default App
