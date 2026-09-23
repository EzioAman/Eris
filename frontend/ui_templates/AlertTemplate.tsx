"use client";

import { Alert, AlertDescription, AlertTitle } from "../src/components/ui/alert";
import { Text } from "../src/components/ui/text";
import { AlertCircle, CheckCircle2, Terminal, Info, BellRing } from "lucide-react";

export function AlertPreview() {
  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      <Alert variant="success" icon={CheckCircle2}>
        <AlertTitle>Success! Your changes have been saved</AlertTitle>
        <AlertDescription>This is an alert with icon, title and description.</AlertDescription>
      </Alert>

      <Alert icon={Terminal}>
        <AlertTitle>This Alert has no description.</AlertTitle>
      </Alert>

      <Alert variant="destructive" icon={AlertCircle}>
        <AlertTitle>Unable to process your authentication.</AlertTitle>
        <AlertDescription>Please verify your security credentials and try again.</AlertDescription>
        <div role="list" className="mt-2 ml-0.5 flex flex-col gap-1 pl-5 border-l border-red-500/20">
          <Text role="listitem" className="text-xs text-rose-700 dark:text-red-200/80 flex items-center gap-2">
            <span className="text-rose-500 font-bold">•</span> Check your email address spelling
          </Text>
          <Text role="listitem" className="text-xs text-rose-700 dark:text-red-200/80 flex items-center gap-2">
            <span className="text-rose-500 font-bold">•</span> Ensure the 6-digit OTP has not expired
          </Text>
          <Text role="listitem" className="text-xs text-rose-700 dark:text-red-200/80 flex items-center gap-2">
            <span className="text-rose-500 font-bold">•</span> Verify network connection to local backend
          </Text>
        </div>
      </Alert>

      <Alert variant="info" icon={Info}>
        <AlertTitle>Local Offline Mode Active</AlertTitle>
        <AlertDescription>
          All conversation embeddings and tool logs are encrypted locally in SQLite vault.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function AlertTemplate() {
  return (
    <section className="relative w-full bg-[var(--bg-workspace)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
            <BellRing className="h-3.5 w-3.5" />
            Feedback Component
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Alert & Status Notification Template
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--text-secondary)] sm:text-base">
            Tactile feedback surfaces with icon alignments, title hierarchies, contextual lists, and obsidian glass finishes.
          </p>
        </header>

        <div className="flex justify-center">
          <AlertPreview />
        </div>
      </div>
    </section>
  );
}

export default AlertTemplate;
