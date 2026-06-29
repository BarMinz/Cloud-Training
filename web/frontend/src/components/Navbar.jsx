import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { LogOut, LayoutDashboard, ShieldCheck, Cloud, Sun, Moon } from 'lucide-react'
import clsx from 'clsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 glass border-b border-white/8 flex items-center px-6 gap-6">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 mr-4 shrink-0">
        <Cloud className="w-5 h-5 text-brand-400" />
        <span className="font-bold text-white tracking-tight">CloudTrain</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              location.pathname === to || location.pathname.startsWith(to + '/')
                ? 'bg-brand-600/20 text-brand-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <Link to="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200 leading-none">{user?.username}</p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
              : user?.username?.[0]?.toUpperCase()
            }
          </div>
        </Link>
        <button onClick={toggleTheme} className="btn-ghost p-2 rounded-lg" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={handleLogout} className="btn-ghost p-2 rounded-lg" title="Log out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}
