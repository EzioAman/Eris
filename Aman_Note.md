```Take Reference when needed, all links are here, custo made by Aman Sinha ```

1. https://reactnativereusables.com/docs/blocks/authentication/sign-in-form
2. https://reactnativereusables.com/docs/blocks/authentication/sign-up-form
3. https://reactnativereusables.com/docs/blocks/authentication/verify-email-form
4. https://reactnativereusables.com/docs/blocks/authentication/reset-password-form
5. https://reactnativereusables.com/docs/blocks/authentication/forgot-password-form
6. https://reactnativereusables.com/docs/blocks/authentication/social-connections
7. https://reactnativereusables.com/docs/blocks/authentication/user-menu
8. https://reactnativereusables.com/docs/components/accordion
9. https://reactnativereusables.com/docs/components/alert
10. https://reactnativereusables.com/docs/components/alert-dialog
11. https://reactnativereusables.com/docs/components/aspect-ratio
12. https://reactnativereusables.com/docs/components/badge
13. https://reactnativereusables.com/docs/components/button
14. https://reactnativereusables.com/docs/components/card
15. https://reactnativereusables.com/docs/components/checkbox
16. https://reactnativereusables.com/docs/components/collapsible
17. https://reactnativereusables.com/docs/components/context-menu
18. https://reactnativereusables.com/docs/components/dialog
19. https://reactnativereusables.com/docs/components/dropdown-menu
20. https://reactnativereusables.com/docs/components/hover-card
21. https://reactnativereusables.com/docs/components/input
22. https://reactnativereusables.com/docs/components/label
23. https://reactnativereusables.com/docs/components/menubar
24. https://reactnativereusables.com/docs/components/popover
25. https://reactnativereusables.com/docs/components/progress
https://reactnativereusables.com/docs/components/radio-group
https://reactnativereusables.com/docs/components/select
https://reactnativereusables.com/docs/components/separator
https://reactnativereusables.com/docs/components/skeleton
https://reactnativereusables.com/docs/components/switch
https://reactnativereusables.com/docs/components/tabs
https://reactnativereusables.com/docs/components/text
https://reactnativereusables.com/docs/components/textarea
https://reactnativereusables.com/docs/components/toggle
https://reactnativereusables.com/docs/components/toggle-group
https://reactnativereusables.com/docs/components/tooltip
https://magicui.design/docs/components/animated-beam
https://magicui.design/docs/templates/startup (try to design like this)
https://magicui.design/docs/components/progressive-blur
https://magicui.design/docs/components/border-beam
https://magicui.design/docs/components/aurora-text
https://magicui.design/docs/components/video-text
https://magicui.design/docs/components/animated-shiny-text
https://magicui.design/docs/components/text-animate
https://magicui.design/docs/components/dia-text-reveal (really good for onboarding)
https://magicui.design/docs/components/morphing-text (for showing greetings during system checks- done through api validation greeting message to llms)
https://magicui.design/docs/components/highlighter (REALLY IMPORTANT FOR ERIS)
https://magicui.design/docs/components/rainbow-button
https://magicui.design/docs/components/file-tree (Really important for ui)
https://magicui.design/docs/components/code-comparison
https://magicui.design/docs/components/scroll-progress
https://magicui.design/docs/components/comic-text (for custom texts eris can do sometime)
https://magicui.design/docs/components/interactive-hover-button (onbaording)
https://magicui.design/docs/components/animated-circular-progress-bar 
https://magicui.design/docs/mcp
https://github.com/seraui/seraui for updating the knowledge
https://reactnativereusables.com/


https://www.flaticon.com/style/search?word=  <"what you want to look for"> 
https://hugeicons.com/icons/stroke-rounded
https://icon-sets.iconify.design/

https://pixabay.com/sound-effects/search/ui/ For ui sounds

``` Notes: ```
cycles through the actual OS bootstrap stages: ❖ Consecrating Sanctuary... $\rightarrow$ 🔐 Securing Win32 Job Object... $\rightarrow$ ⚡ Establishing Loopback WebSocket... $\rightarrow$ ✨ Matrix Operational. This could be dynamic not just some random texts that humans won't understand, also search for beautiful icons.

DO NOT COPY learn and build a flow to add in the system, you can create the full Eris interface from scratch. But first every component must be addressed, delete the entire frontend which is not needed, and choose between your agent- gemini 3.8 flash for thinking/writing code and 3.1 pro for thinking/writing code.

Give one agent full power to search for other websites that create desktop applications like this and learn from them, no need for code right now, but create 2 files, instructions-detailed to every atom, 2. tech stack usage, what-where-when-which comes first-after that what comes-till the exit everything.

Choose each and every design carefully and prompt the Human agent to recreate the journey with updates. Be the harshest critic, but do not introduce AI slop, so he should be fed with proper instructions that was given before.


Do Not overload the UI with sound, confirm with me with a list of options which to add with the ability to show me the audio.


Self note

Key Upgrades Implemented
Embedded Vector Engine (sqlite-vec 0.1.9):

Running in-process inside 

memory/rag_vault.db
 with C-accelerated vector indexes.
Zero background daemons, zero external Docker dependencies, and zero open database ports.
768-Dimensional Dense Embeddings:

Powered by models/gemini-embedding-001 with outputDimensionality: 768.
All 14 initial chunks (workspace tools, pinned identity facts, and architecture guides) have been indexed into the vec_chunks virtual table.
Hybrid Search Architecture:

Combines 80% semantic vector cosine proximity + 20% BM25 lexical token overlap.
Stopwords (the, is, that, what, how, will) have been purged from lexical indexing so common grammatical fillers do not pollute scores.
Conceptual queries retrieve relevant tools even with zero keyword overlap (e.g., "I want to speak in Discord" retrieves 

join_vc_server.py
).
Security & Cost Guardrails:

SHA-256 Content Hash Caching: Chunks are hashed before embedding; unchanged files skip API calls entirely.
100% Graceful Offline Degradation: If network drops or the embedding API fails, 

rag_engine.py
 catches the exception and falls back to local BM25 without stalling or crashing.
AST-Based Harmful Code Guard: 

eris_cli.py
 now parses Python AST nodes to ensure safe tool docstrings explaining how to avoid dangerous commands are not falsely flagged.
Diagnostic Status
Engine:             sqlite-vec (C-Extension) [ACTIVE]
Embedding Model:    models/gemini-embedding-001 (768-dim)
Total Chunks:       14
Vector Chunks:      14 / 14
Storage:            memory/rag_vault.db
Search Strategy:    HYBRID (Semantic Vector + Lexical BM25)