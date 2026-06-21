---
name: Role hierarchy
description: The six user roles and what each can access
---

## Roles (stored in Clerk publicMetadata.role)

| Role | Scope | company_id needed? |
|------|-------|-------------------|
| super_admin | All companies, platform admin | No |
| company_admin | Own company only, full CRM access | Yes |
| admin | Own company CRM + user mgmt | Yes |
| sales_manager | Own company CRM + assign leads | Yes |
| sales_executive | Only their assigned leads | Yes |
| client | Client portal only (payments, properties) | No (uses clerk_user_id) |

## Frontend routing by role
- super_admin → redirects to /super/companies
- sales_executive → redirects to /sales/dashboard
- client → redirects to /client/dashboard
- all others → /dashboard

## Sidebar sections
- super_admin: Platform section (Companies, All Users) + full CRM
- company_admin: Company section (Settings, Team) + full CRM
- admin: full CRM + Admin section (User Mgmt, Assign Leads)
- sales_manager: full CRM + Assign Leads
- sales_executive: My Work section (My Dashboard, My Leads)
- client: My Portal section (Dashboard, Payments, Properties)

## Backend enforcement
- requireRole(...roles) checks Clerk sessionClaims.publicMetadata.role
- requireTenant checks company_id in same metadata
- Sales exec lead isolation: if role === "sales_executive", adds eq(leadsTable.assignedTo, userId) condition
