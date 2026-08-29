import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';
import { ChevronRight, Code2, Search, GitMerge, Zap, Loader2, Terminal } from 'lucide-react';

export function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleGithubLogin = () => {
    window.location.href = `${API_BASE}/api/v1/auth/github/login`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/30 relative">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Navigation */}
      <nav className="h-16 flex items-center justify-between px-6 lg:px-12 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2 text-text-primary font-bold text-lg tracking-tight">
          <Code2 size={24} className="text-white" />
          Arceus
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-text-muted hover:text-text-primary transition-colors">
            Log in
          </button>
          <button onClick={handleGithubLogin} className="btn-primary rounded-full px-4 h-9 text-sm">
            <Code2 size={16} />
            Continue with GitHub
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-32 relative z-10 animate-fade-in-up">
          <h1 className="text-5xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-active tracking-tight mb-6 drop-shadow-sm">
            The Open Source <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-500">AI Coding Agent</span>
          </h1>
          
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            A premium desktop-class IDE in your browser. Edit code, chat with AI, search semantically, and manage Git repositories instantly.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="btn-primary h-12 px-8 rounded-full text-base font-semibold w-full sm:w-auto group shadow-lg shadow-primary/25">
              Start building for free
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* Product Mockup */}
        <section className="w-full max-w-6xl mx-auto px-6 mb-32 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-transparent blur-3xl -z-10 opacity-60 rounded-[4rem]"></div>
          <div className="rounded-xl border border-border/80 bg-background-elevated shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/10 flex flex-col h-[600px]">
            {/* IDE Header */}
            <div className="h-10 bg-background-sidebar border-b border-border flex items-center px-4 justify-between shrink-0">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-error/80"></div>
                <div className="w-3 h-3 rounded-full bg-warning/80"></div>
                <div className="w-3 h-3 rounded-full bg-success/80"></div>
              </div>
              <div className="flex items-center gap-2 bg-background border border-border rounded-md px-32 py-1 text-xs text-text-muted font-medium shadow-sm">
                <Search size={12} />
                arceus-agent / src / main.tsx
              </div>
              <div className="w-16"></div> {/* Spacer for centering */}
            </div>
            
            {/* IDE Body */}
            <div className="flex-1 flex overflow-hidden bg-background">
              {/* Activity Bar & Explorer */}
              <div className="w-64 border-r border-border bg-background-sidebar flex">
                {/* Activity Bar */}
                <div className="w-12 border-r border-border flex flex-col items-center py-4 gap-4 text-text-muted">
                  <Code2 size={20} className="text-primary" />
                  <Search size={20} />
                  <GitMerge size={20} />
                </div>
                {/* Explorer */}
                <div className="flex-1 p-3">
                  <div className="text-[10px] font-bold tracking-wider text-text-muted mb-3 uppercase">Explorer</div>
                  <div className="space-y-1.5 text-xs text-text-secondary font-mono">
                    <div className="flex items-center gap-1"><ChevronRight size={14} /> src</div>
                    <div className="pl-4 flex items-center gap-1"><ChevronRight size={14} /> components</div>
                    <div className="pl-4 flex items-center gap-1 text-primary bg-primary/10 rounded px-1 py-0.5">main.tsx</div>
                    <div className="pl-4 flex items-center gap-1">utils.ts</div>
                    <div className="flex items-center gap-1"><ChevronRight size={14} /> public</div>
                    <div className="flex items-center gap-1 text-text-muted">package.json</div>
                  </div>
                </div>
              </div>
              
              {/* Editor Area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                <div className="flex h-9 bg-background-sidebar border-b border-border shrink-0">
                  <div className="px-4 py-2 border-r border-border bg-background flex items-center gap-2 text-xs font-mono text-primary border-t-2 border-t-primary">
                    main.tsx <span className="w-2 h-2 rounded-full bg-primary/50 ml-1"></span>
                  </div>
                  <div className="px-4 py-2 border-r border-border text-xs font-mono text-text-muted flex items-center">
                    utils.ts
                  </div>
                </div>
                
                {/* Code */}
                <div className="flex-1 p-4 font-mono text-sm overflow-hidden relative">
                  <div className="absolute left-0 top-0 bottom-0 w-12 bg-background-sidebar border-r border-border text-right pr-2 pt-4 text-text-muted/50 text-xs select-none space-y-1.5">
                    1<br/>2<br/>3<br/>4<br/>5<br/>6<br/>7
                  </div>
                  <div className="pl-12 pt-0.5 space-y-1.5 opacity-90">
                    <div><span className="text-primary">import</span> <span className="text-text-primary">{`{ Agent }`}</span> <span className="text-primary">from</span> <span className="text-success">'@arceus/core'</span>;</div>
                    <div><span className="text-primary">import</span> <span className="text-text-primary">{`{ renderUI }`}</span> <span className="text-primary">from</span> <span className="text-success">'./ui'</span>;</div>
                    <br/>
                    <div><span className="text-primary">async function</span> <span className="text-warning">bootstrap</span>() {`{`}</div>
                    <div className="pl-4"><span className="text-primary">const</span> agent <span className="text-text-primary">=</span> <span className="text-primary">new</span> <span className="text-warning">Agent</span>();</div>
                    <div className="pl-4"><span className="text-primary">await</span> agent.<span className="text-warning">initialize</span>();</div>
                    <div>{`}`}</div>
                  </div>
                  
                  {/* Floating AI Suggestion */}
                  <div className="absolute top-28 left-8 bg-background-elevated border border-primary/20 rounded-lg p-3 shadow-2xl shadow-primary/10 animate-fade-in z-20 w-[280px] ring-1 ring-white/5 transition-opacity">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary mb-2 uppercase tracking-wider">
                      <Zap size={12} className="fill-primary" /> Suggestion
                    </div>
                    <div className="text-xs text-text-secondary font-sans mb-3 leading-relaxed">
                      Consider wrapping the initialization in a <code className="text-primary bg-primary/10 px-1 py-0.5 rounded text-[10px]">try/catch</code> block to handle timeouts.
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-primary hover:bg-primary-active text-white text-[10px] font-semibold py-1.5 rounded transition-colors shadow-sm">
                        Accept
                      </button>
                      <button className="flex-1 bg-background hover:bg-background-hover border border-border text-text-muted hover:text-text-primary text-[10px] font-semibold py-1.5 rounded transition-colors">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Terminal */}
                <div className="h-48 border-t border-border bg-background flex flex-col shrink-0">
                  <div className="flex h-8 bg-background-sidebar border-b border-border items-center px-4 gap-4 text-[11px] uppercase tracking-wider font-semibold">
                    <span className="text-text-muted hover:text-text-primary cursor-pointer">Problems</span>
                    <span className="text-primary border-b border-primary h-full flex items-center">Terminal</span>
                  </div>
                  <div className="p-3 font-mono text-[11px] text-text-muted space-y-1">
                    <div><span className="text-success">➜</span> <span className="text-info">arceus-agent</span> git:(<span className="text-error">main</span>) npm start</div>
                    <div>&gt; arceus@1.0.0 start</div>
                    <div>&gt; node dist/index.js</div>
                    <br/>
                    <div className="text-text-primary">Server listening on port 3000...</div>
                    <div className="text-primary">WebSocket connection established.</div>
                  </div>
                </div>
              </div>
              
              {/* AI Assistant Panel */}
              <div className="w-80 border-l border-border bg-background flex flex-col">
                <div className="h-9 border-b border-border flex items-center px-4 text-xs font-semibold text-text-primary shrink-0 bg-background-sidebar">
                  AI Assistant
                </div>
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                  <div className="bg-background-elevated border border-border rounded-lg p-3 text-sm text-text-secondary shadow-sm">
                    How can I help you code today?
                  </div>
                  <div className="bg-primary/10 border border-primary/20 text-primary rounded-lg p-3 text-sm self-end max-w-[85%] shadow-sm">
                    Refactor the authentication flow.
                  </div>
                  <div className="bg-background-elevated border border-border rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-semibold text-text-primary mb-2">
                      <Loader2 size={12} className="animate-spin text-primary" /> Planning...
                    </div>
                    <div className="h-2 bg-background rounded-full overflow-hidden">
                      <div className="h-full bg-primary/50 w-2/3 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-border bg-background-sidebar">
                  <div className="bg-background border border-border rounded-lg h-10 flex items-center px-3 text-text-muted text-xs">
                    Message AI...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-border/50 relative">
          <div className="absolute top-1/2 left-[-10%] w-[30%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 right-[-10%] w-[30%] h-[50%] rounded-full bg-info/5 blur-[120px] pointer-events-none" />
          
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-4">Why Arceus?</h2>
            <p className="text-text-secondary">An intelligent workspace that writes, debugs, and understands code autonomously.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 relative z-10">
            {[
              { icon: <Code2 size={24} />, title: 'Autonomous Coding', desc: 'Give the agent a goal, and watch it plan, write, and execute code directly in your workspace.' },
              { icon: <GitMerge size={24} />, title: 'Zero Setup Required', desc: 'Clone any Git repository instantly. We handle the semantic indexing and vector embeddings automatically.' },
              { icon: <Zap size={24} />, title: 'Deep Context', desc: 'The agent reads your codebase intelligently, understanding the exact relationships between your files.' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl bg-background-elevated/80 backdrop-blur-md border border-border hover:border-primary/50 transition-colors group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-text-primary mb-4 group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Agent Deep Dive */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24 border-t border-border/50 relative overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-text-primary tracking-tight mb-6">Meet your new pair programmer.</h2>
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Arceus isn't just an autocomplete tool. It is an autonomous software engineering agent that uses a planner, coder, and reflection loop to solve complex issues end-to-end.
              </p>
              <ul className="space-y-6">
                {[
                  { title: '1. Understands Your Code', text: 'Instantly finds the exact files and context needed for your task, no matter how large the project.' },
                  { title: '2. Plans Before Acting', text: 'Breaks down complex requests into a clear, step-by-step roadmap so you know exactly what will change.' },
                  { title: '3. Writes and Runs Code', text: 'Edits files, runs terminal commands, and fixes its own errors securely in an isolated sandbox.' }
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 mt-1">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-text-primary mb-1">{step.title}</h4>
                      <p className="text-sm text-text-secondary">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative h-[400px] rounded-2xl bg-background-sidebar border border-border flex items-center justify-center p-8">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none rounded-2xl"></div>
              <div className="w-full max-w-sm bg-background-elevated border border-border rounded-xl shadow-xl flex flex-col overflow-hidden relative z-10 ring-1 ring-white/5">
                <div className="h-10 border-b border-border bg-background-sidebar flex items-center px-4 gap-2 text-xs font-semibold text-text-muted">
                  <Terminal size={14} /> Agent Log
                </div>
                <div className="p-4 font-mono text-xs space-y-3 opacity-90">
                  <div className="text-text-muted">Initializing workspace...</div>
                  <div className="text-primary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Retrieving relevant context
                  </div>
                  <div className="text-success">Found 3 matching files in src/auth/</div>
                  <div className="text-warning">Generating implementation plan...</div>
                  <div className="text-text-secondary pl-4 border-l-2 border-border my-2">
                    - Update Login.tsx forms<br/>
                    - Add error boundary<br/>
                    - Refactor session state
                  </div>
                  <div className="text-primary flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    Executing code modifications
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-12 text-center text-text-muted">
        <p className="text-sm">© {new Date().getFullYear()} Arceus. Open Source AI Agent.</p>
      </footer>
    </div>
  );
}
