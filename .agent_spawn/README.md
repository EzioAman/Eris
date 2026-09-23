# Eris Agent Spawn Directory (`.agent_spawn/`)

This directory contains standardized agent personas, execution mandates, and evaluation rubrics. Every agent spawned during development must read and strictly adhere to their designated persona file before taking action.

## Agent Directory Map

| Agent File | Persona | Focus Area |
| :--- | :--- | :--- |
| [template.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/template.md) | **Agent Template** | Blueprint for creating any new agent persona and rubric |
| [ux_architect.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/ux_architect.md) | **Deep UX Architect** | 11/10 TUI standards, progressive disclosure, clean badge layouts, fast paths |
| [software_dev_critic.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/software_dev_critic.md) | **Software Dev Critic** | End-to-end execution, multi-tier persistence, ACL/permission resilience, error recovery |
| [security_red_teamer.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/security_red_teamer.md) | **Security Red Teamer** | Adversarial exploit testing, path traversal containment, secret isolation, loop defense |
| [docs_researcher.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/docs_researcher.md) | **Documentation Researcher** | Gathering official vendor specs, updating `doc/`, verifying API parameters |

---

## How to Spawn a New Agent
1. Copy [template.md](file:///e:/All%20Projects%20and%20Editors/ERIS/.agent_spawn/template.md) to `.agent_spawn/<agent_name>.md`.
2. Define the Agent's Name, Role, and Mindset.
3. Establish non-negotiable principles and core mandates.
4. Define a numerical or checklist scorecard for evaluation.
5. Have the sub-agent review the file before beginning execution.
