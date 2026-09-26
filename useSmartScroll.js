import { useRef, useState, useCallback, useEffect } from "react";

// Attach `containerRef` to the scrollable message list. Call `notifyNewMessage()`
// every time a new message is appended (or content streams into the last one).
//
// Behavior:
// - While the user is scrolled near the bottom, new content auto-scrolls into view.
// - The moment the user scrolls away from the bottom, auto-follow stops and an
//   unseen counter starts climbing instead of yanking their view down.
// - `scrollToBottom()` (wire it to your "Jump to latest" pill) resumes following.

const NEAR_BOTTOM_PX = 60;

export function useSmartScroll() {
  const containerRef = useRef(null);
  const [following, setFollowing] = useState(true);
  const [unseen, setUnseen] = useState(0);

  const isNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    setFollowing(near);
    if (near) setUnseen(0);
  }, [isNearBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setFollowing(true);
    setUnseen(0);
  }, []);

  // Call this after appending a message or on each streamed chunk.
  const notifyNewMessage = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (following) {
      // instant, not smooth — smooth-scrolling on every streamed token fights itself
      el.scrollTop = el.scrollHeight;
    } else {
      setUnseen((n) => n + 1);
    }
  }, [following]);

  return { containerRef, following, unseen, scrollToBottom, notifyNewMessage };
}

// --- usage sketch ---
//
// function ChatPanel({ messages }) {
//   const { containerRef, following, unseen, scrollToBottom, notifyNewMessage } = useSmartScroll();
//
//   useEffect(() => { notifyNewMessage(); }, [messages, notifyNewMessage]);
//
//   return (
//     <div style={{ position: "relative" }}>
//       <div ref={containerRef} style={{ overflowY: "auto", height: 420 }}>
//         {messages.map(m => <Message key={m.id} {...m} />)}
//       </div>
//       {!following && (
//         <button onClick={() => scrollToBottom()}>
//           ↓ Jump to latest {unseen > 0 && <span>{unseen}</span>}
//         </button>
//       )}
//     </div>
//   );
// }
