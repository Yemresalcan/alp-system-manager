const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL veya Key eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTechnicianUser() {
  try {
    console.log('🔧 Teknisyen kullanıcısı oluşturuluyor...\n')

    // Teknisyen kullanıcısı bilgileri
    const technicianEmail = 'teknisyen@alpsistem.com'
    const technicianPassword = 'teknisyen123456'
    const technicianName = 'Test Teknisyeni'

    console.log('📝 Teknisyen bilgileri:')
    console.log(`Email: ${technicianEmail}`)
    console.log(`Şifre: ${technicianPassword}`)
    console.log(`İsim: ${technicianName}`)
    console.log()

    // Auth kullanıcısı oluştur
    console.log('🔐 Auth kullanıcısı oluşturuluyor...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: technicianEmail,
      password: technicianPassword,
      options: {
        data: {
          full_name: technicianName,
          role: 'technician'
        }
      }
    })

    if (authError) {
      console.error('❌ Auth kullanıcısı oluşturulamadı:', authError.message)
      if (authError.message.includes('already registered')) {
        console.log('ℹ️  Kullanıcı zaten kayıtlı. Profile güncellenecek...')
        
        // Mevcut kullanıcıyı al
        const { data: existingUser, error: getUserError } = await supabase.auth.getUser()
        if (getUserError) {
          console.error('❌ Mevcut kullanıcı alınamadı:', getUserError)
          return
        }
        
        // Giriş yapmayı dene
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: technicianEmail,
          password: technicianPassword
        })
        
        if (signInError) {
          console.error('❌ Giriş yapılamadı:', signInError)
          return
        }
        
        console.log('✅ Mevcut kullanıcı ile giriş yapıldı')
        authData.user = signInData.user
      } else {
        return
      }
    } else {
      console.log('✅ Auth kullanıcısı oluşturuldu:', authData.user?.email)
    }

    console.log('📊 User ID:', authData.user?.id)

    // Profile oluştur/güncelle
    if (authData.user) {
      console.log('👤 Profile oluşturuluyor/güncelleniyor...')
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: authData.user.id,
            email: technicianEmail,
            full_name: technicianName,
            role: 'technician',
            phone: '+90 555 987 6543',
            city: 'Ankara',
            department: 'Saha Ekibi',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        console.error('❌ Profile oluşturulamadı:', profileError)
      } else {
        console.log('✅ Teknisyen profile oluşturuldu/güncellendi')
      }
    }

    console.log('\n🎉 Teknisyen kullanıcısı hazır!')
    console.log('\n📋 Giriş bilgileri:')
    console.log(`Email: ${technicianEmail}`)
    console.log(`Şifre: ${technicianPassword}`)
    console.log(`Rol: technician`)

    // Çıkış yap
    await supabase.auth.signOut()
    console.log('🔓 Oturumdan çıkış yapıldı')

  } catch (error) {
    console.error('❌ Hata:', error)
  }
}

createTechnicianUser()
