import React from 'react';
import type { SessionConfigStatus } from '../onboarding/authActions';
import { ChatWorkspace } from './ChatWorkspace';

export interface WorkspaceViewProps {
  sessionStatus?: SessionConfigStatus;
  onReturnToGreeting?: () => void;
  onReturnToIntro?: () => void;
  onSignOut?: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  sessionStatus,
  onReturnToGreeting,
  onReturnToIntro,
  onSignOut,
}) => {
  return (
    <div className="w-full h-screen min-h-screen bg-[var(--bg-workspace)] text-[var(--text-primary)] flex flex-col font-sans overflow-hidden transition-colors duration-200">
      <ChatWorkspace
        sessionStatus={sessionStatus}
        onReturnToGreeting={onReturnToGreeting}
        onReturnToIntro={onReturnToIntro}
        onSignOut={onSignOut}
        className="flex-1"
      />
    </div>
  );
};

export default WorkspaceView;
