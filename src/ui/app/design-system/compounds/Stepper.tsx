/**
 * Stepper - Multi-step flow component
 */

import { forwardRef, createContext, useContext, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HStack, VStack } from '../primitives/Stack';
import { Text } from '../primitives/Text';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepperContextValue {
  currentStep: number;
  steps: Step[];
  goToStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const StepperContext = createContext<StepperContextValue | null>(null);

export function useStepperContext() {
  const context = useContext(StepperContext);
  if (!context) {
    throw new Error('useStepper must be used within a Stepper');
  }
  return context;
}

interface StepperProps {
  /** Array of step definitions */
  steps: Step[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Callback when step changes */
  onStepChange: (step: number) => void;
  /** Content for each step */
  children: ReactNode;
  /** Whether to show step indicators */
  showIndicators?: boolean;
  /** Indicator style */
  indicatorStyle?: 'dots' | 'numbers' | 'full';
  /** Custom class names */
  className?: string;
}

export const Stepper = forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      currentStep,
      onStepChange,
      children,
      showIndicators = true,
      indicatorStyle = 'full',
      className,
    },
    ref
  ) => {
    const prefersReduced = useReducedMotion();

    const goToStep = (index: number) => {
      if (index >= 0 && index < steps.length) {
        onStepChange(index);
      }
    };

    const nextStep = () => goToStep(currentStep + 1);
    const prevStep = () => goToStep(currentStep - 1);

    const contextValue: StepperContextValue = {
      currentStep,
      steps,
      goToStep,
      nextStep,
      prevStep,
    };

    return (
      <StepperContext.Provider value={contextValue}>
        <VStack ref={ref} gap={6} className={className}>
          {/* Step indicators */}
          {showIndicators && (
            <div className="w-full">
              {indicatorStyle === 'full' ? (
                <HStack gap={0} fullWidth className="relative">
                  {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isCurrent = index === currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                      <div
                        key={step.id}
                        className={cn('flex-1 flex items-center', !isLast && 'pr-4')}
                      >
                        <button
                          onClick={() => index <= currentStep && goToStep(index)}
                          disabled={index > currentStep}
                          className={cn(
                            'flex items-center gap-3',
                            index > currentStep && 'cursor-not-allowed opacity-50'
                          )}
                        >
                          {/* Step circle */}
                          <div
                            className={cn(
                              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
                              isCompleted
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/10 text-white/50'
                            )}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          {/* Step label */}
                          <VStack gap={0}>
                            <Text
                              variant="label"
                              color={isCurrent ? 'primary' : 'tertiary'}
                            >
                              {step.label}
                            </Text>
                            {step.description && (
                              <Text variant="bodyXs" color="muted">
                                {step.description}
                              </Text>
                            )}
                          </VStack>
                        </button>
                        {/* Connector line */}
                        {!isLast && (
                          <div className="ml-4 flex-1 h-0.5 bg-white/10">
                            <div
                              className={cn(
                                'h-full bg-emerald-500 transition-all',
                                isCompleted ? 'w-full' : 'w-0'
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </HStack>
              ) : indicatorStyle === 'dots' ? (
                <HStack gap={2} justify="center">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => index <= currentStep && goToStep(index)}
                      disabled={index > currentStep}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        index === currentStep
                          ? 'w-6 bg-blue-500'
                          : index < currentStep
                          ? 'w-2 bg-emerald-500'
                          : 'w-2 bg-white/20'
                      )}
                      aria-label={step.label}
                    />
                  ))}
                </HStack>
              ) : (
                <HStack gap={2} justify="center">
                  {steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => index <= currentStep && goToStep(index)}
                      disabled={index > currentStep}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                        index === currentStep
                          ? 'bg-blue-600 text-white'
                          : index < currentStep
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-white/50'
                      )}
                      aria-label={step.label}
                    >
                      {index < currentStep ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  ))}
                </HStack>
              )}
            </div>
          )}

          {/* Step content with animation */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </VStack>
      </StepperContext.Provider>
    );
  }
);

Stepper.displayName = 'Stepper';

// Step content wrapper
interface StepContentProps {
  stepIndex: number;
  children: ReactNode;
}

export function StepContent({ stepIndex, children }: StepContentProps) {
  const { currentStep } = useStepperContext();
  if (stepIndex !== currentStep) return null;
  return <>{children}</>;
}

export type { StepperProps, Step, StepContentProps };
