import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-light)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background gradients */}
      <div style={{ 
        position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', 
        background: 'radial-gradient(circle, rgba(108,92,231,0.15) 0%, rgba(22,22,58,0) 70%)', 
        zIndex: 0, borderRadius: '50%' 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', 
        background: 'radial-gradient(circle, rgba(0,210,255,0.1) 0%, rgba(22,22,58,0) 70%)', 
        zIndex: 0, borderRadius: '50%' 
      }} />

      <header style={{ 
        position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(22, 22, 58, 0.5)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(90deg, #6C5CE7, #00D2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Graviq.
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" className="btn btn-secondary" style={{ border: 'none', background: 'transparent' }}>Login</Link>
          <Link to="/signup" className="btn btn-primary">Start for Free</Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-0.02em' }}>
          Turn every visitor into a <br />
          <span style={{ background: 'linear-gradient(90deg, #6C5CE7, #00D2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>qualified lead</span>
        </h1>
        
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.6 }}>
          Graviq is conversational AI tailored to your business. We skip the boring forms and engage your visitors naturally to capture names, emails, and phone numbers.
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 80 }}>
          <Link to="/signup" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
            Build your AI agent 🚀
          </Link>
          <a href="#how-it-works" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
            Learn more
          </a>
        </div>

        {/* Features Grid */}
        <div id="how-it-works" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, textAlign: 'left', marginTop: 40 }}>
          
          <div className="card card-glass" style={{ padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>NVIDIA-Powered AI</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Backed by LLaMA 3.1 70B, our AI understands context, handles complex product inquiries, and sells on your behalf 24/7.
            </p>
          </div>

          <div className="card card-glass" style={{ padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Gamified Lead Capture</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Forget static forms. Our AI builds rapport and naturally captures contact information through engaging, contextual conversations.
            </p>
          </div>

          <div className="card card-glass" style={{ padding: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Drop-in 1-Line Embed</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Deploy in seconds. Just copy our single `{"<script>"}` tag into your HTML and your custom AI widget is live instantly.
            </p>
          </div>

        </div>
      </main>

      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', marginTop: 80 }}>
        <p>© {new Date().getFullYear()} Graviq. All rights reserved.</p>
      </footer>
    </div>
  );
}
