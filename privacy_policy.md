# ERIS Privacy Policy & Local Data Notice

**Effective Date:** September 19, 2026  
**Project:** ERIS Autonomous AI Workstation (Free & Open Source Software)  
**Lead Developer:** Aman Sinha (`sinhadeep2409@gmail.com`)  
**Official Contact:** `eris.ai.official@gmail.com`  

---

## 1. Core Principle: Zero Server-Side Data Collection
ERIS is developed and distributed as a **local-first desktop application**. Unlike software-as-a-service (SaaS) platforms, ERIS does **not** maintain central telemetry servers, user accounts databases, tracking beacons, or cloud logging infrastructure.

* **We do not collect your personal data.**
* **We do not harvest your conversation histories, code, or prompts.**
* **We do not track your IP address or hardware fingerprint.**
* **We do not sell, rent, monetize, or train foundation models on your data.**

All conversations, embeddings, user profiles, learned habits, and logs reside exclusively on **your local machine** in your local SQLite databases (`memory/auth.db`, `memory/rag_vault.db`) and user filesystem.

---

## 2. Age of Majority & Minor Use Policy (18+ Requirement)
* **Mandatory Age Requirement**: You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to install, run, or use ERIS.
* **Minors and Parental Oversight**: ERIS is not designed for or directed to children under 13 years of age (COPPA), under 16 years of age (GDPR), or any applicable age threshold under Indian DPDPA. If a minor operates ERIS, their legal guardian assumes full oversight.

---

## 3. Third-Party Model Providers & Direct Network Connections
To utilize cloud-based Large Language Models (such as Google Gemini, OpenRouter, Groq, OpenAI, or Anthropic), you supply your own API keys:
1. **Local Encryption**: All API keys are encrypted locally using AES-256 and stored in your local SQLite database (`auth.db`).
2. **Direct-to-Provider Transmission**: Prompts establish a direct, encrypted HTTPS connection directly from your device to the designated model provider's API endpoint.
3. **Zero Intermediary Proxy**: Communications do not route through any server operated by Developer Aman Sinha.
4. **Google User Data**: If using Google OAuth for authentication via Supabase, Google user profile information (email, name, avatar) is used solely to authenticate your local session and populate your local profile. We do not transfer or disclose your Google user data to any external marketing parties.

---

## 4. Local Web Scraping & Browser Automation
When using web search or browser tools (`read_url_content`, Playwright web browser), network requests originate directly from your local machine's IP address to target websites. Developer Aman Sinha does not direct, monitor, or log any scraping or browsing activities.

---

## 5. User Data Ownership & Deletion
Because all records are stored locally on your device:
* **Instant Deletion**: You can purge all memory, conversations, and keystore records at any time directly within ERIS by clicking **Settings > Clear All Local Data**, or by deleting the `memory/` directory on your disk.
* **No Cloud Residue**: Once deleted from your local storage, your data is permanently gone.

---

## 6. Contact & Inquiries
For security audits, responsible disclosures, or questions regarding this Privacy Policy:
* **Developer Email**: `sinhadeep2409@gmail.com`
* **Official Support Email**: `eris.ai.official@gmail.com`
* **GitHub Repository**: [https://github.com/EzioAman/ERIS](https://github.com/EzioAman/ERIS)
