# Global Legal Liability & Jurisdictional Audit for ERIS
**Auditor Persona**: Senior International Technology Trial Attorney & FOSS Licensing Jurist  
**Target Entity**: ERIS Autonomous AI Workstation  
**Author / Developer**: Aman Sinha (and future open-source contributors)  
**Date**: September 2026  

---

## 1. Executive Summary & Threat Model

ERIS is an open-source, local-first autonomous AI workstation. It features shell command execution (`RUN_COMMAND`), file manipulation (`write_to_file`), web scraping, and third-party LLM API routing.

### Core Legal Risks Identified:
1. **System Damage & Data Destruction**: The agent executes commands that delete files, overwrite code, or corrupt databases.
2. **Third-Party API Billing Shock**: The agent enters an uncontrolled reasoning loop, consuming thousands of dollars in user API tokens.
3. **Regulatory / Minor Exposure**: Users under 18 (or under 13) operating software without guardian consent, triggering COPPA, GDPR-K, or Indian DPDPA compliance actions.
4. **Third-Party Copyright & Content Infringement**: Scraped content or AI-generated output infringing third-party IP.
5. **Computer Fraud / Network Abuse (CFAA / IT Act)**: Automated network requests, security scans, or web requests interpreted as unauthorized access or DDoS.
6. **Statutory Invalidation of "Zero Liability" Clauses**: In jurisdictions like the EU (Product Liability Directive), UK (UCTA 1977), and Germany (BGB), blanket disclaimers stating "Developer is not responsible for ANYTHING" can be voided if not drafted with severability and "maximum extent permitted by law" qualifiers.

---

## 2. Multi-Jurisdictional Statutory Analysis

### A. United States
* **Computer Fraud and Abuse Act (18 U.S.C. § 1030)**:
  - *Risk*: If ERIS executes network commands or security scans against third parties.
  - *Defense*: ERIS terms must stipulate that the user is the sole initiator of all network operations and warrants they possess authorized access to all target hosts.
* **Uniform Commercial Code (UCC) § 2-316**:
  - *Requirement*: Disclaimers of Merchantability and Fitness for a Particular Purpose MUST be conspicuous (ALL-CAPITALS, prominent font).
* **COPPA (15 U.S.C. §§ 6501–6506)**:
  - *Shield*: The software does not collect personal data from children under 13, and requires users to be of legal age of majority (18+).

### B. European Union
* **EU AI Act (Regulation (EU) 2024/1689)**:
  - *Open-Source Exemption (Recital 102 & Article 2(12))*: FOSS AI released under free and open-source licenses is largely exempt from general-purpose AI requirements provided it is non-monetized and does not present systemic risks.
  - *Requirement*: The license must expressly preserve its FOSS nature without proprietary paywalls.
* **GDPR (Regulation (EU) 2016/679)**:
  - *Data Controller Shield*: Developer Aman Sinha runs **zero servers** and collects **zero telemetry**. The user is the sole Data Controller of their own local `auth.db` and workstation files.
* **EU Product Liability Directive (PLD 2024 Revision)**:
  - Non-commercial open-source software developed outside the course of a commercial activity is protected from strict product liability regimes.

### C. India
* **Information Technology Act, 2000 (Sections 43, 66, 79)**:
  - Protection against unauthorized computer system alteration. The terms must establish that all executions occur on the user's own computer at the user's voluntary direction.
* **Digital Personal Data Protection Act, 2023 (DPDPA)**:
  - Because no digital personal data is processed by Developer servers, ERIS qualifies as a local offline computing tool with zero Data Fiduciary obligations on Developer Aman Sinha.

### D. United Kingdom
* **Unfair Contract Terms Act 1977 (UCTA) & Consumer Rights Act 2015**:
  - Under English law, liability for death or personal injury resulting from negligence cannot be excluded. A blanket clause saying "not liable for anything" can invalidate the entire contract.
  - *Remedy*: Use the standard severability clause: *"Nothing in this agreement excludes or limits liability for fraud, death, or personal injury caused by negligence, or any liability which cannot be excluded under applicable law."*

---

## 3. The 6-Point Bulletproof Legal Shield Architecture

To provide Developer Aman Sinha with maximum legal immunity worldwide:

1. **License**: **Apache License 2.0** with strict Section 8 (Limitation of Liability) and Section 9 (Accepting Warranty or Additional Liability) clauses.
2. **Autonomous Tool Execution Hold-Harmless Rider**:
   - The user acknowledges ERIS is non-deterministic and can produce errors.
   - The user acts as the sole human supervisor ("Human-in-the-Loop") with final veto authority on all tool approvals (`RUN_COMMAND`, file modifications, emails).
3. **Age of Majority & Capacity Warranty**:
   - The user expressly warrants and represents that they are at least 18 years old and possess full legal capacity to enter into binding agreements.
4. **Third-Party API & Financial Disclaimer**:
   - All API keys, token expenditures, rate limits, and compliance with model providers (Google Gemini, OpenAI, Anthropic, OpenRouter) are strictly between the user and said providers. Developer has zero intermediary presence.
5. **Zero Server / Zero Telemetry Privacy Policy**:
   - A crystal-clear privacy policy establishing that ERIS transmits zero user data to Developer Aman Sinha.
6. **Severability & Jurisdiction**:
   - Any dispute shall be governed by applicable laws with mandatory informal resolution and severability so that if one clause is challenged, all other liability shields remain fully intact.
