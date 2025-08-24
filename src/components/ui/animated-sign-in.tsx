import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';

const AnimatedSignIn: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Animation states
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setFormVisible(true), 300);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Giriş denemesi:', { email, password });
      setIsLoading(false);
    }, 1500);
  };

  // Only show the component once mounted to avoid hydration issues
  if (!mounted) return null;

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-[#e8f4ef]'}`}>
      <div className="flex min-h-screen items-center justify-center p-4 md:p-0">
        <div className={`w-full max-w-6xl overflow-hidden rounded-2xl transition-all duration-500 ${
          theme === 'dark' ? 'bg-slate-800 shadow-xl shadow-slate-700/20' : 'bg-white shadow-xl shadow-gray-200'
        } ${formVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className={`absolute right-4 top-4 rounded-full p-2 transition-colors z-10 ${
              theme === 'dark' 
                ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Tema değiştir"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
            )}
          </button>

          <div className="flex flex-col md:flex-row">
            {/* Left side - Statistics and Images Collage */}
            <div className="hidden md:block w-full md:w-3/5 bg-gray-100 p-6 animate-fade-in">
              <div className="grid grid-cols-2 grid-rows-3 gap-4 h-full overflow-hidden">
                {/* Top left - Person working */}
                <div className="overflow-hidden rounded-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
                    alt="Çalışan kişi" 
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.9 }}
                  />
                </div>
                
                {/* Top right - Orange stat */}
                <div 
                  className={`rounded-xl flex flex-col justify-center items-center p-6 text-white ${
                    theme === 'dark' ? 'bg-orange-600' : 'bg-orange-500'
                  }`}
                  style={{
                    transform: formVisible ? 'translateY(0)' : 'translateY(20px)',
                    opacity: formVisible ? 1 : 0,
                    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
                    transitionDelay: '0.2s',
                  }}
                >
                  <h2 className="text-5xl font-bold mb-2">100+</h2>
                  <p className="text-center text-sm">Aktif tekniksyen ekibimizle hizmet veriyoruz.</p>
                </div>
                
                {/* Middle left - Person at computer */}
                <div className="overflow-hidden rounded-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158" 
                    alt="Bilgisayar başında çalışan" 
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.9 }}
                  />
                </div>
                
                {/* Middle right - Office space */}
                <div className="overflow-hidden rounded-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1605810230434-7631ac76ec81" 
                    alt="Ofis alanı" 
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.9 }}
                  />
                </div>
                
                {/* Bottom left - Green stat */}
                <div 
                  className={`rounded-xl flex flex-col justify-center items-center p-6 text-white ${
                    theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                  }`}
                  style={{
                    transform: formVisible ? 'translateY(0)' : 'translateY(20px)',
                    opacity: formVisible ? 1 : 0,
                    transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
                    transitionDelay: '0.4s',
                  }}
                >
                  <h2 className="text-5xl font-bold mb-2">99%</h2>
                  <p className="text-center text-sm">Müşteri memnuniyet oranımız ile gururluyuz.</p>
                </div>
                
                {/* Bottom right - Library */}
                <div className="overflow-hidden rounded-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085" 
                    alt="Çalışma masası" 
                    className="w-full h-full object-cover"
                    style={{ opacity: 0.9 }}
                  />
                </div>
              </div>
            </div>
            
            {/* Right side - Sign in form */}
            <div 
              className={`w-full md:w-2/5 p-8 md:p-12 ${
                theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
              }`}
              style={{
                transform: formVisible ? 'translateX(0)' : 'translateX(20px)',
                opacity: formVisible ? 1 : 0,
                transition: 'transform 0.6s ease-out, opacity 0.6s ease-out'
              }}
            >
              <div className="flex justify-end mb-6">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Hesabınız yok mu? 
                  <a 
                    href="#" 
                    className={`ml-1 font-medium ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                    }`}
                  >
                    Kayıt olun
                  </a>
                </p>
              </div>

              <div className="mb-8">
                <h1 className={`text-2xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-blue-500">Alp Sistem</span>'e Giriş Yapın
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Alp Sistem'e hoş geldiniz, lütfen giriş bilgilerinizi aşağıya girin.
                </p>
              </div>
              
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-1">
                  <label 
                    htmlFor="email" 
                    className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                  >
                    E-posta Adresi
                  </label>
                  <div className={`relative rounded-md shadow-sm transition-all duration-300`}>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full rounded-md border py-3 px-4 focus:outline-none focus:ring-2 sm:text-sm ${
                        theme === 'dark' 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:ring-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500'
                      }`}
                      placeholder="ornek@alpsistem.com"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label 
                    htmlFor="password" 
                    className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                  >
                    Şifre
                  </label>
                  <div className={`relative rounded-md shadow-sm transition-all duration-300`}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`block w-full rounded-md border py-3 px-4 pr-10 focus:outline-none focus:ring-2 sm:text-sm ${
                        theme === 'dark' 
                          ? 'bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:ring-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500'
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} className="hover:text-gray-700 transition-colors" />
                      ) : (
                        <Eye size={18} className="hover:text-gray-700 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <a 
                    href="#" 
                    className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'
                    }`}
                  >
                    Şifremi unuttum?
                  </a>
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex w-full justify-center rounded-md py-3 px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500' 
                      : 'bg-blue-600 hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                  } ${isLoading ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Giriş yapılıyor...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Giriş Yap
                    </span>
                  )}
                </button>
                
                {/* Demo Accounts */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-3 text-center">Demo Hesapları</p>
                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Admin Hesabı</p>
                          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>admin@alpsistem.com</p>
                        </div>
                        <div className="text-right">
                          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Şifre:</p>
                          <p className={`font-mono ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>admin123456</p>
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Tekniksyen Hesabı</p>
                          <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>teknisyen@alpsistem.com</p>
                        </div>
                        <div className="text-right">
                          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Şifre:</p>
                          <p className={`font-mono ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>teknik123456</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AnimatedSignIn };
