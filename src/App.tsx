import { OsProvider } from '@/app/os/OsProvider'
import { MockServicesProvider } from '@/app/services/MockServicesProvider'
import { DesktopShell } from '@/app/shell/DesktopShell'

function App() {
  return (
    <MockServicesProvider>
      <OsProvider>
        <DesktopShell />
      </OsProvider>
    </MockServicesProvider>
  )
}

export default App
