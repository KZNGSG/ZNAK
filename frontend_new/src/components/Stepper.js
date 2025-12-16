import React from 'react';
import { Progress } from './ui/progress';
import { Check } from 'lucide-react';

const Stepper = ({ current, total, steps }) => {
  const value = Math.round((current / total) * 100);

  return (
    <div className="w-full mb-8" data-testid="step-progress-bar">
      <Progress value={value} className="h-2 mb-4" />
      <div className="flex items-center justify-between">
        {Array.from({ length: total }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < current;
          const isActive = stepNum === current;
          
          return (
            <div key={i} className="flex flex-col items-center flex-1" data-testid={`step-dot-${stepNum}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {isCompleted ? <Check size={16} /> : stepNum}
              </div>
              {steps && steps[i] && (
                <div
                  className={`mt-2 text-xs text-center font-medium ${
                    isCompleted
                      ? 'text-emerald-600'
                      : isActive
                      ? 'text-primary'
                      : 'text-gray-400'
                  }`}
                  data-testid={`step-label-${stepNum}`}
                >
                  {steps[i]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
