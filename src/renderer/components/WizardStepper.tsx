interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardStepper({ currentStep, totalSteps, stepLabels }: WizardStepperProps) {
  return (
    <div className="wizard-stepper">
      <div className="stepper-progress">
        <div
          className="stepper-progress-fill"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      <div className="stepper-steps">
        {stepLabels.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div
              key={stepNum}
              className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span className="step-label">{label}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        .wizard-stepper {
          width: 100%;
          margin-bottom: 48px;
        }

        .stepper-progress {
          width: 100%;
          height: 4px;
          background: #24283b;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .stepper-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #7aa2f7, #7dcfff);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 8px rgba(122, 162, 247, 0.5);
        }

        .stepper-steps {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .stepper-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .step-indicator {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #24283b;
          border: 2px solid #3d4458;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #565f89;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .stepper-step.active .step-indicator {
          background: #7aa2f7;
          border-color: #7aa2f7;
          color: #1a1b26;
          box-shadow: 0 0 16px rgba(122, 162, 247, 0.5);
          animation: pulse-indicator 2s ease-in-out infinite;
        }

        .stepper-step.completed .step-indicator {
          background: #9ece6a;
          border-color: #9ece6a;
          color: #1a1b26;
        }

        @keyframes pulse-indicator {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .step-label {
          font-size: 11px;
          color: #565f89;
          text-align: center;
          transition: color 0.3s ease;
        }

        .stepper-step.active .step-label {
          color: #a9b1d6;
          font-weight: 500;
        }

        .stepper-step.completed .step-label {
          color: #9ece6a;
        }
      `}</style>
    </div>
  );
}
