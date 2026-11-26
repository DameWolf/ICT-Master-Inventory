# ICT Hardware Inventory System - User Manual

## 1. Introduction

This system helps ICT teams manage hardware records, monitor inventory health, and support maintenance operations in one web interface.

## 2. Getting Started

### Accessing the App
1. Open the deployed web URL or local app address.
2. Wait for the dashboard to finish loading.

### Logging In for Admin Actions
1. Open the Supabase admin login prompt when editing is required.
2. Enter your email and password.
3. Select Login.
4. If authentication succeeds, editing features become available.

## 3. Dashboard Usage

### Summary and Filters (Top Section)
Use the filter controls to narrow records by:
- Search keyword
- Campus
- Department/Office
- Office Type
- User Type
- Status
- Category
- Device Type
- Assigned User
- Dynamic detail field and value

Select Reset Filters to clear all criteria.

### Summary Cards
After filtering, review:
- Matched Reports
- Total Inventory
- Coverage percentage

### Summary Lists
The dashboard also shows filtered:
- Status summary
- Campus summary
- Category summary

### Charts
Use chart panels to monitor high-level trends and distribution.

## 4. Inventory Management

### Browsing Records
1. Open inventory table/list views.
2. Scroll or search for asset entries.

### Viewing Details
1. Select an item.
2. Review device details in the item detail panel.

### Adding or Editing Items (Authorized Users)
1. Open add/edit modal.
2. Fill required fields.
3. Save changes.

## 5. Service and Preventive Maintenance Features

Depending on enabled modules:
- Create service requests
- Track maintenance checklists
- Export supporting PM data where available

## 6. AI Assistant and Voice (If Configured)

### AI Chat
1. Open AI assistant panel.
2. Enter your prompt.
3. Review generated response.

### Voice Controls
- Start speaking to use voice input (if enabled).
- Use stop to end current playback.
- Use pause/resume for speech playback control.

## 7. Common Issues and Fixes

Login failed:
- Verify email/password.
- Confirm Supabase configuration is valid.

No AI response:
- Check configured AI provider and API key in environment settings.
- Verify provider quota/billing and service availability.

Data not updating:
- Refresh the page.
- Confirm network and backend connectivity.

## 8. Best Practices

- Use consistent naming for asset tags and departments.
- Review dashboard summaries regularly.
- Limit edit access to authorized ICT staff.
- Keep credentials and API keys secure.
