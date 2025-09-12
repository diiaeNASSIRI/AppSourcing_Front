# Frontend cleanup notes

This repo was tidied to improve stability and consistency without dropping features.

What changed (safe):
- Sidebar shows Besoins for BESOIN_READ or CAN_VIEW or ADMIN.
- HTTP interceptor now logs out only on 401, not on 403.
- New PermissionGuard to declare minimal route permissions via route data.
- .editorconfig for consistent indentation and line-endings.

Suggested workflow:
- Keep feature permissions in `src/app/config/permissions.ts`.
- Use `PermissionGuard` in routes with `data.perms` to centralize checks.
- Prefer `AuthService.hasAny(...)` in components for UI visibility.

Next improvements (optional):
- Add ESLint + Prettier for auto-fix.
- Add unit tests for guards/services.