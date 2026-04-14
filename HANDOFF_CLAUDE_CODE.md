# SocialGo — Handoff a Claude Code

**Fecha:** 2026-04-14
**Estado general:** MVP funcional en producción. Invite flow reparado y validado (T1). Faltan enforcement de límites, fix de UserMenu, y completar ciclos de pruebas T2–T6 + Ciclos 4–6.

---

## 1. Resumen funcional

SocialGo es un SaaS para agencias de marketing que gestionan múltiples clientes. Cada **org** (agencia) tiene:
- **Clientes** (marcas que la agencia maneja)
- **Miembros** con 5 roles: `owner`, `admin`, `member`, `creative`, `client_viewer`
- **Posts / Brand Kits / AI Studio** por cliente
- **Billing** por org vía Stripe (planes Free / Pro / Full)

Diferenciales clave:
- Pricing por número de clientes manejados (no por seat).
- `creative` es un rol scoped: sólo ve los clientes a los que fue asignado en `client_members`.
- `client_viewer` es para que el cliente final vea su propio dashboard.
- UI glassmorphism, base boilerplate Duo.

---

## 2. Stack técnico

| Capa | Tech |
|---|---|
| Frontend | Next.js 14.2.0 (App Router), React, Tailwind, shadcn/ui |
| Auth / DB | Supabase (`@supabase/ssr@0.0.10`) con RLS + SECURITY DEFINER functions |
| Pagos | Stripe Checkout + Customer Portal + Webhooks (**Live mode**) |
| Email | Resend vía SMTP custom en Supabase Auth (dominio verificado `thesocialgo.com`, sender `accounts@thesocialgo.com`) |
| Hosting | Vercel — `socialgo-one.vercel.app` |
| Platform admin | Gate vía env `PLATFORM_ADMIN_EMAILS` |

**Supabase project ref:** `ydtfsajtjpngjjxnifib`
⚠️ El proyecto se movió de la org Boxo a la org SocialGo en Supabase. El MCP token de Supabase sigue scoped a la org vieja, por lo que **no hay acceso directo a DB desde MCP**; usar SQL Editor del dashboard.

---

## 3. Archivos clave

```
src/
  app/
    api/
      members/
        invite/route.ts              ← Invite flow (admin.inviteUserByEmail + redirect /auth/set-password)
        [id]/clients/route.ts        ← GET/PUT assignments creative↔clients
      stripe/
        webhook/route.ts             ← Stripe webhooks (checkout, subscription updates)
        checkout/route.ts
        portal/route.ts
    auth/
      set-password/page.tsx          ← Landing post-invite
    dashboard/
      settings/page.tsx              ← Tab "Equipo" con invite UI + per-client picker + "Editar acceso"
      billing/page.tsx
    platform/
      layout.tsx                     ← 404 gate si no es platform admin
      page.tsx                       ← Dashboard platform admin
  components/
    auth/SetPasswordForm.tsx         ← Formulario de password post-invite (min 8 chars)
  lib/
    permissions.ts                   ← PERMISSION_MATRIX por rol
    platform-admin.ts                ← checkPlatformAdmin() con fallback parseo cookies
    pricing-config.ts                ← Planes Free/Pro/Full (clientMax — FALTA seatMax)
    hooks.ts                         ← client-side limits enforcement (client_limit en línea 460-504)
    supabase/server.ts               ← createServerSupabaseClient + createServiceRoleClient
```

---

## 4. Decisiones de enforcement pendientes (Ciclo 2)

Estas decisiones se tomaron en Ciclo 2 pero **no están implementadas aún**:

### A) Seat limits por plan
Agregar campo `seatMax` a `pricing-config.ts`:
- **Free:** 1 seat (el owner, no puede invitar)
- **Pro:** 3 seats
- **Full:** 10 seats

Enforce en `POST /api/members/invite` antes del `inviteUserByEmail`:
```ts
const { count } = await service
  .from("members")
  .select("id", { count: "exact", head: true })
  .eq("org_id", orgId);
if (count >= plan.seatMax) return 402 { error: "Seat limit reached" };
```

### B) Estado `past_due`
Bloquear TODO el dashboard excepto `/dashboard/billing`. Implementar en middleware o en layout del dashboard leyendo `orgs.subscription_status`.

### C) Estado `canceled`
Permitir acceso hasta `current_period_end`, luego bloquear a `/dashboard/billing` con banner "Reactivar".

---

## 5. Bugs conocidos

1. **UserMenu muestra "User / Member" genérico** en lugar del email y rol reales. Revisar el componente que consume `useUser()` en el header del dashboard.
2. **`listUsers({ perPage: 200 })` en `/api/members/invite`** — no escala >200 usuarios globales. Migrar a query directo sobre `auth.users` via service client o usar `getUserByEmail` cuando Supabase lo exponga.
3. **`@supabase/ssr@0.0.10` bug de parseo de cookies** — ya hay fallback en `platform-admin.ts`. Considerar upgrade a versión estable cuando salga.

---

## 6. Estado de pruebas

### Ciclo 1 — Invite flow infra ✅
- **T1** Admin invita admin vía API: ✅ PASS (`user_id ce12f10e-58d2-4ee5-9bb7-9f99b20a6452`)
  - Email llega a mailinator, link redirige a `/auth/set-password`.

### Ciclo 2 — Decisiones de enforcement ✅ (documentado, no implementado)
- A) seat limits / B) past_due / C) canceled until period_end

### Ciclo 3 — Invite flow E2E ⏳ (parcialmente auditado en código, NO live-tested)
- **T2** Admin abre link del email, set password, entra al dashboard con rol correcto → **PENDIENTE live test**
- **T3** Admin invita creative → audit-only
- **T4** Creative abre link, set password, ve sólo clientes asignados → audit-only
- **T5** Admin edita asignaciones de creative vía "Editar acceso" → audit-only
- **T6** Admin remueve creative / revocación de acceso → audit-only

### Ciclo 4 — Creative scope 🔲 no iniciado
- UC 4.1 Creative sólo ve sus clientes en lista
- UC 4.2 Creative NO puede acceder a cliente no asignado (URL directa)
- UC 4.3 Creative puede crear/editar posts sólo en clientes asignados
- UC 4.4 Creative NO ve `/dashboard/reports` ni `/dashboard/packages`
- UC 4.5 Permisos AI Studio y Brand Kits funcionan
- UC 4.6 Comments funcionan

### Ciclo 5 — Owner vs Admin 🔲 no iniciado
- UC 5.1 Admin NO puede invitar como owner (validado en código línea 92-97)
- UC 5.2 Admin NO puede transferir ownership
- UC 5.3 Admin NO puede eliminar la org
- UC 5.4 Admin NO puede cancelar subscription (sólo owner accede a portal?)
- UC 5.5 Admin puede gestionar clientes y miembros

### Ciclo 6 — E2E agency smoke 🔲 no iniciado
- UC 6.1 Signup nuevo owner → crear org → upgrade a Pro
- UC 6.2 Invitar 2 admins, 3 creatives
- UC 6.3 Crear 5 clientes, asignar creatives
- UC 6.4 Cada creative crea posts en sus clientes
- UC 6.5 Admin aprueba/comenta
- UC 6.6 Client_viewer ve su dashboard
- UC 6.7 Downgrade a Free (debe bloquear si excede clientMax)
- UC 6.8 Cancel → verificar acceso hasta period_end

---

## 7. Blockers encontrados y workarounds

### Blocker 1: Emails de invite no llegaban (500)
**Síntomas:** `POST /auth/v1/invite → 500`. En `auth_logs` aparecían eventos `user_invited` pero ningún usuario se persistía. En Resend Logs no aparecía ningún envío nuevo.
**Causa raíz:** La Resend API key en Supabase SMTP (campo Password) estaba inválida/expirada (probablemente invalidada tras el move de org en Supabase).
**Fix:** Jorge rotó la API key en Resend y pegó la nueva en Supabase → SMTP Settings → Password. ✅

### Blocker 2: OTP expirado al abrir link de invite desde Gmail
**Causa:** Gmail hace pre-fetch de links para security scanning, consumiendo el OTP single-use de Supabase.
**Workaround:** Usar inboxes públicos como **mailinator** (p.ej. `socialgo-t1@mailinator.com`) que no pre-fetchean.
**Fix definitivo pendiente:** Cambiar tipo de token o permitir reuso limitado.

### Blocker 3: No hay `/api/clients` para test programmatic
Los clientes se fetchean directamente con supabase client, no hay REST endpoint. Para tests E2E de creative scope via Chrome MCP necesitamos extraer UUIDs de clientes desde el DOM o crear endpoint helper.

---

## 8. Tareas inmediatas sugeridas para Claude Code

1. **Implementar seat limits (A)** en `/api/members/invite` + campo `seatMax` en `pricing-config.ts`.
2. **Implementar past_due block (B)** en `src/app/dashboard/layout.tsx` o middleware.
3. **Implementar canceled grace period (C)** leyendo `current_period_end` de `orgs`.
4. **Fix UserMenu** para mostrar email + rol reales.
5. **Completar Ciclo 3 live** (T2–T6) usando mailinator.
6. **Ejecutar Ciclo 4** (scope de creative) — crítico para seguridad.
7. **Ejecutar Ciclo 5** (owner vs admin) — principalmente asserts sobre `/api/*`.
8. **Ejecutar Ciclo 6** (smoke E2E).
9. **Documentar runbook de rotación de Resend API key.**

---

## 9. Credenciales / URLs

- App: https://socialgo-one.vercel.app
- Supabase: https://supabase.com/dashboard/project/ydtfsajtjpngjjxnifib
- Resend: https://resend.com/emails
- Stripe: Live mode
- Test inbox: https://www.mailinator.com/v4/public/inboxes.jsp?to=socialgo-t1

## 10. Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://socialgo-one.vercel.app
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PLATFORM_ADMIN_EMAILS=jhmunoz7@gmail.com,...
```

---

**Última prueba exitosa:** T1 (admin invitando admin vía `/api/members/invite`) el 2026-04-14 tras fix de SMTP.
