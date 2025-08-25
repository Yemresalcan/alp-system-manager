// SUPABASE STORAGE TEST
// Storage bucket ve politikaları test edelim

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://edveivkxzgcnoamwqawf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdmVpdmt4emdjbm9hbXdxYXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDMxNTcsImV4cCI6MjA3MTcxOTE1N30.7GotrsvbifM4gn1s4vFXrjBEaJ1cXCJFQhALZj-tRUE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testStorage() {
    try {
        console.log('🗄️ Storage test başlıyor...\n')

        // 1. Bucket'ları listele
        console.log('1️⃣ Bucket kontrolü...')
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
        
        if (bucketError) {
            console.log('❌ Bucket listesi alınamadı:', bucketError.message)
            return
        }
        
        console.log('✅ Mevcut bucket\'lar:')
        buckets.forEach(bucket => {
            console.log(`   📁 ${bucket.name} (public: ${bucket.public})`)
        })
        
        // technician-files bucket'ını ara
        const technicianBucket = buckets.find(b => b.name === 'technician-files')
        if (technicianBucket) {
            console.log('✅ technician-files bucket\'ı mevcut!')
        } else {
            console.log('❌ technician-files bucket\'ı bulunamadı')
            return
        }

        console.log('\n2️⃣ Tablo kontrolü...')
        
        // Tabloları kontrol et
        const tables = ['profiles', 'files', 'tasks', 'inventory_items']
        let allTablesExist = true
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true })
            
            if (error) {
                console.log(`❌ ${table} tablosu: ${error.message}`)
                allTablesExist = false
            } else {
                console.log(`✅ ${table} tablosu mevcut (${data || 0} kayıt)`)
            }
        }

        console.log('\n📊 DURUM RAPORU:')
        console.log(`✅ Supabase bağlantısı: Çalışıyor`)
        console.log(`${technicianBucket ? '✅' : '❌'} Storage bucket: ${technicianBucket ? 'Hazır' : 'Eksik'}`)
        console.log(`${allTablesExist ? '✅' : '❌'} Veritabanı tabloları: ${allTablesExist ? 'Hazır' : 'Eksik'}`)
        
        if (technicianBucket && allTablesExist) {
            console.log('\n🎉 SİSTEM HAZIR!')
            console.log('📋 Sonraki adım: Admin kullanıcısı oluştur')
        } else {
            console.log('\n⚠️  Eksik kurulum var!')
        }

    } catch (err) {
        console.log('💥 Test hatası:', err.message)
    }
}

// Test çalıştır
testStorage()
