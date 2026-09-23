import React, { useState } from 'react';
import { cn } from '../src/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface AnimatedCheckButtonTemplateProps {
  initialText?: string;
  successText?: string;
  onClick?: () => void | Promise<void>;
  className?: string;
}

export const AnimatedCheckButtonTemplate: React.FC<AnimatedCheckButtonTemplateProps> = ({
  initialText = 'Submit',
  successText = 'Done!',
  onClick,
  className,
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleClick = async () => {
    if (status !== 'idle') return;
    setStatus('loading');
    
    if (onClick) {
      try {
        await onClick();
      } catch (e) {
        setStatus('idle');
        return;
      }
    } else {
      // Simulate async action
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setStatus('success');
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'idle'}
      className={cn(
        'relative overflow-hidden rounded-full font-medium text-sm transition-colors',
        'h-10 px-6',
        status === 'idle' ? 'bg-blue-600 text-white hover:bg-blue-700' : 
        status === 'loading' ? 'bg-blue-600/50 text-white cursor-not-allowed' :
        'bg-emerald-500 text-white',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.span
            key="idle"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-full h-full"
          >
            {initialText}
          </motion.span>
        )}
        {status === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center w-full h-full"
          >
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
        {status === 'success' && (
          <motion.span
            key="success"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="flex items-center justify-center w-full h-full gap-2"
          >
            <Check className="w-4 h-4" />
            {successText}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
