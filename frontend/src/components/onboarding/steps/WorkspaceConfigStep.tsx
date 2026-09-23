import React from 'react';
import { ShineBorder } from '../../magicui/shine-border';
import { CtaButton } from '../../../../ui_templates/LargeCtaButtonTemplate';

export interface WorkspaceConfigStepProps {
  onCreateAccount: () => void;
  onSignIn: () => void;
  onMeetTheTeam: () => void;
}

export const WorkspaceConfigStep: React.FC<WorkspaceConfigStepProps> = ({
  onCreateAccount,
  onSignIn,
  onMeetTheTeam,
}) => {
  return (
    <div className="relative w-full max-w-md mx-auto rounded-3xl overflow-hidden border border-white/15 bg-black/75 backdrop-blur-sm p-7 sm:p-9 shadow-2xl text-center transform-gpu">
      <ShineBorder
        borderWidth={1.5}
        duration={12}
        shineColor={["#A07CFE", "#38BDF8", "#FE8FB5"]}
      />

      <div className="relative z-10 flex flex-col items-center space-y-5">
        <div className="space-y-2">
          <h2 className="text-white text-xl sm:text-2xl font-light tracking-[0.2em] uppercase font-sans drop-shadow-sm">
            Workspace Configuration
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 max-w-sm font-light leading-relaxed mx-auto">
            Set up your ERIS workspace environment or proceed to create your account.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full pt-2">
          <CtaButton
            variant="gradient"
            size="md"
            glyph="spark"
            label="Create Account"
            sublabel="New ERIS Workspace"
            onActivate={onCreateAccount}
          />
          <CtaButton
            variant="white"
            size="md"
            glyph="arrow"
            label="Log In"
            sublabel="Existing Session"
            onActivate={onSignIn}
          />
          <CtaButton
            variant="white"
            size="md"
            glyph="spark"
            label="Meet The Team"
            sublabel="Engineering Roster & Story"
            onActivate={onMeetTheTeam}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceConfigStep;
