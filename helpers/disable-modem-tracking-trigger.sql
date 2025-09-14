-- Modem tracking trigger'ını devre dışı bırak
-- Bu trigger auth.uid() kullandığı için supabaseAdmin ile çalışmıyor

-- Trigger'ı kaldır
DROP TRIGGER IF EXISTS trigger_log_modem_tracking_changes ON public.modem_tracking;

-- Log fonksiyonunu da kaldır (isteğe bağlı)
DROP FUNCTION IF EXISTS log_modem_tracking_changes();

-- Not: Artık API'de manuel log yapacağız
