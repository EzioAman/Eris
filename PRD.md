# Eris — Product Requirements Document

Version: 0.1.0

Status: Development Specification

Platform: Windows 11

Primary Language: Python 3.14

Product Type: Autonomous Desktop AI Agent

---

# 1. Product Vision

Eris is a highly autonomous, human-like AI assistant for Windows.

Eris should not be designed as a simple chatbot, voice assistant, or collection of hardcoded commands. She should operate as an extensible agent capable of understanding goals, planning work, using tools, learning from previous executions, creating new capabilities when required, verifying her work, recovering from failures, and communicating naturally with the user.

The fundamental principle is:

**Eris should be capable of growing without requiring her core architecture to be rewritten.**

LLMs, providers, tools, integrations, interfaces, and capabilities are replaceable components.

Eris Core remains the stable foundation.

Eris should have no artificial capability ceiling. Future capabilities such as Discord voice-channel interaction, additional communication systems, gaming integrations, smart-home control, and other capabilities must be addable through extensions without requiring fundamental Core redesign.

---

# 2. Core Principles

## 2.1 Provider Independence

Eris must not depend on a single AI provider.

There must be:

* No hardcoded default LLM provider.
* No hardcoded default model.
* No provider-specific logic inside Eris Core.
* No API keys inside source code.
* No hardcoded provider credentials.
* No assumptions that a cloud provider is available.
* No assumption that an internet connection exists.
* No hardcoded model selection.
* No provider-specific behavior scattered throughout the application.

The user selects an available provider during initial setup.

Available providers must be dynamically discovered from installed/configured provider adapters.

The provider system must use an abstraction similar to:

```text
Eris Core
    ↓
LLM Provider Interface
    ↓
Provider Adapter
    ↓
Actual LLM
```

Possible providers may include:

* Cloud APIs
* Local models
* Self-hosted models
* OpenAI-compatible servers
* Custom LLM servers
* Future providers

Eris should not care which implementation is underneath the interface.

---

# 3. State-Driven Architecture

Eris must be fundamentally state-driven.

Behavior must be derived from runtime state, configuration, available capabilities, permissions, environment information, memory, and current task context.

The system must avoid arbitrary hardcoded behavior wherever dynamic state can determine the correct behavior.

This applies to:

* Providers
* Models
* Tools
* Capabilities
* Permissions
* Tasks
* Agent state
* User preferences
* Personality
* Configuration
* Memory
* Dashboard information
* Execution flows

Hardcoded constants may exist where technically required by the operating system, protocol, security model, or application specification, but application behavior must not be artificially constrained by hardcoded provider/model/tool assumptions.

---

# 4. Initial User Experience & UI Flow

The first launch of Eris should guide the user through a seamless onboarding process and transition them into the new glassmorphic Command Center. 

## The Awakening (Launch & Onboarding)
When Eris is launched, the user is presented with a cinematic Hero Section displaying the tagline: **"Ideas flow better with you. A calmer tomorrow, together."** 

### Initial Flow
```text
Launch Eris (.exe)
    ↓
Hero Section Loading (Dark Glassmorphism)
    ↓
Environment Validation & Security Validation (Background)
    ↓
Provider Selection Modal (e.g., Claude 3.5 Sonnet vs Local)
    ↓
Eris Initialization
    ↓
Desktop Interface (Command Center)
```

## The Command Center (Main View)
The primary interface is a dynamic dashboard designed for high engagement and deep focus.
- **Top Bar**: Search anything (cmd+k), Notifications, and User Profile.
- **Sidebar**: Animated navigation including Home, Chat, Agents, Playground, Workflows, Knowledge, Library, Analytics, Providers, and Settings (MVP implements minimum required sections).

## Agent Assembly (AI Agents Grid)
Users can select specialized agents from a horizontal grid:
- **Researcher**: Deep research & analysis
- **Writer**: Draft, rewrite, brainstorm
- **Analyst**: Data analysis & insights
- **Coder**: Build, debug, explain
- **Vision**: Image & video understanding
Users can see the live status of each agent (e.g., Online/Idle) seamlessly.

## The Vault & Workshop
- **Recent Projects**: Quick access to recent workspaces.
- **Knowledge Vault**: Manage ingested documents, links, and datasets.
- **Workflow Templates**: Pre-configured chains like "Deep Research" or "Content Creation".

## The Pulse (Right Panel)
This is the real-time observability center of Eris.
- **System Status**: Displays uptime, providers active, and avg latency.
- **Current Activity Feed**: Shows both LangGraph agent state events and system-level Windows OS telemetry. *The user has full control to view all running processes and toggle whether Eris runs tasks in the Sandbox or the native Windows Terminal.*
- **Ambient Mode**: A focus player integrated with third-party audio (e.g., Spotify, local MP3s) to provide a calming environment (e.g., "A Moment in Teyvat").

## The Converse (Bottom Input)
A persistent, floating input field ("Ask ERIS anything...") allows the user to issue commands from any screen, with a dropdown to select the active model provider on the fly.

---

# 5. Security Architecture

Security is part of Eris Core and must not be implemented as an optional plugin.

Security must be enforced through deterministic application logic rather than through LLM instructions.

The LLM is never the final authority for security.

The system must support:

* Authentication
* Authorization
* Owner identities
* Session management
* Credential validation
* Tool permissions
* Capability permissions
* Sensitive-operation confirmation
* Audit logging
* Secure secret storage
* Permission escalation
* Session expiration
* Emergency shutdown
* Default-deny authorization
* Security event logging
* Permission boundaries
* Code execution controls

Security boundaries must be technically enforced rather than merely documented.

---

# 6. Eris Owners

Eris has two designated owners:

* Aman Sinha
* Vibhas Dutta

Owner privileges are fundamentally different from ordinary user privileges.

Owner authentication must require secure authentication.

Identity must never be established merely because someone claims to be an owner.

The initial development credential supplied during development is a temporary bootstrap credential and must never be hardcoded into the application, committed to Git, displayed in logs, or shipped as part of the executable.

Owner authentication should eventually support stronger mechanisms such as:

* Windows authentication
* Hardware-backed credentials
* Passkeys
* MFA
* Cryptographic identity

Owner privileges may include:

* Modifying Eris Core
* Installing capabilities
* Removing capabilities
* Modifying security policies
* Changing provider architecture
* Modifying agent behavior
* Approving privileged code
* Managing Eris configuration

Even owners should receive explicit warnings before destructive or irreversible operations.

---

# 7. Security Policy Hierarchy

Every operation must have a risk classification.

## Level 0 — Read Only

Examples:

* Read agent status
* Read task status
* View non-sensitive logs
* View system health

## Level 1 — Low Risk

Examples:

* Start a normal task
* Stop a task
* Change non-sensitive UI settings
* Inspect installed tools

## Level 2 — Sensitive

Examples:

* Access protected memory
* Install a capability
* Execute a newly generated tool
* Modify configuration
* Access sensitive filesystem locations

## Level 3 — High Risk

Examples:

* Delete files
* Execute arbitrary commands
* Modify startup behavior
* Install software
* Modify permissions
* Access credentials
* Modify security configuration

## Level 4 — Core / Security Critical

Examples:

* Modify Eris Core
* Modify authentication
* Modify authorization
* Modify security policies
* Modify provider abstraction
* Modify tool sandboxing
* Disable security controls

Level 4 operations require an authenticated owner and an explicit privileged session.

---

# 8. Default-Deny Security

Eris follows a **default-deny** security model.

If the permission system cannot establish that an operation is permitted, the operation is denied.

The LLM cannot grant itself permission.

A tool cannot grant itself permission.

A generated tool cannot grant itself permission.

The Dashboard cannot bypass Core authorization.

Only the security subsystem can authorize an operation.

---

# 9. LLM Authority

The LLM is a reasoning component, not the security authority.

The LLM may:

* Request a tool
* Request permission
* Propose code
* Propose a plan
* Request information
* Recommend an action

The LLM may not:

* Grant itself permissions
* Authenticate itself
* Declare itself an owner
* Modify security policies
* Access secrets directly
* Bypass tool restrictions
* Modify Core without owner authorization
* Override application security policies

Security decisions must be made outside the model.

---

# 10. Protected Core

Eris Core is the foundation of the system.

Normal autonomous operation must never be able to modify Core.

Self-modification is restricted to explicit owner-authorized sessions.

The Core should contain:

* Agent runtime
* State management
* Security system
* Permission system
* Provider abstraction
* Tool registry
* Memory interface
* Configuration system
* Event system
* Execution system
* Extension boundary

Eris-created tools must live outside Core.

Conceptually:

```text
ERIS CORE
├── Agent Runtime
├── State Engine
├── Security
├── Permissions
├── Provider Interface
├── Memory Interface
├── Tool Registry
├── Event System
└── Extension System

EXTENSIONS
├── tools/
├── capabilities/
├── integrations/
└── providers/
```

This boundary must be enforced technically.

---

# 11. Agent Architecture

Eris should operate as a stateful agent rather than a request/response chatbot.

The agent should support:

```text
Observe
  ↓
Understand
  ↓
Plan
  ↓
Act
  ↓
Observe Result
  ↓
Evaluate
  ↓
Continue / Correct / Recover
  ↓
Verify
  ↓
Respond
```

The exact path must be dynamically determined by the current task and state.

The agent must be able to manage:

* Goals
* Tasks
* Subtasks
* Plans
* Tool calls
* Tool results
* Errors
* Retries
* User interaction
* Approvals
* Memory
* Execution history
* State transitions
* Verification
* Recovery

LangGraph may provide the underlying orchestration mechanism, while Eris maintains its own domain-level abstractions.

---

# 12. Human-Like Interaction

Eris should communicate naturally.

The goal is not merely technically correct responses.

Interaction should feel conversational and context-aware.

Eris should:

* Understand conversational context.
* Ask for clarification when genuinely necessary.
* Avoid unnecessary questions.
* Explain important actions.
* Report progress naturally.
* Detect when the user interrupts.
* Recover from mistakes.
* Remember relevant context.
* Adapt communication style.
* Maintain a consistent personality.
* Avoid repetitive robotic responses.
* Distinguish between casual conversation and execution requests.
* Understand conversational references to previous tasks.
* Maintain appropriate awareness of the current environment.

Interaction should prioritize natural human-computer interaction rather than command-oriented behavior.

---

# 13. Eris Personality

Eris should have a persistent personality layer.

Personality should define characteristics such as:

* Communication style
* Formality
* Humor
* Confidence
* Conciseness
* Emotional expression
* Interaction preferences
* User relationship
* Behavioral constraints

Personality must be represented as configuration/state rather than scattered hardcoded strings throughout the application.

Eris should be able to evolve her behavior through controlled configuration changes while preserving security boundaries.

Personality must never override security policy.

---

# 14. Wake Word

The wake word is:

**"Eris"**

The voice pipeline should support:

```text
Microphone
    ↓
Wake-word Detection
    ↓
Speech Recognition
    ↓
Eris Agent
    ↓
Tool Execution
    ↓
Response Generation
    ↓
Text-to-Speech
```

Voice should remain an extension of the core interaction system rather than being tightly coupled to the agent.

---

# 15. Tool Architecture

Tools are first-class capabilities.

A tool should have structured metadata including:

* Name
* Description
* Version
* Input schema
* Output schema
* Permissions
* Dependencies
* Risk level
* Creator
* Creation timestamp
* Modification history
* Validation status
* Execution status
* Compatibility information

Tools must be dynamically discoverable.

Eris must never need to have every possible capability built in.

---

# 16. Tool Permission Model

Every tool must declare its required permissions.

Examples:

```text
filesystem.read
filesystem.write
process.read
process.execute
network.request
browser.control
credential.access
core.modify
```

A tool requesting a permission not declared in its manifest must be rejected.

Generated tools receive restricted permissions initially.

Permissions can only be expanded through the authorization system.

---

# 17. Self-Created Tools

One of Eris's defining capabilities is the ability to create new tools.

When Eris receives a task and determines that an appropriate capability does not exist:

```text
User Goal
    ↓
Capability Discovery
    ↓
Capability Missing
    ↓
Design Tool
    ↓
Generate Code
    ↓
Static Validation
    ↓
Dependency Analysis
    ↓
Security Analysis
    ↓
Sandboxed Testing
    ↓
Functional Testing
    ↓
Permission Evaluation
    ↓
Register Tool
    ↓
Execute
    ↓
Verify Result
```

The generated tool is stored in the extension system.

Example:

```text
tools/
    generated/
        tool_name/
            tool.py
            manifest.json
            tests/
            README.md
```

When the same capability is required again, Eris should discover and reuse the existing tool rather than recreate it.

Generated tools must never directly modify Eris Core.

---

# 18. Generated Tool Trust Model

Newly generated tools are untrusted until validated.

Required lifecycle:

```text
GENERATED
    ↓
UNTRUSTED
    ↓
STATIC ANALYSIS
    ↓
DEPENDENCY ANALYSIS
    ↓
SECURITY ANALYSIS
    ↓
SANDBOX TEST
    ↓
FUNCTIONAL TEST
    ↓
POLICY EVALUATION
    ↓
REGISTERED
    ↓
AVAILABLE
```

Generated tools must not automatically receive unrestricted system access.

Every generated tool must have an auditable origin and version history.

---

# 19. Self-Coding System

Eris must be capable of reasoning about software tasks and producing code.

Code generation should not immediately modify files.

The preferred workflow is:

```text
Understand
    ↓
Inspect Existing Code
    ↓
Determine Required Change
    ↓
Generate Modification
    ↓
Generate Diff
    ↓
Validate
    ↓
Test
    ↓
Apply
    ↓
Verify
```

Code changes should use a diff-oriented representation similar to modern coding agents:

```diff
- old code
- old code
+ new code
+ new code
```

The original version must remain recoverable.

Every autonomous code modification should produce:

* Diff
* Reason
* Files affected
* Validation result
* Test result
* Execution result
* Rollback information
* Parent task
* Timestamp

---

# 20. Code Execution Security

Arbitrary generated code must not execute directly inside the primary Eris process where isolation is technically practical.

Generated code should execute through an isolated execution boundary.

The implementation must consider:

* Filesystem restrictions
* Network restrictions
* Process restrictions
* Credential access
* Resource limits
* Timeouts
* Dependency controls
* Core protection

The exact isolation mechanism will be selected during implementation after the Windows threat model and available technologies are evaluated.

---

# 21. Owner Core Modification

Only authenticated owners can authorize Core modification.

Owner-authorized Core modification should use the same disciplined workflow:

```text
Owner Authentication
    ↓
Privilege Escalation
    ↓
Requested Core Change
    ↓
Code Inspection
    ↓
Proposed Diff
    ↓
Security Validation
    ↓
Tests
    ↓
Backup / Checkpoint
    ↓
Apply
    ↓
Restart / Reload
    ↓
Health Check
```

Core changes should be version controlled through Git.

A failed Core update must be recoverable.

Every privileged Core modification must produce an audit record.

---

# 22. Memory

PostgreSQL is the initial persistent memory system.

Memory should not simply be a database dump of conversations.

The memory architecture should distinguish between:

```text
User Memory
Conversation Memory
Task Memory
Experience Memory
Tool Memory
System State
Execution History
Preferences
Knowledge
Audit History
```

PostgreSQL provides durable structured storage.

pgvector may later be used for semantic retrieval.

The memory layer should be exposed to Eris through an abstraction so the underlying storage can evolve.

Supabase will remain optional and unused during the initial development phase.

---

# 23. Event and State System

Everything important Eris does should generate structured events.

Examples:

```text
agent.started
agent.thinking
agent.planning
agent.state_changed

tool.discovered
tool.started
tool.completed
tool.failed

memory.read
memory.write

provider.discovered
provider.selected
provider.request
provider.response
provider.failed

permission.requested
permission.granted
permission.denied

code.generated
code.validated
code.applied
code.rollback

task.started
task.completed
task.failed
task.cancelled

authentication.success
authentication.failure

owner.session.started
owner.session.ended

security.policy.changed
emergency.stop
```

This event system powers:

* Dashboard
* Logging
* Audit system
* Metrics
* Diagnostics
* Future integrations

---

# 24. Event Architecture

The Dashboard and other observability components should consume Eris's event system.

```text
Eris Core
    ↓
Event Bus
    ├── Dashboard
    ├── Logger
    ├── Audit System
    ├── Metrics
    └── Future Integrations
```

The Dashboard should not continuously poll the entire database to determine what Eris is doing.

Real-time state should be event-driven.

Persistent history can be retrieved separately.

---

# 25. Runtime State Model

Eris should expose a structured runtime state.

Conceptually:

```text
ErisState
├── identity
├── session
├── agent
│   ├── status
│   ├── goal
│   ├── task
│   └── state
├── planning
├── execution
├── tools
├── memory
├── provider
├── security
├── system
└── errors
```

The Dashboard renders this state.

The Dashboard must not determine or fabricate the state itself.

---

# 26. Development Dashboard

A development-only dashboard should be built early enough to make Eris diagnosable.

It is not part of the initial shipping product.

The Dashboard is a development and administration interface.

Its purpose is to make Eris:

* Observable
* Diagnosable
* Controllable
* Debuggable
* Testable

If the Dashboard crashes, Eris must continue operating.

If the Dashboard is unavailable, Eris Core must continue operating.

The Dashboard must never become a dependency of Eris Core.

---

# 27. Desktop Dashboard Architecture

The development desktop application should be structured approximately as:

```text
┌─────────────────────────────────────────────┐
│                 ERIS DESKTOP                │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │            PySide6 Shell             │  │
│  │                                       │  │
│  │ Chat │ Tasks │ Trace │ Graph │ Tools │  │
│  │ Memory │ Providers │ Security │ Logs │  │
│  └───────────────────┬───────────────────┘  │
│                      │                      │
│              Dashboard Client               │
└──────────────────────┼──────────────────────┘
                       │
                 Authenticated IPC
                       │
┌──────────────────────▼──────────────────────┐
│              ERIS SERVICE LAYER             │
│                                             │
│ Dashboard API                               │
│ Event Stream                                │
│ State Query API                             │
│ Control API                                 │
│ Authentication                              │
│ Authorization                               │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                  ERIS CORE                  │
│                                             │
│ Agent │ State │ Tools │ Memory │ Security   │
│ LLM   │ Events│ Tasks │ Config │ Runtime   │
└─────────────────────────────────────────────┘
```

The exact IPC mechanism is an implementation decision and must be evaluated before implementation.

The architectural requirement is that the Dashboard communicates through controlled interfaces rather than directly manipulating Core internals.

---

# 28. Dashboard Modules

The Dashboard should contain independent modules.

## Overview

Displays:

* Eris status
* Current task
* Current state
* Active provider
* Active model
* Connected services
* CPU
* RAM
* Process information
* Errors
* Warnings
* Security status

## Live Execution

Displays the current task as a structured execution trace.

Example:

```text
TASK
"Organize my Downloads"

UNDERSTAND
✓ Goal understood

PLAN
✓ Filesystem inspection
✓ Categorization
→ Duplicate detection
○ Organization
○ Verification

CURRENT STATE
Executing

CURRENT TOOL
filesystem.scan

STATUS
Running...
```

## State Graph

Displays the actual runtime state graph.

The graph must be generated from runtime state.

It must not be a fake animation representing predetermined states.

## Task Graph

Displays:

```text
Goal
├── Task
│   ├── Subtask
│   ├── Subtask
│   └── Verification
└── Final Verification
```

Nodes should contain relevant:

* State
* Duration
* Status
* Events

## Tool Monitor

Displays:

* Installed tools
* Generated tools
* Tool versions
* Tool status
* Dependencies
* Permissions
* Risk level
* Usage count
* Last execution
* Failures
* Validation state

## Provider Monitor

Displays:

* Available providers
* Provider status
* Selected provider
* Available models
* Model capabilities
* Connection status
* Latency
* Request statistics
* Errors

API keys must never be displayed.

## Memory

Displays:

* Memory categories
* Recent memory operations
* Retrieval events
* Memory relationships
* Storage status
* Database health

Sensitive memory contents require appropriate authorization.

## Code Changes

Displays Eris-generated changes using diffs.

```diff
FILE: tools/example/tool.py

- old implementation
+ new implementation
+ additional validation
```

The developer should be able to inspect:

* Why the change was generated
* Which task caused it
* Which files changed
* Validation results
* Tests
* Execution results
* Rollback checkpoint

## Security

Displays:

* Current identity
* Session level
* Active permissions
* Pending approvals
* Recent privileged actions
* Security events
* Blocked actions
* Authentication events

## Logs

Displays structured logs with:

* Timestamp
* Severity
* Component
* Correlation ID
* Task ID
* Event type
* Message
* Duration
* Error details

Secrets must be automatically redacted.

---

# 29. Dashboard Interaction Model

The Dashboard must not be a collection of buttons directly connected to arbitrary Python functions.

Every control operation must become a structured request.

Example:

```text
Dashboard
    ↓
Control Request
    ↓
Authentication
    ↓
Authorization
    ↓
Policy Evaluation
    ↓
Core Action
    ↓
Event
    ↓
Dashboard Update
```

Example:

```text
[Stop Task]
      ↓
request.task.cancel
      ↓
Is user authorized?
      ↓
Is cancellation permitted?
      ↓
Cancel task
      ↓
task.cancelled
      ↓
Dashboard updates
```

This creates one security boundary for UI actions and future external clients.

---

# 30. Dashboard Authentication

Being able to open the Dashboard does not automatically mean being authorized to control Eris.

The system must authenticate the operator separately.

Conceptual hierarchy:

```text
Unauthenticated
      ↓
Authenticated User
      ↓
Trusted User
      ↓
Owner
      ↓
Privileged Owner Session
```

Roles should remain configurable.

---

# 31. Structured Execution Trace

The Dashboard may expose detailed execution information for development.

It must expose **structured execution traces rather than raw hidden chain-of-thought**.

The trace may contain:

* Goal
* Current state
* Plan representation
* Selected action
* Tool selection
* Tool arguments where safe
* Tool result summaries
* Observations
* Validation
* Errors
* Retry decisions
* Permission decisions
* Timing
* State transitions

Sensitive information must be redacted.

Raw private model chain-of-thought must not be persisted or displayed.

The distinction must remain clear between:

```text
Reasoning Metadata
```

and:

```text
Private Model Reasoning
```

---

# 32. Graph Visualization

The Dashboard should include graph-based visualization.

Potential views:

## Agent State Graph

```text
START
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
EXECUTE
  ↓
OBSERVE
  ↓
VERIFY
  ↓
COMPLETE
```

The actual graph should be generated dynamically from runtime behavior.

## Task Graph

```text
Main Goal
├── Task A
│   ├── Subtask A1
│   └── Subtask A2
├── Task B
└── Verification
```

## Tool Graph

```text
Agent
 ├── Browser
 ├── Filesystem
 ├── Windows
 ├── Terminal
 └── Generated Tools
```

The Dashboard should make it possible to identify exactly where a task failed.

---

# 33. Diagnostics Philosophy

A primary development requirement is:

**If Eris fails, the developer must be able to determine why.**

The system should avoid opaque execution.

Every significant operation should have:

* Timestamp
* Component
* State
* Input metadata
* Output metadata
* Duration
* Result
* Error
* Parent task
* Correlation ID

Sensitive information must be redacted.

API keys, passwords, tokens, and other secrets must never appear in logs or dashboard traces.

---

# 34. Audit System

Security-sensitive events must be auditable.

Examples:

```text
authentication.success
authentication.failure
owner.session.started
owner.session.ended

permission.requested
permission.granted
permission.denied

tool.permission.changed
tool.executed
tool.blocked

code.generated
code.approved
code.rejected

core.change.requested
core.change.applied
core.change.rollback

security.policy.changed
emergency.stop
```

Audit records should be append-oriented and protected from normal tool modification.

---

# 35. Secret Policy

Secrets include:

* API keys
* Passwords
* Session tokens
* OAuth credentials
* Encryption keys
* Database credentials
* Windows credentials
* Provider credentials

Rules:

1. Never hardcode secrets.
2. Never commit secrets to Git.
3. Never log secrets.
4. Never display secrets in the Dashboard.
5. Never send secrets to an LLM.
6. Never expose secrets to tools unless strictly required.
7. Store secrets through an appropriate secure mechanism.
8. Redact secrets from diagnostic output.
9. Rotate compromised credentials.
10. Treat development credentials as temporary.

---

# 36. Owner Authentication

Owner identity must be established through authentication.

The system must not trust:

```text
"I am Aman."
```

Identity must come from authentication.

Owner operations should establish a privileged session containing:

* Authenticated identity
* Session ID
* Expiration
* Privilege level
* Authentication timestamp
* Audit trail

Sensitive owner actions should require re-authentication where appropriate.

---

# 37. Core Modification Security

Core modification must always produce:

```text
WHO
WHAT
WHY
WHEN
FILES
DIFF
VALIDATION
TESTS
RESULT
ROLLBACK POINT
```

The previous Core version must remain recoverable.

Git should provide version history.

The system should create a checkpoint before applying a privileged Core modification.

---

# 38. Emergency Controls

The Dashboard should provide an emergency stop.

Emergency stop must be able to:

* Stop active agent execution
* Cancel pending tool calls where possible
* Prevent new tool execution
* Disable autonomous execution
* Preserve diagnostic state
* Record the emergency event

Emergency stop should remain available even when other Dashboard functionality is failing.

---

# 39. Failure Isolation

A failure in one subsystem must not automatically compromise the others.

Examples:

```text
Dashboard crash
→ Eris continues

LLM provider failure
→ Core continues

Tool failure
→ Agent continues/replans

Generated tool failure
→ Tool disabled

Database failure
→ Eris enters degraded mode

Voice failure
→ Text interaction remains available
```

The system should explicitly define degraded operating modes.

---

# 40. Dashboard Does Not Become a Backdoor

The Dashboard must not contain hidden privileged endpoints.

Every Dashboard action must pass through the same authorization system used by Eris.

There must be no mechanism such as:

```text
developer_mode = true
```

that bypasses security.

Development privileges must still be authenticated and auditable.

---

# 41. Plugin / Capability Architecture

Future functionality must be added through capabilities rather than modifications to Core whenever possible.

Examples:

```text
capabilities/
├── discord/
├── spotify/
├── browser/
├── gaming/
├── smart_home/
├── communication/
└── custom/
```

A capability may contain:

* Tools
* Configuration
* Authentication
* Dependencies
* UI components
* Tests
* Documentation

Eris should discover capabilities dynamically.

The architecture must not assume what future capabilities will exist.

Discord voice-channel interaction, for example, should be implementable later without redesigning the agent.

---

# 42. No Artificial Capability Ceiling

Eris must not be architecturally restricted to a predetermined list of tasks.

The system should support:

* New tools
* New providers
* New integrations
* New interfaces
* New memory systems
* New capabilities
* New automation methods

without requiring fundamental changes to Eris Core.

The extension architecture is therefore a first-class requirement.

---

# 43. Initial Desktop Application

Development should begin with the smallest viable desktop environment.

The first executable should provide:

* Eris startup
* Provider onboarding
* Secure authentication
* Basic conversation
* Agent state
* Basic tool execution
* Logging
* Development diagnostics
* PostgreSQL connectivity
* Configuration management

The system should then progressively gain capabilities.

The goal is to continuously run Eris as a Windows `.exe` during development rather than developing the entire system as a terminal-only application.

A TUI may exist for debugging, but the primary development environment should be the Windows desktop application.

---

# 44. Technology Stack

## Runtime

* Python 3.14
* uv
* Git

## Agent

* LangGraph
* LangChain Tools

## LLM

* Eris-owned provider abstraction
* Provider adapters
* OpenAI-compatible interfaces where useful
* FastAPI adapter for local/self-hosted models

There is no default provider or model.

## Backend

* FastAPI
* Uvicorn
* Pydantic

## Database

* PostgreSQL
* SQLAlchemy
* pgvector when semantic memory is introduced

## Windows

* pywin32
* psutil
* subprocess
* pathlib
* PyAutoGUI where GUI automation is required

## Browser

* Playwright

## Voice

* Wake-word engine with "Eris" as the configured wake word
* Speech-to-text provider abstraction
* Text-to-speech provider abstraction

## Desktop UI

* PySide6
* Qt/QML where advanced UI is required

## Testing

* pytest
* pytest-asyncio

## Packaging

* PyInstaller
* Inno Setup

## Observability

* Structured logging
* Eris Event System
* Development Dashboard
* Optional LangSmith integration

## Future

* Supabase
* Redis
* MCP
* Additional capability/plugin systems

These future technologies must remain optional and must not become architectural dependencies without a demonstrated requirement.

---

# 45. Project Documentation

A root-level `guide.md` file is mandatory.

It is the living technical record of Eris.

It should track:

* Current architecture
* Current MVP
* Completed work
* Current state
* Next step
* Decisions
* Reasons for decisions
* Dependencies
* Configuration
* Database state
* Provider architecture
* Tool architecture
* Known issues
* Failed approaches
* Testing status
* Security considerations
* File/module responsibilities
* Architectural changes

The document should be updated as development progresses.

It should answer:

**"What exists, where is it, why does it exist, what is currently happening, and what should happen next?"**

No important architectural decision should exist only inside conversation history.

---

# 46. MVP Roadmap

## MVP 0 — Foundation

Goal:

Create the protected architectural foundation.

Requirements:

* Project structure
* uv environment
* Git
* Configuration system
* Environment validation
* PostgreSQL connection
* Core boundaries
* Event system
* Logging
* `guide.md`
* Basic desktop shell
* Security foundation
* Dashboard foundation
* Provider-independent architecture

Success condition:

Eris launches as a Windows application and has a functioning architectural foundation without requiring an LLM provider.

---

## MVP 1 — Intelligence Core

Goal:

Make Eris capable of understanding and responding.

Requirements:

* Provider discovery
* Provider selection
* Credential entry
* Credential validation
* Provider abstraction
* Model discovery
* Agent runtime
* PostgreSQL state
* Conversation context
* Personality
* Basic desktop interaction
* Dynamic runtime state
* Basic execution trace

Success condition:

A user can configure any supported provider and interact with Eris without changing source code.

---

## MVP 2 — Tool-Using Eris

Goal:

Allow Eris to perform real tasks.

Requirements:

* Tool registry
* Tool discovery
* Tool schemas
* Permissions
* Windows tools
* Filesystem tools
* Process tools
* Browser tools
* Tool execution events
* Verification
* Error recovery
* Approval system
* Audit trail

Success condition:

Eris can complete useful multi-step Windows tasks rather than merely describing how to perform them.

---

## MVP 3 — Voice Eris

Goal:

Make Eris naturally accessible through voice.

Requirements:

* Wake word "Eris"
* Speech recognition
* Voice response
* Interruptions
* Conversation continuity
* Voice state tracking

Success condition:

A user can say "Eris" and naturally interact with her.

---

## MVP 4 — Self-Extending Eris

Goal:

Allow Eris to create new capabilities.

Requirements:

* Capability gap detection
* Tool design
* Code generation
* Diff generation
* Validation
* Sandboxed testing
* Security analysis
* Tool registration
* Tool persistence
* Tool reuse
* Tool versioning
* Rollback
* Dependency management

Success condition:

Eris can encounter a missing capability, create a safe reusable tool, validate it, and subsequently use it.

---

## MVP 5 — Eris Development Intelligence

Goal:

Make Eris fully diagnosable during development.

Requirements:

* Development dashboard
* Live execution trace
* State graphs
* Task graphs
* Tool graphs
* Memory events
* Provider events
* Performance metrics
* Error visualization
* Code-change visualization
* Generated-tool visualization
* Security visualization
* System monitoring
* Audit inspection

Success condition:

A developer can observe an Eris task and identify what she is doing, what state she is in, which tools she is using, what failed, and why.

---

## MVP 6 — Autonomous Eris

Goal:

Move from tool execution to robust autonomous task completion.

Requirements:

* Long-running tasks
* Multi-step planning
* Dynamic replanning
* Verification
* Recovery
* Persistent experience
* Tool reuse
* Background execution
* User approval gates
* Task cancellation
* Checkpointing
* Resume after failure
* Degraded operating modes
* Autonomous capability discovery

Success condition:

Eris can receive a high-level goal and independently execute, verify, recover, and complete the task with minimal intervention.

---

# 47. Definition of "Done"

Eris is not considered mature simply because she can call an LLM.

A mature Eris should demonstrate:

1. Provider independence.
2. No hardcoded default provider.
3. No hardcoded default model.
4. Persistent memory.
5. Reliable tool execution.
6. Human-like interaction.
7. Voice activation.
8. Autonomous multi-step execution.
9. Self-created reusable tools.
10. Controlled self-coding.
11. Strong security boundaries.
12. Owner-controlled privileged operations.
13. Complete development observability.
14. Extensibility without Core rewrites.
15. Reliable recovery from failure.
16. Reversible changes.
17. Dynamic state-driven behavior.
18. Secure provider onboarding.
19. A development Dashboard.
20. A continuously documented architecture.

---

# 48. Fundamental Architectural Rule

The most important rule of Eris is:

**Capabilities may evolve. Core principles must remain protected.**

Eris should be able to learn new ways of doing things, create tools, integrate services, write code, and expand her capabilities.

She should not be able to silently redefine her own security boundaries.

Owner-authorized modification is the exception, and it must be:

* Authenticated
* Authorized
* Auditable
* Diff-based
* Testable
* Reversible
* Recoverable

The Dashboard is a window into Eris, not Eris itself.

The Security Core is the authority.

The LLM is the reasoning engine, not the authority.

The Tool System is the execution layer.

The Extension System is the growth mechanism.

The Event System is the observability foundation.

PostgreSQL is the initial persistent memory layer.

The Provider Interface is the boundary that prevents vendor lock-in.

The Core is the stable foundation.

Eris is therefore designed as:

**A stable autonomous core surrounded by an indefinitely extensible capability system.**
