# Vitalis Implementation Status

This document captures the current implementation state for Vitalis.

## Completed Workstreams

- Role-based API access and admin-managed onboarding
- Username login and auth endpoint hardening
- Consent model and consent-gated audio upload
- Consent email request/decision flow
- Audit event logging foundation
- Rounding priorities endpoint
- SOAP note draft/finalize flow
- Labs ingest and summary APIs
- Unified patient timeline API and UI support

## Session Handling (Implemented)

- `user_sessions` table added
- login creates session and returns refresh token
- refresh endpoint rotates refresh token hash
- logout revokes a session id
- sessions endpoint lists active/history records

## Expanded Patient Intake (Implemented)

Added patient coverage for:

- MRN, blood group, weight, height
- comorbidities and medications
- primary/secondary phones
- emergency contact name/phone/relationship
- address and insurance metadata
- admission/discharge timestamps and status
- fall-risk flag

Validation includes:

- discharge ordering checks
- discharge requirement on discharged/deceased status
- emergency contact pairing checks
- MRN uniqueness guards in APIs

## Queue and Parallel Processing (Implemented)

- Celery app with Redis broker/result backend
- dedicated task routes for audio and maintenance queues
- async transcription worker task
- Celery Beat jobs for maintenance
- Flower monitoring support
- startup scripts for worker, beat, and flower

## Recommended Next Steps

- Add Alembic migrations for new fields/tables
- Add integration tests for queue-path transcription
- Add frontend session management UI (active sessions page)
- Add Redis and worker readiness checks for deployment diagnostics
