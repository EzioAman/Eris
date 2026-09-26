import { useRef, useState, useCallback, useEffect } from "react";

// Attach `containerRef` to the scrollable message list.
//
// Two distinct notify calls, deliberately kept separate:
// - notifyStreamProgress(): call on every streaming-text chunk. Only auto-scrolls
//   while following; never touches the unseen counter (it's still the same
//   in-progress message, not a new one).
// - notifyNewMessage(count?): call once per fully-appended message. Increments
//   the unseen counter by `count` (default 1) when not following.
//
// `following` is read through a ref inside the callbacks so their identities
// stay stable across scroll events — otherwise a scroll-triggered `following`
// state change recreates the callback, which (if it's an effect dependency
// elsewhere) re-fires that effect with no new content behind it.

const NEAR_BOTTOM_PX = 60;

export function useSmartScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const followingRef = useRef(true);

  useEffect(() => {
    followingRef.current = following;
  }, [following]);

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setFollowing(true);
    setUnseen(0);
  }, []);

  // Stable identity — reads `following` via ref, not closure, so it never
  // changes just because the user scrolled.
  const notifyStreamProgress = useCallback(() => {
    const el = containerRef.current;
    if (!el || !followingRef.current) return;
    el.scrollTop = el.scrollHeight; // instant, not smooth — avoid fighting per-chunk smooth scrolls
  }, []);

  const notifyNewMessage = useCallback((count = 1) => {
    const el = containerRef.current;
    if (!el) return;
    if (followingRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setUnseen((n) => n + count);
    }
  }, []);

  return {
    containerRef,
    following,
    unseen,
    scrollToBottom,
    notifyStreamProgress,
    notifyNewMessage,
  };
}