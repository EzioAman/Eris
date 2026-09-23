import React, { useState, useEffect, useRef } from 'react';
import { CardTemplate } from '../../../ui_templates/CardTemplate';
import { LargeCtaButtonTemplate } from '../../../ui_templates/LargeCtaButtonTemplate';
import { AccordionTemplate } from '../../../ui_templates/AccordionTemplate';
import { BadgeTemplate } from '../../../ui_templates/BadgeTemplate';
import { DialogTemplate } from '../../../ui_templates/DialogTemplate';
import { TabsTemplate } from '../../../ui_templates/TabsTemplate';
import { SwitchTemplate } from '../../../ui_templates/SwitchTemplate';
import { ProgressTemplate } from '../../../ui_templates/ProgressTemplate';
import { SkeletonTemplate } from '../../../ui_templates/SkeletonTemplate';
import { TooltipTemplate } from '../../../ui_templates/TooltipTemplate';
import { TextareaTemplate } from '../../../ui_templates/TextareaTemplate';
import { SelectTemplate } from '../../../ui_templates/SelectTemplate';
import { RadioGroupTemplate } from '../../../ui_templates/RadioGroupTemplate';
import { RadioImagePicker } from '../../../ui_templates/RadioImagePickerTemplate';
import { DropdownMenuTemplate } from '../../../ui_templates/DropdownMenuTemplate';
import { CollapsibleTemplate } from '../../../ui_templates/CollapsibleTemplate';
import { ToggleTemplate } from '../../../ui_templates/ToggleTemplate';
import { PopoverTemplate } from '../../../ui_templates/PopoverTemplate';
import { AspectRatioTemplate } from '../../../ui_templates/AspectRatioTemplate';
import { ProfileSettingsTemplate } from '../../../ui_templates/ProfileSettingsTemplate';
import { ShineBorder } from '../magicui/shine-border';
import { AccordionGalleryTemplate } from '../../../ui_templates/AccordionGalleryTemplate';
import { AnimatedBeamTemplate } from '../../../ui_templates/AnimatedBeamTemplate';
import { AlertTemplate } from '../../../ui_templates/AlertTemplate';
import { AnimatedListTemplate } from '../../../ui_templates/AnimatedListTemplate';
import {
  FileTreeTemplate,
  SafariBrowserTemplate,
  AndroidDeviceTemplate,
  TerminalWindowTemplate,
  CodeComparisonTemplate,
  AnimatedCircularProgressTemplate,
  AnimatedThemeTogglerTemplate,
  AnimatedCheckButtonTemplate,
  MediaPlaylistTemplate,
} from '../../../ui_templates';
import { ArrowLeft, Layers, Sparkles, CheckCircle2 } from 'lucide-react';

interface TemplateGalleryProps {
  onClose?: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onClose }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interactive local states for demonstrations
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [togglePressed, setTogglePressed] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState('eris_core');
  const [selectValue, setSelectValue] = useState('option2');

  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const totalScroll = scrollHeight - clientHeight;
      if (totalScroll <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = Math.min(100, Math.max(0, (scrollTop / totalScroll) * 100));
      setScrollProgress(progress);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#080A10] text-neutral-100 overflow-y-auto overflow-x-hidden selection:bg-violet-500 selection:text-white"
    >
      {/* 1. Sticky Header with Scroll Progress Bar */}
      <div className="sticky top-0 z-40 bg-[#0c0f18]/90 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-200 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to ERIS</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <h1 className="text-sm font-semibold tracking-wider uppercase text-white">
                UI Templates Showcase
              </h1>
              <BadgeTemplate
                variant="outline"
                className="hidden sm:inline-flex text-[11px] uppercase tracking-widest text-violet-300 border-violet-500/40 bg-violet-500/10"
              >
                22 Components
              </BadgeTemplate>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400">
              {Math.round(scrollProgress)}%
            </span>
            <div className="w-28 sm:w-44">
              <ProgressTemplate
                value={scrollProgress}
                className="h-1.5 bg-neutral-800"
              />
            </div>
          </div>
        </div>

        {/* Quick Nav Chips */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto text-[11px] font-medium tracking-wide scrollbar-none border-t border-white/5">
          <button
            type="button"
            onClick={() => scrollToSection('sec-cta')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            CTA & Buttons
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-cards')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Cards & Shine
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-forms')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Forms & Inputs
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-overlays')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Overlays & Menus
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-feedback')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Feedback & Badges
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-profile')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Profile Experience
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-alerts')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Alerts & Status
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-animated-beam')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Animated Beam
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-animated-list')}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 whitespace-nowrap cursor-pointer"
          >
            Animated List
          </button>
        </div>
      </div>

      {/* Main Content Showcase */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">
        
        {/* Intro Banner */}
        <div className="relative rounded-3xl p-8 border border-white/10 bg-[#0E121E]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <ShineBorder
            borderWidth={1.5}
            duration={14}
            shineColor={['#8B5CF6', '#38BDF8', '#EC4899']}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-violet-300">
                  Design System Catalog
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light tracking-wide text-white">
                Live Interactive UI Templates
              </h2>
              <p className="text-sm text-neutral-400 max-w-xl font-light">
                Complete design system catalog showing all 25 production-ready templates available in{' '}
                <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-violet-300">
                  frontend/ui_templates/
                </code>
                . Scroll to explore live interactions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <BadgeTemplate variant="success" className="gap-1.5 py-1.5 px-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All 25 Active</span>
              </BadgeTemplate>
            </div>
          </div>
        </div>

        {/* Section 1: Large CTA & Toggle */}
        <section id="sec-cta" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              1. CTA Buttons & Toggle Controls
            </h3>
            <p className="text-xs text-neutral-400">
              High-impact call-to-action triggers with micro-animations and toggle elements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-4">
                LargeCtaButtonTemplate
              </h4>
              <LargeCtaButtonTemplate />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                ToggleTemplate
              </h4>
              <p className="text-xs text-neutral-400">Interactive state toggle button.</p>
              <div className="pt-2 flex flex-col gap-4">
                <ToggleTemplate
                  pressed={togglePressed}
                  onPressedChange={setTogglePressed}
                  className="w-full justify-center py-3 border border-white/10"
                >
                  {togglePressed ? 'Enabled Feature' : 'Disabled Feature'}
                </ToggleTemplate>

                <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-neutral-400">
                  State: {togglePressed ? 'ACTIVE (TRUE)' : 'INACTIVE (FALSE)'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Cards, Aspect Ratio & Accordion */}
        <section id="sec-cards" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              2. Cards, Layouts & Collapsibles
            </h3>
            <p className="text-xs text-neutral-400">
              Containers, animated border lights, aspect ratio wrappers, and accordion lists.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card with ShineBorder */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0C0F18]/90 p-6 backdrop-blur-xl overflow-hidden shadow-xl">
              <ShineBorder
                borderWidth={1.5}
                duration={10}
                shineColor={['#38BDF8', '#8B5CF6', '#F43F5E']}
              />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-white">CardTemplate with ShineBorder</h4>
                  <BadgeTemplate variant="secondary">Glowing Border</BadgeTemplate>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Demonstrates the glassmorphism backdrop blur combined with the continuous specular shine border effect.
                </p>
                <div className="pt-2 flex gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] bg-white/10 font-mono text-cyan-300">
                    Blur 20px
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] bg-white/10 font-mono text-violet-300">
                    Dual Tone Shine
                  </span>
                </div>
              </div>
            </div>

            {/* Standard CardTemplate */}
            <CardTemplate
              title="Standard CardTemplate"
              description="Standard card layout with header action, custom badge, and footer bar."
              badge={<BadgeTemplate variant="outline">SYSTEM</BadgeTemplate>}
              footer={
                <span className="text-xs text-neutral-400">
                  Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              }
              className="max-w-none bg-[#0C0F18]/80 border-white/10"
            >
              <p className="text-xs text-neutral-400 py-1">
                Flexible content container supporting any React children.
              </p>
            </CardTemplate>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AccordionTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                AccordionTemplate
              </h4>
              <AccordionTemplate
                items={[
                  {
                    id: 'acc-1',
                    title: 'What is ERIS Autonomous Engine?',
                    content:
                      'ERIS is a high-performance local AI orchestrator designed for real-time pair programming, multi-agent evaluation, and developer workflow automation.',
                  },
                  {
                    id: 'acc-2',
                    title: 'How do templates operate in this repository?',
                    content:
                      'Templates in frontend/ui_templates/ provide verified, modular building blocks for rapid UI development and high-aesthetic styling.',
                  },
                ]}
                defaultOpenId="acc-1"
              />
            </div>

            {/* Collapsible & Aspect Ratio */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                CollapsibleTemplate & AspectRatioTemplate
              </h4>
              <CollapsibleTemplate
                title="Expandable Inspector Section"
                defaultOpen={true}
              >
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-neutral-400">
                    AspectRatioTemplate container rendering 16:9 preview:
                  </p>
                  <AspectRatioTemplate ratio={16 / 9} className="rounded-xl overflow-hidden bg-black/50 border border-white/10">
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-violet-950/40 via-neutral-900 to-black">
                      <span className="text-xs font-mono text-violet-300">16 : 9 Aspect Ratio</span>
                      <span className="text-[11px] text-neutral-500 mt-1">Responsive Media Frame</span>
                    </div>
                  </AspectRatioTemplate>
                </div>
              </CollapsibleTemplate>
            </div>
          </div>

          {/* AccordionGalleryTemplate Showcase */}
          <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  AccordionGalleryTemplate (3D Perspective Interactive Gallery)
                </h4>
                <p className="text-xs text-neutral-400">
                  Interactive multi-panel 3D expanding accordion with parallax shifts, grayscale transitions, and keyboard navigation.
                </p>
              </div>
              <BadgeTemplate variant="outline">MOTION NATIVE</BadgeTemplate>
            </div>

            <div className="pt-2">
              <AccordionGalleryTemplate height={380} />
            </div>
          </div>
        </section>

        {/* Section 3: Forms & Inputs */}
        <section id="sec-forms" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              3. Forms, Pickers & Controls
            </h3>
            <p className="text-xs text-neutral-400">
              Form inputs including switches, textareas, native selects, radio groups, and image pickers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Switch & Select */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                SwitchTemplate & SelectTemplate
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-200">Enable Real-Time Telemetry</p>
                  <p className="text-xs text-neutral-400">Stream live inference metrics directly to console.</p>
                </div>
                <SwitchTemplate
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Execution Target Environment
                </label>
                <SelectTemplate
                  value={selectValue}
                  onChange={(e) => setSelectValue(e.target.value)}
                  options={[
                    { label: 'Local Development Server (Vite)', value: 'option1' },
                    { label: 'Docker Containerized Runtime', value: 'option2' },
                    { label: 'Staging Cloud Sandbox', value: 'option3' },
                  ]}
                />
              </div>
            </div>

            {/* Textarea */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                TextareaTemplate
              </h4>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  System Prompt Configuration
                </label>
                <TextareaTemplate
                  placeholder="Enter custom agent directives or constraints..."
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* RadioGroupTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                RadioGroupTemplate
              </h4>
              <RadioGroupTemplate
                name="model_preset"
                value={selectedRadio}
                onChange={setSelectedRadio}
                options={[
                  {
                    value: 'eris_core',
                    label: 'ERIS Core (High Precision)',
                    description: 'Optimized for complex agent loops and code refactoring.',
                  },
                  {
                    value: 'eris_fast',
                    label: 'ERIS Fast (Low Latency)',
                    description: 'Optimized for instant autocomplete and syntax linting.',
                  },
                ]}
              />
            </div>

            {/* RadioImagePickerTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                RadioImagePickerTemplate
              </h4>
              <div className="overflow-hidden">
                <RadioImagePicker />
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Overlays, Dialogs & Menus */}
        <section id="sec-overlays" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              4. Dialogs, Dropdowns, Popovers & Tooltips
            </h3>
            <p className="text-xs text-neutral-400">
              Modal dialogs, contextual dropdowns, popover overlays, and hover tooltips.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* DialogTemplate Trigger */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  DialogTemplate
                </h4>
                <p className="text-xs text-neutral-400">Accessible modal with backdrop blur.</p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Open Test Dialog
              </button>
            </div>

            {/* DropdownMenuTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  DropdownMenuTemplate
                </h4>
                <p className="text-xs text-neutral-400">Custom actions dropdown.</p>
              </div>
              <DropdownMenuTemplate
                trigger={
                  <span className="inline-block w-full py-2 px-3 text-center rounded-xl border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 transition-colors">
                    Open Menu ▾
                  </span>
                }
                items={[
                  { label: 'View Telemetry', onClick: () => {} },
                  { label: 'Clear Cache', onClick: () => {} },
                  { label: 'Export Logs', onClick: () => {} },
                ]}
              />
            </div>

            {/* PopoverTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  PopoverTemplate
                </h4>
                <p className="text-xs text-neutral-400">Click-triggered popover card.</p>
              </div>
              <PopoverTemplate
                trigger={
                  <span className="inline-block w-full py-2 px-3 text-center rounded-xl border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 transition-colors">
                    Click for Info
                  </span>
                }
              >
                <div className="p-3 text-xs text-neutral-300 max-w-xs space-y-1">
                  <p className="font-semibold text-white">Popover Details</p>
                  <p className="text-neutral-400">Custom overlay rendered outside standard flow.</p>
                </div>
              </PopoverTemplate>
            </div>

            {/* TooltipTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-5 backdrop-blur-md flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  TooltipTemplate
                </h4>
                <p className="text-xs text-neutral-400">Hover-triggered tooltip card.</p>
              </div>
              <TooltipTemplate content="Hover triggered hint overlay">
                <span className="inline-block w-full py-2 px-3 text-center rounded-xl border border-white/10 bg-white/5 text-xs text-neutral-300 hover:bg-white/10 cursor-help transition-colors">
                  Hover over me
                </span>
              </TooltipTemplate>
            </div>
          </div>

          <DialogTemplate
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            title="Interactive Dialog Demo"
            description="This dialog was rendered by DialogTemplate from frontend/ui_templates/DialogTemplate.tsx."
            footer={
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 cursor-pointer"
              >
                Dismiss Dialog
              </button>
            }
          >
            <p className="text-sm text-neutral-300 py-2">
              The dialog supports customizable titles, descriptions, action footers, and modal dismissal.
            </p>
          </DialogTemplate>
        </section>

        {/* Section 5: Feedback, Badges, Tabs & Progress */}
        <section id="sec-feedback" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              5. Navigation Tabs, Badges, Progress & Skeletons
            </h3>
            <p className="text-xs text-neutral-400">
              State indicators, progress bars, tab switchers, and content skeleton loaders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TabsTemplate */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-4">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                TabsTemplate
              </h4>
              <TabsTemplate
                tabs={[
                  {
                    id: 'overview',
                    label: 'Overview',
                    content: (
                      <p className="text-xs text-neutral-400 pt-2 leading-relaxed">
                        High-level summary of agent workflows and workspace settings.
                      </p>
                    ),
                  },
                  {
                    id: 'metrics',
                    label: 'Metrics',
                    content: (
                      <p className="text-xs text-neutral-400 pt-2 leading-relaxed">
                        Latency: 14ms | Memory: 42MB | Token Throughput: 120 tps
                      </p>
                    ),
                  },
                  {
                    id: 'audit',
                    label: 'Audit Log',
                    content: (
                      <p className="text-xs text-neutral-400 pt-2 leading-relaxed">
                        All actions logged and verified with SHA-256 integrity hashes.
                      </p>
                    ),
                  },
                ]}
                defaultTabId="overview"
              />
            </div>

            {/* Badges & Skeleton */}
            <div className="rounded-2xl border border-white/10 bg-[#0E121E]/60 p-6 backdrop-blur-md space-y-5">
              <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                BadgeTemplate Variants & SkeletonTemplate
              </h4>

              <div className="flex flex-wrap gap-2">
                <BadgeTemplate variant="default">DEFAULT</BadgeTemplate>
                <BadgeTemplate variant="secondary">SECONDARY</BadgeTemplate>
                <BadgeTemplate variant="outline">OUTLINE</BadgeTemplate>
                <BadgeTemplate variant="success">SUCCESS</BadgeTemplate>
                <BadgeTemplate variant="destructive">DESTRUCTIVE</BadgeTemplate>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-neutral-400">Skeleton Loading Placeholders:</p>
                <div className="space-y-2">
                  <SkeletonTemplate className="h-4 w-3/4 bg-white/10 rounded-md" />
                  <SkeletonTemplate className="h-4 w-1/2 bg-white/10 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: ProfileSettingsTemplate */}
        <section id="sec-profile" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              6. Full-Page Experience: ProfileSettingsTemplate
            </h3>
            <p className="text-xs text-neutral-400">
              Complete multi-tab settings management with form validation, avatar swatch picking, and security toggles.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
            <ProfileSettingsTemplate />
          </div>
        </section>

        {/* Section 7: Alert & Feedback Templates */}
        <section id="sec-alerts" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              7. System Feedback & Alerts
            </h3>
            <p className="text-xs text-neutral-400">
              Structured icon alerts with contextual bulleted action recommendations.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <AlertTemplate />
          </div>
        </section>

        {/* Section 8: MagicUI Animated Beam */}
        <section id="sec-animated-beam" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              8. MagicUI Animated Beam Topology
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive SVG light beam connections visualizing inter-agent data flow.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <AnimatedBeamTemplate />
          </div>
        </section>

        {/* Section 9: MagicUI Animated List */}
        <section id="sec-animated-list" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              9. MagicUI Animated List & Notifications
            </h3>
            <p className="text-xs text-neutral-400">
              Staggered notification feed using available Alert surfaces with Spring physics.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <AnimatedListTemplate />
          </div>
        </section>

        {/* Section 10: Magic UI File Tree */}
        <section id="sec-file-tree" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              10. Magic UI Workspace File Tree
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive recursive file and folder directory tree with dark and light theme adaptability.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <div className="w-full max-w-md">
              <FileTreeTemplate
                isDarkMode={true}
                data={[
                  {
                    id: '1', name: 'src', type: 'folder', isExpanded: true, children: [
                      { id: '2', name: 'components', type: 'folder', isExpanded: true, children: [
                        { id: '3', name: 'ChatWorkspace.tsx', type: 'file' },
                        { id: '4', name: 'LeftSidebar.tsx', type: 'file' },
                        { id: '5', name: 'ModelConfigModal.tsx', type: 'file' },
                      ]},
                      { id: '6', name: 'App.tsx', type: 'file' },
                    ]
                  },
                  { id: '7', name: 'package.json', type: 'file' }
                ]}
              />
            </div>
          </div>
        </section>

        {/* Section 11: Safari Browser Window */}
        <section id="sec-safari-browser" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              11. Safari Browser Window Template
            </h3>
            <p className="text-xs text-neutral-400">
              Apple Safari macOS-style browser frame for web search and interactive URL previews.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <div className="w-full max-w-2xl">
              <SafariBrowserTemplate url="https://duckduckgo.com/?q=eris+autonomous+ai">
                <div className="w-full h-48 bg-white text-slate-800 flex items-center justify-center font-sans font-medium text-sm">
                  Web Search Preview Container
                </div>
              </SafariBrowserTemplate>
            </div>
          </div>
        </section>

        {/* Section 12: Android Device Preview */}
        <section id="sec-android-device" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              12. Android Device Frame Template
            </h3>
            <p className="text-xs text-neutral-400">
              Mobile device viewport frame with notch and responsive containment.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <AndroidDeviceTemplate>
              <div className="w-full h-full bg-[#121622] text-amber-300 flex flex-col items-center justify-center p-6 text-center font-sans text-xs">
                <span>ERIS Mobile Companion</span>
              </div>
            </AndroidDeviceTemplate>
          </div>
        </section>

        {/* Section 13: Terminal Window Template */}
        <section id="sec-terminal-window" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              13. Terminal Execution Window Template
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive CLI terminal window with bash prompt lines and output badges.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <div className="w-full max-w-xl">
              <TerminalWindowTemplate
                commands={[
                  { text: 'uv run python run.py' },
                  { text: 'npm run dev' }
                ]}
              />
            </div>
          </div>
        </section>

        {/* Section 14: Code Comparison Template */}
        <section id="sec-code-comparison" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              14. Code Comparison Diff Template
            </h3>
            <p className="text-xs text-neutral-400">
              Side-by-side code diff viewer for verifying changes before executing approvals.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <div className="w-full max-w-2xl">
              <CodeComparisonTemplate
                beforeCode="const theme = 'dark';"
                afterCode="const theme = 'light'; // White mode default"
              />
            </div>
          </div>
        </section>

        {/* Section 15: Animated Theme Toggler */}
        <section id="sec-theme-toggler" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              15. View Transitions Theme Toggler
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive button demonstrating circular ripple view transitions between Light and Dark mode.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex items-center justify-center gap-4">
            <AnimatedThemeTogglerTemplate
              isDarkMode={true}
              onToggle={() => {}}
            />
            <span className="text-xs text-neutral-400 font-mono">Click to preview toggle animation</span>
          </div>
        </section>

        {/* Section 16: Circular Progress & Check Button */}
        <section id="sec-progress-buttons" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              16. Animated Circular Progress & Check Button
            </h3>
            <p className="text-xs text-neutral-400">
              Visual ring token gauges and stateful checkmark actions.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-wrap items-center justify-center gap-8">
            <AnimatedCircularProgressTemplate value={75} size={64} strokeWidth={5} />
            <AnimatedCheckButtonTemplate initialText="Step Completed" onClick={() => {}} />
          </div>
        </section>

        {/* Section 17: Media Playlist */}
        <section id="sec-media-playlist" className="space-y-6 scroll-mt-28">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-lg font-medium text-white tracking-wide">
              17. Media Playlist Template
            </h3>
            <p className="text-xs text-neutral-400">
              Audio and media queue controller with play/pause and track sequencing.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#0A0D14] p-4 sm:p-8 backdrop-blur-xl shadow-2xl flex justify-center">
            <div className="w-full max-w-md">
              <MediaPlaylistTemplate
                playlist={[
                  { id: '1', title: 'ERIS Atmospheric Ambient', duration: '3:45', artist: 'ERIS Core' },
                  { id: '2', title: 'Neural Flow Beats', duration: '4:12', artist: 'Subsystem 4' }
                ]}
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-10 border-t border-white/10 text-neutral-500 text-xs">
          ERIS Architecture • All Verified Phase 2 Templates Active
        </div>
      </div>
    </div>
  );
};

export default TemplateGallery;
