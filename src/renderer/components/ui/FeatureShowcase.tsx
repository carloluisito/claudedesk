import { ReactNode } from 'react';

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    title: 'Split View',
    description: 'Work with up to 4 terminal panes simultaneously'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <line x1="8" y1="6" x2="10" y2="10" />
        <line x1="16" y1="6" x2="14" y2="10" />
        <line x1="8" y1="18" x2="10" y2="14" />
        <line x1="16" y1="18" x2="14" y2="14" />
      </svg>
    ),
    title: 'Agent Teams',
    description: 'Visualize and coordinate multiple AI agents'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'Repository Atlas',
    description: 'AI-powered codebase mapping and navigation'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Checkpoints',
    description: 'Save and restore conversation states'
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
    title: 'Templates',
    description: 'Reusable prompt templates for common tasks'
  }
];

export function FeatureShowcase() {
  return (
    <div className="feature-showcase-container">
      <h2 className="showcase-title">Powerful Features</h2>
      <div className="feature-showcase">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card"
            style={{ animationDelay: `${0.5 + index * 0.1}s` }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>

      <style>{`
        .feature-showcase-container {
          margin-top: 64px;
          width: 100%;
          max-width: 1000px;
        }

        .showcase-title {
          font-size: 18px;
          font-weight: 600;
          color: #a9b1d6;
          margin: 0 0 24px 0;
          text-align: center;
        }

        .feature-showcase {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: thin;
          scrollbar-color: #3d4458 #1f2335;
        }

        .feature-showcase::-webkit-scrollbar {
          height: 8px;
        }

        .feature-showcase::-webkit-scrollbar-track {
          background: #1f2335;
          border-radius: 4px;
        }

        .feature-showcase::-webkit-scrollbar-thumb {
          background: #3d4458;
          border-radius: 4px;
        }

        .feature-showcase::-webkit-scrollbar-thumb:hover {
          background: #565f89;
        }

        .feature-card {
          min-width: 180px;
          padding: 20px;
          background: #1f2335;
          border: 1px solid #3d4458;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          animation: feature-fade-in 0.5s ease backwards;
        }

        @keyframes feature-fade-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: #7aa2f7;
          box-shadow: 0 8px 24px rgba(122, 162, 247, 0.15);
        }

        .feature-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7aa2f7;
          margin-bottom: 12px;
        }

        .feature-title {
          font-size: 13px;
          font-weight: 600;
          color: #e9e9ea;
          margin: 0 0 8px 0;
        }

        .feature-description {
          font-size: 11px;
          color: #a9b1d6;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
