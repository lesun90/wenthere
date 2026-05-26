import { JetBrains_Mono } from 'next/font/google'
import { AdminConsole } from './AdminConsole'
import './admin.css'

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-admin-mono',
})

export default function AdminPage() {
  return (
    <div className={mono.variable}>
      <AdminConsole />
    </div>
  )
}
