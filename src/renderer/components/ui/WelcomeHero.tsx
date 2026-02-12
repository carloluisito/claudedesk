interface WelcomeHeroProps {
  version: string;
}

export function WelcomeHero({ version }: WelcomeHeroProps) {
  return (
    <div className="welcome-hero">
      <div className="hero-logo">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 3v18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 8l-5 5l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h1 className="hero-title">ClaudeDesk</h1>
      <p className="hero-tagline">
        Multi-session terminal workspace for Claude Code CLI
      </p>
      <div className="hero-version">v{version}</div>

      <style>{`
        .welcome-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 48px;
          animation: hero-fade-in 0.5s ease;
        }

        @keyframes hero-fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-logo {
          width: 96px;
          height: 96px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(122, 162, 247, 0.15), rgba(125, 207, 255, 0.1));
          border: 2px solid #3d4458;
          border-radius: 24px;
          margin-bottom: 24px;
          color: #7aa2f7;
          box-shadow: 0 8px 32px rgba(122, 162, 247, 0.15);
        }

        .hero-title {
          font-size: 32px;
          font-weight: 700;
          color: #e9e9ea;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .hero-tagline {
          font-size: 14px;
          color: #a9b1d6;
          margin: 0 0 12px 0;
          text-align: center;
          max-width: 400px;
          line-height: 1.5;
        }

        .hero-version {
          font-size: 11px;
          color: #565f89;
          font-weight: 500;
          padding: 4px 12px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
