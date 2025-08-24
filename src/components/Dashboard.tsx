'use client'

import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth'
import AdminDashboard from './AdminDashboardNew'
import TechnicianDashboard from './TechnicianDashboardNew'

interface DashboardProps {
  user: User
  profile: Profile
}

export default function Dashboard({ user, profile }: DashboardProps) {
  if (isAdmin(profile.role)) {
    return <AdminDashboard user={user} profile={profile} />
  } else {
    return <TechnicianDashboard user={user} profile={profile} />
  }
}
