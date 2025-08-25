// SUPABASE BAĞLANTI TESTİ
// Bu dosyayı terminal'de çalıştırarak bağlantıyı test edebiliriz

const { createClient } = require('@supabase/supabase-js')

// .env.local dosyasından değerleri al
const supabaseUrl = 'https://edveivkxzgcnoamwqawf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdmVpdmt4emdjbm9hbXdxYXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDMxNTcsImV4cCI6MjA3MTcxOTE1N30.7GotrsvbifM4gn1s4vFXrjBEaJ1cXCJFQhALZj-tRUE'

console.log('🔗 Supabase bağlantısı test ediliyor...')
console.log(`📍 URL: ${supabaseUrl}`)
console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    try {
        console.log('\n1️⃣ Temel bağlantı testi...')
        
        // Basit bir ping testi
        const { data, error } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true })
        
        if (error) {
            console.log('❌ Bağlantı hatası:', error.message)
            
            // Eğer tablo yoksa bu normaldir
            if (error.message.includes('relation "public.profiles" does not exist')) {
                console.log('ℹ️  Bu normal - henüz tablolar oluşturulmamış')
                console.log('✅ Supabase bağlantısı çalışıyor!')
                return true
            }
            return false
        }
        
        console.log('✅ Supabase bağlantısı başarılı!')
        console.log(`📊 Profiles tablosunda ${data || 0} kayıt var`)
        return true
        
    } catch (err) {
        console.log('💥 Beklenmeyen hata:', err.message)
        return false
    }
}

async function testTables() {
    try {
        console.log('\n2️⃣ Tablo kontrolü...')
        
        // Tabloların varlığını kontrol et
        const tables = ['profiles', 'files', 'tasks', 'inventory_items']
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true })
            
            if (error) {
                console.log(`❌ ${table} tablosu bulunamadı`)
            } else {
                console.log(`✅ ${table} tablosu mevcut (${data || 0} kayıt)`)
            }
        }
        
    } catch (err) {
        console.log('💥 Tablo kontrolü hatası:', err.message)
    }
}

async function runAllTests() {
    console.log('🚀 Supabase Test Başlıyor...\n')
    
    const connectionOk = await testConnection()
    
    if (connectionOk) {
        await testTables()
    }
    
    console.log('\n🏁 Test tamamlandı!')
    console.log('\n📋 Sonraki adımlar:')
    console.log('1. SQL şemasını Supabase\'de çalıştır')
    console.log('2. Storage bucket oluştur')
    console.log('3. Admin kullanıcısı ekle')
}

// Testi çalıştır
runAllTests()
