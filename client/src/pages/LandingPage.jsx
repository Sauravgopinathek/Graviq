import { Link } from 'react-router-dom';
import { useState } from 'react';

/* ---------- Inline icon set (no emojis) ---------- */
const Icon = {
  Logo: (props) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9H3l3-3a8.96 8.96 0 0 1-3-6Z" />
      <circle cx="9" cy="12" r="1" fill="white" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="white" stroke="none" />
    </svg>
  ),
  Bot: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 3v4" />
      <circle cx="12" cy="3" r="1" />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
      <path d="M9 17h6" />
    </svg>
  ),
  Spark: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3 13.9 8.5 19.5 10 13.9 11.5 12 17 10.1 11.5 4.5 10 10.1 8.5 12 3Z" />
      <path d="M19 16v4M17 18h4M5 4v3M3.5 5.5h3" />
    </svg>
  ),
  Code: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18-6-6 6-6" />
      <path d="m15 6 6 6-6 6" />
      <path d="m13 4-2 16" />
    </svg>
  ),
  Target: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  Chart: (props) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 4 4 5-6" />
    </svg>
  ),
  Check: (props) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Arrow: (props) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),
  Bolt: (props) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
    </svg>
  ),
  Copy: (props) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Shield: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Layers: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </svg>
  ),
  Globe: (props) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18" />
    </svg>
  ),
};

const HeroChatMock = () => (
  <div className="lp-chat-mock-wrap">
    <div className="lp-chat-mock-glow" />

    <div className="lp-float-badge lp-float-1">
      <Icon.Bolt />
      <span>New lead captured</span>
    </div>
    <div className="lp-float-badge lp-float-2">
      <Icon.Chart />
      <span>+38% conversion</span>
    </div>

    <div className="lp-chat-mock">
      <div className="lp-chat-header">
        <div className="lp-chat-avatar">
          <Icon.Logo width={18} height={18} />
        </div>
        <div className="lp-chat-header-text">
          <h4>Aria from Acme</h4>
          <span className="lp-chat-status">
            <span className="lp-chat-dot" /> Online — replies instantly
          </span>
        </div>
      </div>

      <div className="lp-chat-body">
        <div className="lp-bubble bot" style={{ animationDelay: '0.1s' }}>
          Hey there! I&apos;m Aria. Want a quick 30-sec recommendation tailored for your team?
        </div>
        <div className="lp-bubble user" style={{ animationDelay: '0.4s' }}>
          Sure, why not
        </div>

        <div className="lp-quiz-card" style={{ animationDelay: '0.7s' }}>
          <div className="lp-quiz-card-header">
            <Icon.Target width={12} height={12} />
            Quick quiz · Step 2 of 3
          </div>
          <div className="lp-quiz-progress">
            <div className="lp-quiz-progress-bar" />
          </div>
          <p style={{ fontSize: 13, marginBottom: 10, color: 'var(--text-primary)' }}>
            What&apos;s your team size?
          </p>
          <div className="lp-quiz-options">
            <div className="lp-quiz-option">Just me</div>
            <div className="lp-quiz-option">2 — 10 people</div>
            <div className="lp-quiz-option">10+ people</div>
          </div>
        </div>

        <div className="lp-typing" style={{ animationDelay: '1.1s' }}>
          <span /><span /><span />
        </div>
      </div>
    </div>
  </div>
);

const SAMPLE_CONVERSATION = [
  { from: 'bot', text: "Hey! I'm Aria. Looking for something specific today?" },
  { from: 'user', text: 'Need a CRM for my agency' },
  { from: 'bot', text: 'Got it — I can recommend the perfect plan. Want me to run a quick 30-sec match?' },
  { from: 'user', text: 'Yes please' },
  { from: 'bot', text: 'Awesome. First — what should I call you?' },
  { from: 'user', text: 'Rahul' },
  { from: 'bot', text: 'Nice to meet you, Rahul. Last step — where can I send your personalised result?' },
];

const GamifiedShowcase = () => (
  <div className="lp-showcase-chat">
    {SAMPLE_CONVERSATION.map((m, i) => (
      <div key={i} className={`lp-bubble ${m.from}`} style={{ animationDelay: `${i * 0.05}s` }}>
        {m.text}
      </div>
    ))}
    <div className="lp-quiz-card" style={{ marginTop: 4 }}>
      <div className="lp-quiz-card-header">
        <Icon.Spark width={12} height={12} />
        Lead captured · 92% confidence
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        <span><strong style={{ color: 'var(--text-primary)' }}>Name:</strong> Rahul</span>
        <span><strong style={{ color: 'var(--text-primary)' }}>Intent:</strong> Agency CRM</span>
      </div>
    </div>
  </div>
);

const EmbedCodeBlock = () => {
  const [copied, setCopied] = useState(false);
  const snippet = `<script>
  window.graviq = {
    botId: "bot_8f2a91",
    theme: "dark",
    position: "bottom-right"
  };
</script>
<script src="https://cdn.graviq.ai/widget.js" async></script>`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <div className="lp-code">
        <div className="lp-code-bar">
          <span className="lp-code-dot r" />
          <span className="lp-code-dot y" />
          <span className="lp-code-dot g" />
          <span className="lp-code-filename">index.html</span>
        </div>
        <pre className="lp-code-body">
{`  `}<span className="lp-code-comment">{'<!-- Paste before </body> -->'}</span>{`
  `}<span className="lp-code-tag">{'<script>'}</span>{`
    `}<span className="lp-code-key">window.graviq</span>{` = {
      `}<span className="lp-code-attr">botId</span>{`: `}<span className="lp-code-string">"bot_8f2a91"</span>{`,
      `}<span className="lp-code-attr">theme</span>{`: `}<span className="lp-code-string">"dark"</span>{`,
      `}<span className="lp-code-attr">position</span>{`: `}<span className="lp-code-string">"bottom-right"</span>{`
    };
  `}<span className="lp-code-tag">{'</script>'}</span>{`
  `}<span className="lp-code-tag">{'<script'}</span>{` `}<span className="lp-code-attr">src</span>{`=`}<span className="lp-code-string">"https://cdn.graviq.ai/widget.js"</span>{` `}<span className="lp-code-attr">async</span><span className="lp-code-tag">{'></script>'}</span>
        </pre>
      </div>
      <button type="button" className="lp-copy-btn" onClick={onCopy}>
        {copied ? <Icon.Check /> : <Icon.Copy />}
        {copied ? 'Copied to clipboard' : 'Copy snippet'}
      </button>
    </>
  );
};

const AnalyticsMock = () => {
  const bars = [42, 58, 49, 71, 65, 88, 76, 94, 82, 105, 96, 118];
  const max = Math.max(...bars);
  return (
    <div className="lp-dash-mock" aria-hidden="true">
      <div className="lp-dash-row">
        <div className="lp-dash-stat">
          <div className="lp-dash-stat-label">Visitors</div>
          <div className="lp-dash-stat-value">12,481</div>
          <div className="lp-dash-stat-trend">+12.4%</div>
        </div>
        <div className="lp-dash-stat">
          <div className="lp-dash-stat-label">Chats started</div>
          <div className="lp-dash-stat-value">3,902</div>
          <div className="lp-dash-stat-trend">+24.1%</div>
        </div>
        <div className="lp-dash-stat">
          <div className="lp-dash-stat-label">Qualified leads</div>
          <div className="lp-dash-stat-value">1,247</div>
          <div className="lp-dash-stat-trend">+38.7%</div>
        </div>
      </div>
      <div className="lp-dash-chart">
        {bars.map((v, i) => (
          <div key={i} className="lp-bar" style={{ height: `${(v / max) * 100}%` }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 10, padding: '0 4px' }}>
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
    </div>
  );
};

export default function LandingPage() {
  return (
    <div className="lp-root">
      {/* Decorative background */}
      <div className="lp-grid-bg" />
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />

      {/* Header */}
      <header className="lp-header">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-mark">
            <Icon.Logo />
          </span>
          <span className="lp-logo-text">Graviq</span>
        </Link>

        <nav className="lp-nav" aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#showcase">Showcase</a>
          <a href="#analytics">Analytics</a>
        </nav>

        <div className="lp-header-actions">
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ background: 'transparent', border: 'none' }}>
            Login
          </Link>
          <Link to="/signup" className="btn btn-primary btn-sm">
            Start free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-container lp-hero">
        <div>
          <span className="lp-pill">
            <span className="lp-pill-tag">New</span>
            Powered by LLaMA 3.1 70B + Azure AI
          </span>
          <h1>
            Turn every visitor into a{' '}
            <span className="lp-gradient-text">qualified lead</span>, conversationally.
          </h1>
          <p className="lp-lede">
            Graviq replaces dead static forms with an AI agent that talks like a human, plays like a game,
            and captures names, phone numbers and intent — naturally. Drop in one line of code. Watch
            conversions climb.
          </p>
          <div className="lp-cta-row">
            <Link to="/signup" className="btn btn-primary">
              Build your AI agent
              <Icon.Arrow />
            </Link>
            <a href="#showcase" className="btn btn-secondary">
              See a live demo
            </a>
          </div>
          <div className="lp-trust-row">
            <span className="lp-trust-item">
              <Icon.Check /> No credit card required
            </span>
            <span className="lp-trust-item">
              <Icon.Check /> Live in under 60 seconds
            </span>
            <span className="lp-trust-item">
              <Icon.Check /> GDPR-ready
            </span>
          </div>
        </div>

        <HeroChatMock />
      </section>

      {/* Trust strip */}
      <section className="lp-trust-strip">
        <div className="lp-container">
          <div className="lp-trust-grid">
            <div>
              <div className="lp-trust-stat-value">3.4×</div>
              <div className="lp-trust-stat-label">Higher form-fill rate</div>
            </div>
            <div>
              <div className="lp-trust-stat-value">47s</div>
              <div className="lp-trust-stat-label">Avg. time to first lead</div>
            </div>
            <div>
              <div className="lp-trust-stat-value">92%</div>
              <div className="lp-trust-stat-label">Lead quality score</div>
            </div>
            <div>
              <div className="lp-trust-stat-value">1-line</div>
              <div className="lp-trust-stat-label">Drop-in JS embed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="lp-section lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Why Graviq</span>
          <h2>Everything you need to turn traffic into pipeline.</h2>
          <p>
            A complete conversational lead-gen stack — from the AI brain to the embeddable widget to
            the analytics that close the loop.
          </p>
        </div>

        <div className="lp-feature-grid">
          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Bot /></div>
            <h3>AI that actually sells</h3>
            <p>
              Multi-turn dialogue grounded in your business context. Aria detects intent, qualifies in real
              time, and adapts tone — formal, friendly or playful — to your brand.
            </p>
          </article>

          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Target /></div>
            <h3>Gamified lead capture</h3>
            <p>
              Mini quizzes, spin-the-wheel rewards, progress bars and personalised results. Phone numbers
              feel like delivery — never data collection.
            </p>
          </article>

          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Code /></div>
            <h3>One-line embed</h3>
            <p>
              Paste a single <code style={{ background: 'rgba(108,92,231,0.15)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>{'<script>'}</code> tag.
              Domain-validated, lazy-loaded, fully responsive — works on every CMS.
            </p>
          </article>

          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Shield /></div>
            <h3>Validated leads, not noise</h3>
            <p>
              Country-aware phone validation, name confidence scoring and optional OTP verification. Every
              lead arrives clean, ranked and CRM-ready.
            </p>
          </article>

          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Layers /></div>
            <h3>Multi-bot, multi-domain</h3>
            <p>
              Run a different agent per product, page or region. Configure tone, language, welcome
              message and lead goals — all from one dashboard.
            </p>
          </article>

          <article className="lp-feature-card">
            <div className="lp-feature-icon"><Icon.Chart /></div>
            <h3>Conversion analytics</h3>
            <p>
              Track visitors → chats → leads, replay every conversation, and surface drop-off points so
              you can iterate prompts that actually move the needle.
            </p>
          </article>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="lp-section lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>From signup to your first qualified lead in 4 steps.</h2>
          <p>No engineering team required. If you can paste a script, you can ship Graviq.</p>
        </div>

        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">1</div>
            <h4>Create a bot</h4>
            <p>Name it, give it a welcome message and a sentence about your business.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">2</div>
            <h4>Configure goals</h4>
            <p>Pick what to capture — name, phone, email, intent — and choose a tone.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">3</div>
            <h4>Embed the snippet</h4>
            <p>Copy one line of JavaScript and paste it into your site&apos;s HTML.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">4</div>
            <h4>Watch leads roll in</h4>
            <p>Replay chats, export to CRM, or push live leads to your webhook.</p>
          </div>
        </div>
      </section>

      {/* Showcase: gamified chat + embed code */}
      <section id="showcase" className="lp-section lp-container">
        <div className="lp-section-head">
          <span className="lp-eyebrow">In action</span>
          <h2>Conversations that convert. Code that disappears.</h2>
          <p>
            On the left: an actual gamified capture flow. On the right: the only code you&apos;ll ever
            need to write.
          </p>
        </div>

        <div className="lp-showcase">
          <div className="lp-showcase-card">
            <span className="lp-showcase-tag">
              <Icon.Spark width={12} height={12} />
              Gamified capture flow
            </span>
            <h3>Phone numbers feel like delivery — not data collection.</h3>
            <p>
              Aria opens with a value-first quiz, builds rapport, and only asks for contact details
              after the visitor has invested in the conversation.
            </p>
            <GamifiedShowcase />
          </div>

          <div className="lp-showcase-card">
            <span className="lp-showcase-tag">
              <Icon.Code width={12} height={12} />
              Drop-in embed
            </span>
            <h3>Paste once. Live everywhere.</h3>
            <p>
              Domain-validated, lazy-loaded, and tree-shaken to under 14&nbsp;KB gzipped. Works on
              WordPress, Webflow, Shopify, Framer, plain HTML — anywhere.
            </p>
            <EmbedCodeBlock />
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section id="analytics" className="lp-section lp-container">
        <div className="lp-analytics">
          <div>
            <span className="lp-eyebrow">Closed-loop analytics</span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.15, margin: '14px 0 14px', textWrap: 'balance' }}>
              Know exactly which conversations turn into customers.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
              Every chat is stored, embedded, and sentiment-scored. Replay any conversation, find the
              drop-off, then ship a better prompt — all from one dashboard.
            </p>

            <ul className="lp-bullet-list">
              <li>
                <span className="lp-bullet-icon"><Icon.Chart /></span>
                <div>
                  <h4>Funnel analytics</h4>
                  <p>Visitors → chats → captured leads, broken down by bot, page and source.</p>
                </div>
              </li>
              <li>
                <span className="lp-bullet-icon"><Icon.Globe /></span>
                <div>
                  <h4>Conversation replay</h4>
                  <p>Step through any chat with sentiment markers and qualification confidence.</p>
                </div>
              </li>
              <li>
                <span className="lp-bullet-icon"><Icon.Bolt /></span>
                <div>
                  <h4>Webhooks &amp; CSV export</h4>
                  <p>Push leads instantly to your CRM, or export filtered batches in one click.</p>
                </div>
              </li>
            </ul>
          </div>

          <AnalyticsMock />
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-container" style={{ paddingBottom: 40 }}>
        <div className="lp-final-cta">
          <span className="lp-eyebrow">Ready when you are</span>
          <h2>Your next 1,000 leads are one script tag away.</h2>
          <p>
            Spin up your first agent in under a minute. Free forever for hobby projects — pay only when
            you scale.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary" style={{ padding: '14px 24px', fontSize: 14 }}>
              Start free — no card
              <Icon.Arrow />
            </Link>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 24px', fontSize: 14 }}>
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <Link to="/" className="lp-logo">
                <span className="lp-logo-mark"><Icon.Logo /></span>
                <span className="lp-logo-text">Graviq</span>
              </Link>
              <p>
                Conversational AI lead generation built for small teams that move fast and care about
                conversion.
              </p>
            </div>

            <div>
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#showcase">Live demo</a></li>
                <li><a href="#analytics">Analytics</a></li>
              </ul>
            </div>

            <div>
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Changelog</a></li>
                <li><a href="#">Customers</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>

            <div>
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Docs</a></li>
                <li><a href="#">API reference</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} Graviq. All rights reserved.</span>
            <span>Built for makers, marketers and founders.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
