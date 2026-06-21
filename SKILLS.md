# Skills inventory

Generated: 2026-06-21 - 9 skills. The source of truth for agent skills
installed via `npx skills`. These are loaded by GitHub Copilot CLI and other
agents through the `~\.agents\skills` junction (see [README](./README.md)).

| Skill | Description |
| ----- | ----------- |
| **azure-kusto** | Query and analyze data in Azure Data Explorer (Kusto/ADX) using KQL for log analytics, telemetry, and time series analysis. WHEN: KQL queries, Kusto database queries, Azure Data Explorer, ADX clusters, log analytics, time series data, IoT telemetry, anomaly detection. |
| **design-doc-mermaid** | Create Mermaid diagrams (activity, deployment, sequence, architecture) from text descriptions or source code. Use when asked to "create a diagram", "generate mermaid", "document architecture", "code to diagram", "create design doc", or "convert code to diagram". Supports hierarchical on-demand guide loading, Unicode semantic symbols, and Python utilities for diagram extraction and image conversion. |
| **find-skills** | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. |
| **frontend-design** | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults. |
| **grill-me** | A relentless interview to sharpen a plan or design. |
| **microsoft-foundry** | Deploy, evaluate, fine-tune, and manage Foundry agents end-to-end with azd: hosted agent scaffold/run/deploy, prompt agent create, batch eval, continuous eval, prompt optimizer, Agent Optimizer scaffold, agent.yaml, dataset curation from traces, model fine-tuning (SFT/DPO/RFT). USE FOR: azd ai agent, azd provision/deploy, deploy agent, hosted agent, create agent, add tool to agent, invoke agent, evaluate agent, continuous eval, continuous monitoring, optimize prompt, improve prompt, optimize agent instructions, agent optimizer, deploy model, Foundry project, RBAC, role assignment, permissions, quota, capacity, region, troubleshoot agent, deployment failure, AI Services, create Foundry resource, provision, knowledge index, customize deployment, onboard, availability, fine-tune, SFT, DPO, RFT, training-data, grader, distillation, fine-tuned model, large file upload. DO NOT USE FOR: Azure Functions, App Service, general Azure deploy (use azure-deploy), general Azure prep (use azure-prepare). |
| **skill-creator** | Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. |
| **to-prd** | Turn the current conversation into a PRD and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed. |
| **web-design-guidelines** | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". |

