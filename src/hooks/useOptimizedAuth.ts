'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getUserProfile } from '@/lib/auth'
import { useEffect } from 'react'

// Prefetch stratejisi ile daha hızlı auth
export const useOptimizedAuth = () => {
    const queryClient = useQueryClient()

    // Session prefetch
    const { data: session, isLoading: sessionLoading } = useQuery({
        queryKey: ['auth', 'session'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession()
            return session
        },
        staleTime: 1 * 60 * 1000, // 1 dakika fresh
        gcTime: 3 * 60 * 1000, // 3 dakika cache
        retry: 1,
    })

    // Profile prefetch - session varsa hemen yükle
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['user', 'profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) throw new Error('No user ID')
            return await getUserProfile(session.user.id)
        },
        enabled: !!session?.user?.id,
        staleTime: 3 * 60 * 1000, // 3 dakika fresh
        gcTime: 8 * 60 * 1000, // 8 dakika cache
    })

    // Prefetch related data when authenticated
    useEffect(() => {
        if (session?.user?.id && profile) {
            // Task count'u prefetch et
            queryClient.prefetchQuery({
                queryKey: ['tasks', 'today-count', session.user.id],
                staleTime: 2 * 60 * 1000,
            })

            // Files'ı prefetch et
            queryClient.prefetchQuery({
                queryKey: ['files', 'technician', session.user.id],
                staleTime: 3 * 60 * 1000,
            })
        }
    }, [session?.user?.id, profile, queryClient])

    return {
        user: session?.user || null,
        profile,
        isLoading: sessionLoading || (session?.user && profileLoading),
        isAuthenticated: !!(session?.user && profile),
    }
}