import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { extractError, API_BASE } from '../../api/client';
import { toast } from '../../lib/toast';
import { Loader2, Code2, Command, ArrowRight, Mail, User, KeyRound } from 'lucide-react';

export function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    
    setLoading(true);
    try {
      await register({ username, email, password });
      toast.success('Registration successful!', 'You can now log in.');
      navigate('/login');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = () => {
    window.location.href = `${API_BASE}/api/v1/auth/github/login`;
  };

  return (
    <div className="min-h-screen flex bg-background font-sans selection:bg-primary/30">
      {/* Left Panel - Branding/Preview */}
      <div className="hidden lg:flex flex-1 relative bg-background-sidebar border-r border-border items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="relative z-10 p-12 max-w-xl">
          <div className="flex items-center gap-2 text-text-primary font-bold text-2xl tracking-tight mb-6">
            <Command size={28} className="text-primary" />
            Arceus
          </div>
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-text-primary to-text-muted tracking-tight mb-6 leading-tight">
            Start building with AI.
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed mb-8">
            Create an account to experience a premium desktop-class IDE in your browser, powered by advanced AI contextual agents.
          </p>
          
          <div className="bg-background border border-border rounded-xl p-4 shadow-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Code2 size={24} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Instant Setup</div>
              <div className="text-xs text-text-muted">Clone any repo and start coding immediately.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Mobile Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none lg:hidden"></div>
        
        <div className="w-full max-w-[400px] z-10 animate-fade-in-up">
          <div className="flex flex-col mb-8 text-center lg:text-left">
            <div className="w-12 h-12 bg-background-elevated border border-border rounded-xl flex items-center justify-center mb-6 shadow-sm mx-auto lg:mx-0">
              <Command size={24} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">Create an account</h1>
            <p className="text-sm text-text-muted">Start building with Arceus</p>
          </div>

          <div className="bg-background-elevated/50 backdrop-blur-xl border border-border/80 rounded-2xl p-6 shadow-xl">
            <button
              onClick={handleGithubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white py-2.5 rounded-lg font-medium transition-all shadow-sm mb-6"
            >
              <Code2 size={18} />
              Sign up with GitHub
            </button>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
                <span className="bg-background-elevated px-4 text-text-muted">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Username
                </label>
                <div className="relative group">
                  <User size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${username ? 'text-primary' : 'text-text-muted group-focus-within:text-primary'}`} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`input pl-9 bg-background border-border focus:bg-background focus:ring-1 focus:ring-primary/50 transition-all h-11 ${username ? 'border-primary/50' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Email
                </label>
                <div className="relative group">
                  <Mail size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${email ? 'text-primary' : 'text-text-muted group-focus-within:text-primary'}`} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`input pl-9 bg-background border-border focus:bg-background focus:ring-1 focus:ring-primary/50 transition-all h-11 ${email ? 'border-primary/50' : ''}`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Password
                </label>
                <div className="relative group">
                  <KeyRound size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${password ? 'text-primary' : 'text-text-muted group-focus-within:text-primary'}`} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`input pl-9 bg-background border-border focus:bg-background focus:ring-1 focus:ring-primary/50 transition-all h-11 ${password ? 'border-primary/50' : ''}`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !email || !password}
                className="btn-primary w-full h-11 mt-4 group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-text-muted mt-8">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-text-primary hover:text-primary transition-colors font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
