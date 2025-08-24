'use client'

import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/supabase'
import { isAdmin } from '@/lib/auth'
import AdminDashboardNew from './AdminDashboardNew'
import TechnicianDashboardNew from './TechnicianDashboardNew'

interface DashboardProps {
  user: User
  profile: Profile
}

export default function Dashboard({ user, profile }: DashboardProps) {
  if (isAdmin(profile.role)) {
    return <AdminDashboardNew user={user} profile={profile} />
  } else {
    return <TechnicianDashboardNew user={user} profile={profile} />
  }
}
