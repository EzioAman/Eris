# React Native Reusables: Context Menu Specification (Onboarding)

## Reference
Official reference: [https://reactnativereusables.com/docs/components/context-menu](https://reactnativereusables.com/docs/components/context-menu)

## Design & Functional Scope
During the Onboarding flow, a context menu is provided globally across the entire window with strictly **two** features:
1. **Copy** (`Ctrl+C`):
   - Copies currently selected text across any card, legal document, or text field.
   - If an input is focused without a manual selection, copies the input's current value.
2. **Paste** (`Ctrl+V`):
   - Reads text from the user's system clipboard using `navigator.clipboard.readText()`.
   - Injects the text at the caret position of the targeted/active input element (e.g., email, password, OTP verification code).
   - Dispatches native React `input` and `change` events so validation and component state update immediately.

## Visual Styling
- **Aesthetic**: Obsidian dark glass (`bg-black/90 backdrop-blur-xl border border-white/15 shadow-2xl`).
- **Typography**: Clean `font-sans` with monospaced shortcut indicators (`Ctrl+C`, `Ctrl+V`).
- **Icons**: Lucide `Copy` and `ClipboardPaste`.
- **Triggers**: Global window-wide trigger during the onboarding experience.
