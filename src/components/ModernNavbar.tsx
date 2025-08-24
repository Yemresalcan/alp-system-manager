'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Bell, 
  Search,
  Menu,
  X
} from 'lucide-react'

interface ModernNavbarProps {
  user: User
  profile: Profile
  title?: string
  showThemeToggle?: boolean
  onThemeToggle?: () => void
  theme?: 'light' | 'dark'
}

export default function ModernNavbar({ 
  user, 
  profile, 
  title = "Alp Sistem",
  showThemeToggle = false,
  onThemeToggle,
  theme = 'light'
}: ModernNavbarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (!mounted) return null

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      theme === 'dark' 
        ? 'bg-slate-900/95 backdrop-blur-sm border-slate-700' 
        : 'bg-white/95 backdrop-blur-sm border-gray-200'
    } border-b shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-blue-600'
              }`}>
                <span className="text-white font-bold text-sm">AS</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {title}
                </h1>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Tekniksyen Yönetim Sistemi
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Tekniksyen, görev veya dosya ara..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                } focus:outline-none`}
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            
            {/* Theme Toggle */}
            {showThemeToggle && onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Tema değiştir"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                  </svg>
                )}
              </button>
            )}

            {/* Notifications */}
            <button className={`relative p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'text-gray-300 hover:bg-slate-800 hover:text-white' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleProfile}
                className={`profile-button flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                  theme === 'dark' 
                    ? 'hover:bg-slate-800' 
                    : 'hover:bg-gray-100'
                } ${isProfileOpen ? (theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100') : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-blue-600'
                } text-white text-sm font-medium`}>
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {profile.full_name}
                  </p>
                  <p className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {profile.role === 'admin' ? 'Yönetici' : 'Tekniksyen'}
                  </p>
                </div>
                <svg className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''} ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className={`profile-dropdown absolute right-0 mt-2 w-64 rounded-xl shadow-lg border transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-gray-200'
                } overflow-hidden`}>
                  
                  {/* Profile Header */}
                  <div className={`px-4 py-3 border-b ${
                    theme === 'dark' ? 'border-slate-700 bg-slate-750' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-blue-600' : 'bg-blue-600'
                      } text-white font-medium`}>
                        {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className={`font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {profile.full_name}
                        </p>
                        <p className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {user.email}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                          profile.role === 'admin' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {profile.role === 'admin' ? 'Yönetici' : 'Tekniksyen'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-300 hover:bg-slate-700 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                      <UserIcon className="h-4 w-4" />
                      <span>Profil Ayarları</span>
                    </button>
                    <button className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${
                      theme === 'dark' 
                        ? 'text-gray-300 hover:bg-slate-700 hover:text-white' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}>
                      <Settings className="h-4 w-4" />
                      <span>Sistem Ayarları</span>
                    </button>
                    <div className={`mx-2 my-2 border-t ${
                      theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
                    }`}></div>
                    <button 
                      onClick={handleSignOut}
                      className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${
                        theme === 'dark' 
                          ? 'text-red-400 hover:bg-red-900/20' 
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className={`md:hidden p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'text-gray-300 hover:bg-slate-800 hover:text-white' 
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Ara..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-600 text-white placeholder:text-gray-400 focus:border-blue-500' 
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
