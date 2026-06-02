# LLM Wiki Knowledge Architecture

This context defines the core language for the knowledge architecture used by `llm-wiki-starter-plus`. It exists to keep product, template, and CLI decisions aligned around the same structural concepts.

## Language

### Structure

**Single Vault**:
One Obsidian vault that contains the entire knowledge system. It is a storage boundary, not a promise that every task should read the whole vault.
_Avoid_: Multi-vault by default, split repo by default

**Logical Parent-Child Knowledge Base**:
A layered knowledge architecture inside one vault where the parent layer holds stable cross-domain knowledge and child layers hold domain-specific knowledge. It does not imply separate vaults, separate repositories, or federation.
_Avoid_: Physical parent-child repo, multi-vault hierarchy, federated vaults

**Scoped Context**:
The bounded working set used by an agent for one task, usually constrained by domain, layer, page type, and task goal. A single vault may contain many notes while each task still operates on a narrow scoped context.
_Avoid_: Full-vault context, global context by default

### Workflow

**Domain-First Workflow**:
The default operating mode where ingest, query, and maintenance begin inside one domain and only escalate to the parent layer when reuse or synthesis justifies it.
_Avoid_: Global-first workflow, full-vault-first workflow

### Evidence

**Raw Source Layer**:
The immutable evidence layer stored in `raw/` inside the same vault. Raw materials are retained after extraction for traceability and review, but are local-first by default and not assumed to be remotely synced.
_Avoid_: Disposable ingest cache, remote-first raw archive

**Supplementary External Backup**:
An optional secondary backup location such as Feishu docs used for selected source materials when extra retention or operational redundancy is needed. It supplements the Raw Source Layer and does not replace it as the system of record.
_Avoid_: External system of record for all raw materials, primary knowledge store

**Atom Workspace Note**:
An intermediate working note that captures one atomic idea between source extraction and stable knowledge compilation. It belongs to the working layer, is primarily for agents and advanced maintenance workflows, and is not a primary navigation surface in the MVP.
_Avoid_: Public-first core page type, default user-facing navigation node

**Decision Boundary**:
The section of a knowledge page that explains when to use something, when not to use it, and what trade-offs or applicability limits matter. In the MVP it is a content responsibility inside pages such as method, topic, synthesis, or query, not a standalone page type.
_Avoid_: Standalone decision page by default, empty decision shell page

**Empty Domain Scaffold**:
The default starter state where `20 领域/` exists as a structural placeholder, but no concrete domains are pre-created. Domains appear only when user intent or real ingested material justifies them.
_Avoid_: Opinionated default domain samples, hard-coded starter taxonomy

**Secondary Evidence Navigation**:
The rule that source and evidence pages remain reachable for traceability, but do not occupy the primary navigation surface of the wiki. Primary navigation should center on maps, concepts, methods, topics, synthesis, and reusable answers.
_Avoid_: First-class source navigation, summary-first homepage structure

**Promotion Threshold**:
A default numeric rule that tells the system when domain content should be promoted upward. In the MVP, reuse across 2 or more domains suggests promotion to the core layer, and a new conclusion supported by 3 or more sources suggests promotion to synthesis.
_Avoid_: Purely subjective promotion, hard-coded irreversible promotion

**Ingest Landing Zone**:
The default output boundary of ingest. In the MVP, ingest should stop at `source + atom + promotion hints`, and should not treat stable knowledge pages as the default landing zone for every new source.
_Avoid_: Direct-to-core ingest by default, source-summary-only ingest

## Example dialogue

Developer: "We're keeping one vault, but should every query search the whole thing first?"

Domain expert: "No. We use a Single Vault with Scoped Context. The default is a Domain-First Workflow."

Developer: "So when do we touch the parent layer?"

Domain expert: "Only when a concept, method, or synthesis is reused across domains. That's a Logical Parent-Child Knowledge Base, not multiple physical vaults."

Developer: "After extracting knowledge, can we delete the original raw material?"

Domain expert: "No. `raw/` is the Raw Source Layer, so we keep it locally for traceability. If some materials need extra backup, Feishu can be a Supplementary External Backup, but not the primary source of truth."

Developer: "Should atom notes be a first-class user-facing page type?"

Domain expert: "Not in the MVP. They are Atom Workspace Notes: useful for agents and advanced maintenance, but not a primary navigation surface."

Developer: "Do we need a dedicated decision page type right away?"

Domain expert: "No. In the MVP, decision logic lives as a Decision Boundary inside method, topic, synthesis, or query pages. We only promote it later if the content proves it deserves a standalone type."

Developer: "Should the starter pre-create sample domains like AI, Product, or Research?"

Domain expert: "No. Use an Empty Domain Scaffold. The structure should be ready, but real domains should only appear when user content or explicit intent creates them."

Developer: "Should source summaries still sit in the main top-level navigation?"

Domain expert: "No. Use Secondary Evidence Navigation. Evidence stays accessible, but primary navigation belongs to maps and compiled knowledge pages."

Developer: "Do we need explicit numbers for promotion to the core layer?"

Domain expert: "Yes. Use a Promotion Threshold as a default guide: 2 or more domains for promotion to the core layer, and 3 or more sources for synthesis. It's a recommendation, not a blind rule."

Developer: "Should ingest directly write stable knowledge pages by default?"

Domain expert: "No. Use an Ingest Landing Zone of source plus atom plus promotion hints. Stable pages can be updated deliberately or under higher confidence, but they are not the default landing zone."
