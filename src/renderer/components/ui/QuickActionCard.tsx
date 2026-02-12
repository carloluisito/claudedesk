import { ReactNode } from 'react';

interface QuickActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accentColor?: string;
}

export function QuickActionCard({
  icon,
  title,
  description,
  onClick,
  accentColor = '#7aa2f7'
}: QuickActionCardProps) {
  return (
    <button className="quick-action-card" onClick={onClick}>
      <div className="card-icon" style={{ color: accentColor }}>
        {icon}
      </div>
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>

      <style>{`
        .quick-action-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 24px;
          background: #1f2335;
          border: 2px solid #3d4458;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0, 0, 0.2, 1);
          width: 280px;
          text-align: left;
          font-family: inherit;
          animation: card-fade-in 0.5s ease backwards;
        }

        .quick-action-card:nth-child(1) {
          animation-delay: 0.1s;
        }

        .quick-action-card:nth-child(2) {
          animation-delay: 0.2s;
        }

        .quick-action-card:nth-child(3) {
          animation-delay: 0.3s;
        }

        @keyframes card-fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quick-action-card:hover {
          transform: translateY(-4px);
          border-color: ${accentColor};
          box-shadow: 0 12px 32px rgba(122, 162, 247, 0.2);
        }

        .quick-action-card:active {
          transform: translateY(-2px);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(122, 162, 247, 0.1);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .card-title {
          font-size: 15px;
          font-weight: 600;
          color: #e9e9ea;
          margin: 0 0 8px 0;
        }

        .card-description {
          font-size: 12px;
          color: #a9b1d6;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>
    </button>
  );
}
