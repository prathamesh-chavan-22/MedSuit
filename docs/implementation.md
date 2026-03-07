# 🏥 MedSuite Implementation Blueprint
### Hospital-Only AI-Powered IPD Smart Workflow & Bed Management System

---

## 📌 At a Glance

| Item | Summary |
|---|---|
| Product Goal | AI-assisted inpatient workflow platform that reduces workload and improves safety/efficiency |
| Deployment Type | Internal hospital deployment only (on-prem/private cloud) |
| Core Users | Admin, Doctor, Nurse (+ Resident, Bed Manager, Lab Operator, Auditor, Security Admin) |
| Current Status | Functional MVP modules exist; governance/security hardening and AI workflow expansion required |
| Program Duration | 14 weeks (5 phases) |
| Safety Principle | AI is assistive only; clinician review is mandatory before clinical use |

---

## 🧭 Navigation

1. [Program Intent](#-1-program-intent)  
2. [Current Codebase Reality](#-2-current-codebase-reality)  
3. [Target State](#-3-target-state)  
4. [Role & Access Model](#-4-role--access-model)  
5. [What to Build + How to Build](#-5-what-to-build--how-to-build)  
6. [Architecture Additions Needed](#-6-architecture-additions-needed)  
7. [Security & Privacy Controls](#-7-security--privacy-controls)  
8. [DevOps & Environments](#-8-devops--environments)  
9. [Testing & Validation](#-9-testing--validation)  
10. [14-Week Delivery Plan](#-10-14-week-delivery-plan)  
11. [Governance & Ownership](#-11-governance--ownership)  
12. [Risk Register](#-12-risk-register)  
13. [KPIs](#-13-kpis)  
14. [Immediate Sprint Plan](#-14-immediate-sprint-plan)  
15. [Clinical Safety Rule](#-15-clinical-safety-rule)  
16. [Core Modules Coverage](#-16-core-modules-coverage-required-list)

---

## 🎯 1) Program Intent

This blueprint defines:
- **What** must be implemented,
- **How** each capability should be implemented,
- **How success will be measured** (technical + clinical + operational).

### Desired Outcomes
- Reduce doctor documentation time while preserving quality.
- Improve bed assignment speed and occupancy planning.
- Improve detection and response to high-risk inpatients.
- Ensure compliance-grade security, privacy, and auditability.

---

## 🔎 2) Current Codebase Reality

## ✅ 2.1 What Already Exists

### Backend (FastAPI)
- JWT authentication (`/auth/login`, `/auth/me`, `/auth/register`).
- Implemented core modules:
  - Patients CRUD
  - Beds CRUD + assign/unassign + simple suggestion
  - Vitals ingestion (mock) + alert generation
  - Audio upload + transcription integration
  - Tasks + shifts
  - Alerts list/read + websocket broadcast
- SQLAlchemy models for users, patients, beds, vitals, tasks, shifts, alerts, audio notes.

### Frontend (React)
- Auth flow and protected routes.
- Dashboard, Patients, Patient Detail, Beds, Tasks pages.
- Browser audio recording and upload.
- Real-time alert bell/dropdown.

## ⚠️ 2.2 Critical Gaps to Close

### Access & Security
1. Route-level RBAC is not fully enforced.
2. Public registration path is open (should be admin-managed).
3. Websocket auth hardening is required.
4. Default fallback secret must be removed in production.
5. Frontend API/WS endpoints are hardcoded.

### Governance & Compliance
1. No formal consent artifact for audio capture.
2. No immutable audit event store.
3. No coded retention lifecycle for audio/transcripts/logs.

### Reliability & Delivery
1. Startup `create_all` should be replaced by migration-first flow.
2. Alembic workflow not formalized in repo process.
3. Vitals pipeline is mock/demo only.
4. No security boundary test suite yet.

---

## 🌟 3) Target State

MedSuite should operate as a **clinical workflow assistant** with:
- strict RBAC + scope-based access,
- consent-driven and auditable PHI flows,
- bed/workflow intelligence,
- AI-assisted documentation and summarization with clinician sign-off,
- production-grade security, operations, and DR readiness.

---

## 👥 4) Role & Access Model

## 4.1 Mandatory Roles

- **Admin**: user/role governance, system policy, full audit visibility.
- **Doctor**: clinical updates, AI note review/finalization, alert response.
- **Nurse**: vitals/tasks/bedside operations, no physician note finalization.

## 4.2 Additional Recommended Roles

- **Resident / DMO**: scoped doctor-like access by shift/ward.
- **Bed Manager**: bed allocation/transfer/discharge operations.
- **Lab Operator**: lab ingestion and validation.
- **Compliance Auditor**: read-only records + audits.
- **Security Admin**: IAM/security controls/log exports.

## 4.3 Permission Matrix

| Capability | Admin | Doctor | Nurse | Resident | Bed Manager | Lab Operator | Auditor | Security Admin |
|---|---|---|---|---|---|---|---|---|
| User/Role management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (security scope) |
| Patient create/update | ✅ | ✅ | ⚠️ limited | ✅ (scoped) | ⚠️ demographic only | ❌ | ✅ read-only | ❌ |
| Bed assign/transfer | ✅ | ⚠️ policy | ✅ | ⚠️ policy | ✅ | ❌ | ✅ read-only | ❌ |
| Vitals entry | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ read-only | ❌ |
| Task create/update | ✅ | ✅ | ✅ | ✅ | ⚠️ ops only | ❌ | ✅ read-only | ❌ |
| Audio record/transcript | ✅ | ✅ | ⚠️ policy | ✅ | ❌ | ❌ | ✅ read-only | ❌ |
| Clinical note finalization | ✅ (policy) | ✅ | ❌ | ⚠️ draft only | ❌ | ❌ | ✅ read-only | ❌ |
| Lab ingest/validation | ⚠️ oversight | ✅ view | ✅ view | ✅ view | ❌ | ✅ | ✅ read-only | ❌ |
| Audit logs | ✅ | ⚠️ own | ⚠️ own | ⚠️ own | ⚠️ own | ⚠️ own | ✅ full read-only | ✅ full |

---

## 🧱 5) What to Build + How to Build

> Each stream includes **What**, **How**, and **Done When**.

## 5.1 Secure Access Foundation

**What**
- Strong auth + strict RBAC + scoped access control.

**How**
- Apply role/scope dependencies on all APIs.
- Restrict provisioning paths to admin-managed flow.
- Authenticate websocket connections.
- Move security config to environment with startup checks.

**Done When**
- Unauthorized actions return `403` consistently.
- Websocket cannot be used without valid auth context.

## 5.2 Consent + Audio Governance

**What**
- Consent-first recording and transcription lifecycle.

**How**
- Add consent model (`patient_id`, `status`, `captured_by`, `captured_at`, `basis`, `expires_at`).
- Enforce active consent on upload API.
- Store transcript review metadata (`review_status`, `reviewed_by`, `confidence`).
- Implement retention/archive/delete workflows.

**Done When**
- Audio upload is blocked when consent is invalid/missing.
- Transcript is fully traceable and reviewable.

## 5.3 Audit Logging & Forensics

**What**
- Immutable audit trail for critical actions.

**How**
- Add append-only audit events model.
- Emit events on auth, read/write PHI, bed/task/alert/audio actions, role changes.
- Export structured logs to SIEM.

**Done When**
- Any clinical action can be traced end-to-end.

## 5.4 Bed Intelligence

**What**
- Move beyond static status to predictive operational insights.

**How**
- Track occupancy intervals and turnaround.
- Build rule-based recommendation score (ward fit, risk constraints, throughput).
- Expose occupancy and projected release metrics.

**Done When**
- Bed suggestions are explainable and policy-aware.

## 5.5 Smart Rounding Assistant

**What**
- Prioritized, explainable list of patients needing immediate attention.

**How**
- Score with vitals anomalies + critical alerts + overdue tasks + lab abnormalities.
- Show explanation factors in UI.
- Add acknowledgment and action tracking.

**Done When**
- Rounds page is actionable and clinician-trusted.

## 5.6 AI Clinical Documentation (SOAP)

**What**
- Transcript-to-SOAP draft with clinician review workflow.

**How**
- Pipeline: transcript → section extraction → SOAP draft → doctor edit/sign.
- Maintain revision/version history for legal traceability.
- Add mandatory safety banner and confidence indicators.

**Done When**
- Doctor can generate, edit, approve, and finalize notes in a single flow.

## 5.7 Lab Summarizer + Patient Timeline

**What**
- Lab trend insights and unified patient chronology.

**How**
- Add lab result ingestion schema + abnormal detection rules.
- Compute deltas and trend states.
- Aggregate beds/vitals/tasks/alerts/audio/labs into timeline endpoint.

**Done When**
- Timeline view supports handover and clinical review without context switching.

---

## 🏗️ 6) Architecture Additions Needed

## 6.1 New Core Data Entities
- `consents`
- `audit_logs`
- `clinical_notes`
- `lab_results`
- `patient_events` (optional denormalized event index)

## 6.2 New/Extended APIs
- Consent APIs (`create`, `revoke`, `status`).
- Audit query API (admin/auditor scope).
- Lab APIs (`ingest`, `list`, `summary`).
- Timeline API (`GET /patients/{id}/timeline`).
- Rounding API (`GET /rounding/priorities`).

## 6.3 Frontend Modules to Add
- Role-aware navigation/actions.
- Consent flow in Patient Detail.
- Timeline tab.
- Rounding panel on dashboard.
- Lab summary widgets.

---

## 🔐 7) Security & Privacy Controls

## 7.1 Identity Controls
- Hospital IdP/SSO preferred.
- MFA for privileged accounts.
- Session revocation for disabled/compromised users.
- Break-glass access with mandatory reason + audit tag.

## 7.2 Encryption Controls
- TLS 1.2+ in transit.
- Encryption at rest for DB and audio objects.
- KMS/HSM managed keys with rotation policy.

## 7.3 App Security Controls
- Secret scanning, dependency scanning, SAST/DAST in CI.
- Strict CORS and security headers by environment.
- Rate limiting for auth/upload/critical APIs.

## 7.4 Compliance Controls
- Consent mandatory for recording.
- Retention lifecycle automation.
- Immutable audit logs and periodic access reviews.

---

## ⚙️ 8) DevOps & Environments

## 8.1 Environment Strategy
- **dev**: synthetic/test data only.
- **uat**: near-prod controls, de-identified data.
- **prod**: full hardening, SIEM, DR, restricted operations.

## 8.2 CI/CD Gates
1. Lint and quality checks.
2. Unit + integration + security tests.
3. Migration validation gate.
4. Approval-based deployment and rollback plan.

## 8.3 Observability
- Metrics: latency, error rate, auth failures, websocket health.
- Logs: structured logs + trace IDs.
- Alerts: auth anomalies, high 5xx, failed backup, SIEM findings.

---

## 🧪 9) Testing & Validation

## 9.1 Automated Tests (Mandatory)
- RBAC matrix tests per endpoint and role.
- Scope tests (ward/shift/assignment isolation).
- Consent enforcement tests for audio path.
- Audit event integrity tests.
- Websocket auth tests.
- Migration smoke tests (upgrade/downgrade).

## 9.2 UAT Packs by Role
- Doctor: rounds + note generation + sign-off.
- Nurse: vitals/tasks/alerts handling.
- Bed Manager: assignment/transfer/discharge.
- Auditor: full traceability review.

---

## 🗓️ 10) 14-Week Delivery Plan

| Phase | Timeline | Focus | Key Output |
|---|---|---|---|
| Phase 0 | Week 1-2 | Security baseline | RBAC enforcement, register lockdown, websocket auth, env config |
| Phase 1 | Week 3-5 | Governance + operations | consent model, audit logs, lifecycle states, bed metrics, role-aware UI |
| Phase 2 | Week 6-9 | AI clinical workflows | SOAP draft + sign-off, explainable priority engine |
| Phase 3 | Week 10-12 | Labs + timeline + search | lab summarizer, unified timeline, secure transcript search |
| Phase 4 | Week 13-14 | Production readiness | migration governance, DR drill, security sign-off, rollout readiness |

---

## 🧑‍💼 11) Governance & Ownership

## 11.1 Suggested Owners
- Product/Clinical Lead: workflow rules, acceptance criteria.
- Backend Lead: APIs, data model, access/security controls.
- Frontend Lead: role-aware UX and usability.
- Security Lead: IAM, SIEM, policy checks.
- DevOps Lead: release, backup/DR, observability.

## 11.2 Review Cadence
- Weekly engineering status review.
- Bi-weekly clinical demo and workflow feedback.
- Monthly security/compliance checkpoint.

---

## ⚠️ 12) Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Missing route-level RBAC | Critical | Phase 0 hard gate + security tests |
| Open registration misuse | Critical | Admin-only provisioning/invite flow |
| Websocket unauthorized access | High | JWT validation + scoped subscriptions |
| Missing recording consent | Critical | Hard consent precondition in API |
| No immutable audits | High | Append-only event store + SIEM export |
| Schema drift | High | Migration-only release policy |
| AI hallucination/overtrust | High | Clinician sign-off + confidence + safety labeling |

---

## 📈 13) KPIs

## 13.1 Clinical/Operational KPIs
- 30-40% reduction in doctor documentation effort.
- Faster bed turnaround and fewer assignment delays.
- Reduced critical-patient response time.

## 13.2 Security/Reliability KPIs
- 100% privileged actions audited.
- Zero critical unresolved security findings at go-live.
- API and alert delivery SLO compliance in pilot and production.

---

## 🚀 14) Immediate Sprint Plan (Start Here)

### Sprint Objective
Close all Phase 0 blockers.

### Sprint Backlog
1. Enforce `require_role` across all backend routers.
2. Protect/disable `/auth/register` outside controlled admin path.
3. Authenticate `/alerts/ws` and scope event delivery.
4. Move frontend API/WS base URLs to environment variables.
5. Add baseline tests for RBAC and websocket auth.

### Sprint Exit Criteria
- Security review passes for Phase 0 scope.
- Demonstration confirms role-safe API and UI behavior.

---

## 🩺 15) Clinical Safety Rule

> MedSuite is assistive software.  
> AI outputs are draft recommendations only and **must always be reviewed and approved by a licensed clinician before clinical use**.

---

## ✅ 16) Core Modules Coverage (Required List)

This section explicitly confirms all required core modules and defines **what + how** for implementation.

## 16.1 Secure Doctor Login & Role-Based Access

**What**
- Personalized dashboard per logged-in doctor with admitted patients, bed status, pending tasks, and alerts.
- Strict privacy and least-privilege role controls.

**How**
- Backend: enforce route-level role + scope checks (doctor sees only assigned/in-scope patients).
- Frontend: role-aware widgets and action controls on dashboard.
- Security: token/session hardening, audit logs for record access.

## 16.2 Smart Bed Management System

**What**
- Real-time ICU/general/private bed availability with occupancy and turnover insights.

**How**
- Extend bed model with ward type (`ICU`, `general`, `private`) and occupancy intervals.
- Build occupancy analytics endpoints and bed turnover KPIs.
- Add recommendation scoring (clinical fit + operational constraints).

## 16.3 AI Clinical Documentation Assistant

**What**
- Consent-based consultation recording, speech-to-text, structured SOAP summaries.

**How**
- Add mandatory consent verification before audio upload.
- Transcript pipeline: capture → normalize → section extraction → SOAP draft.
- Add doctor review/approval flow before marking note final.

## 16.4 Smart Rounding Assistant

**What**
- Highlights high-priority patients, abnormal vitals, pending lab concerns, and overdue tasks.

**How**
- Build explainable risk scoring engine from vitals + alerts + tasks + labs.
- Provide ranked “Needs Attention” list on dashboard.
- Track acknowledgment and follow-up action timestamps.

## 16.5 AI Lab Report Summarizer

**What**
- Extract abnormal values, compare trends, and present concise lab insights.

**How**
- Add lab result ingestion schema and abnormal threshold logic.
- Compute deltas from previous reports and trend state (improving/stable/worsening).
- Render doctor-friendly summary cards with abnormal highlights.

## 16.6 Smart Patient Timeline

**What**
- Structured timeline of admission history, bed transfers, labs, and AI summaries.

**How**
- Create timeline aggregator combining patient events from all modules.
- Add patient detail timeline tab with filter by event type/date.
- Ensure every event is timestamped and user-attributed.

## 16.7 Voice Command System

**What**
- Doctors can use voice commands for faster navigation and common actions.

**How**
- Frontend: browser speech recognition or clinical-grade speech service integration.
- Intent mapping examples: “open patient John”, “show critical alerts”, “start note recording”.
- Add confirmation prompts for high-impact actions (safety guardrail).

## 16.8 Secure Audio Archive & Smart Search

**What**
- Securely store consultation audio and enable intelligent keyword retrieval.

**How**
- Encrypt stored audio and transcript metadata at rest.
- Build indexed transcript search (keyword + date + patient + clinician filters).
- Enforce role/scope filters on search results and log every access.

## 16.9 Coverage Status Summary

| Core Module | Current State | Action Needed |
|---|---|---|
| Secure Doctor Login & Role-Based Access | Partial | Complete route-level RBAC + scope filtering + role-aware UI |
| Smart Bed Management System | Partial | Add ICU/general/private classifications + occupancy analytics + turnover insights |
| AI Clinical Documentation Assistant | Partial | Add consent gate + SOAP generation + sign-off workflow |
| Smart Rounding Assistant | Partial | Implement explainable priority scoring and rounds panel |
| AI Lab Report Summarizer | Not Yet | Build lab ingestion, abnormal extractor, trend summarizer |
| Smart Patient Timeline | Partial | Add unified timeline API + timeline UI tab |
| Voice Command System | Not Yet | Add command capture, intent engine, safe action execution |
| Secure Audio Archive & Smart Search | Partial | Add encrypted archive controls + indexed smart search + audit access |
