# ICT Hardware Inventory System - Technical Documentation

## 1. System Overview

The ICT Hardware Inventory System is a web-based application for tracking hardware assets, monitoring inventory status, generating dashboard insights, and managing maintenance/service-related workflows.

Primary goals:
- Centralize inventory records
- Support operational reporting through filters and dashboard summaries
- Enable authenticated editing workflows through Supabase-backed login
- Provide AI-assisted interactions and voice features where configured

## 2. Technology Stack

Frontend:
- React (component-based UI)
- Vite (development server and production bundling)
- CSS modules/files per feature component

Visualization and Utilities:
- Recharts for dashboard charts
- html2canvas for image/export workflows

Backend/Data Integrations:
- Supabase for authentication and data persistence
- Optional Google Apps Script and sheet sync utilities

AI/Voice Integrations:
- Multi-provider AI support via environment configuration
- Browser speech APIs and optional ElevenLabs TTS

## 3. High-Level Architecture

Application layout:
- src/main.jsx: app entry point
- src/App.jsx: root-level orchestration
- src/components/: feature UI modules
- src/hooks/: reusable business and integration logic
- src/lib/: external service clients (for example Supabase)
- src/config/: non-secret defaults and runtime options
- src/utils/: data transformation/export helpers

Design approach:
- UI components focus on rendering and interaction
- hooks encapsulate stateful logic and API coordination
- config resolves environment-driven behavior

## 4. Key Functional Modules

Dashboard:
- KPI cards for inventory visibility
- Chart views for status/campus/category analysis
- Advanced filter and summary panel at top of dashboard

Inventory Management:
- Table-driven asset browsing
- Asset detail drawer and item edit/create modal flows

Authentication:
- Supabase admin login modal for protected edit actions
- Session-driven control over authenticated actions

AI Assistant:
- Chat UI for assistant workflows
- Provider selection and key usage from environment variables
- Error classification for auth, quota, and provider availability

Voice Features:
- Voice input/output controls
- Stop, pause, and resume behavior for speech playback

## 5. Data Model Notes

Inventory objects typically include:
- id
- category
- deviceType or name
- status
- campus
- department
- officeType
- userType
- assignedUser
- assetTag
- brand
- model
- yearPurchased
- detail fields (dynamic metadata)

The dashboard filter engine supports both fixed fields and dynamic detail key/value filtering.

## 6. Configuration

Environment variables are used for all sensitive keys.

Typical variables include:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_AI_PROVIDER
- VITE_OPENAI_API_KEY
- VITE_GEMINI_API_KEY
- VITE_OPENROUTER_API_KEY
- VITE_ANTHROPIC_API_KEY
- VITE_ELEVENLABS_API_KEY

Security note:
- No production secrets should be committed to source control.
- Use local env files and hosting provider secret management.

## 7. Build and Deployment

Local development:
1. Install dependencies
2. Configure environment variables
3. Start development server

Production build:
1. Run build command
2. Verify generated dist output
3. Deploy to hosting platform (for example Vercel)

## 8. Error Handling Strategy

Implemented error handling patterns include:
- Graceful UI messages for failed requests
- Provider-specific auth/quota/capacity error classification
- Input validation and disabled states during async operations

## 9. Testing and Validation Checklist

Recommended validation before release:
- Dashboard data renders with and without filters
- Supabase login succeeds/fails with expected messaging
- Inventory add/edit flows persist correctly
- AI chat handles successful and failed provider calls
- Voice controls start/stop/pause/resume correctly
- Production build passes without compilation errors

## 10. Maintenance Recommendations

- Keep AI provider fallbacks current with active model IDs
- Monitor quota limits and billing state for AI providers
- Review Supabase auth rules and role permissions regularly
- Add automated UI and integration tests over time
