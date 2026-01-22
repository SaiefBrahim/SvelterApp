# Audit Logging Pattern for Services

This document describes the standard pattern for adding audit logging to all services in the application.

## Overview

All service methods that perform mutations (CREATE, UPDATE, DELETE, etc.) should automatically log their activities to the audit log system. This ensures comprehensive tracking of all user actions without requiring manual logging in route handlers.

## Pattern

### 1. Import Required Utilities

```typescript
import { logActivity, AUDIT_ACTIONS, AUDIT_RESOURCES } from '$lib/server/utils/audit-logger';
// OR use resource-specific helpers:
import { logUserActivity, logRoleActivity, logOrganizationActivity, logInviteActivity } from '$lib/server/utils/audit-logger';
import type { AuditContext } from '$lib/server/utils/audit-context';
```

### 2. Add AuditContext Parameter

Add an optional `auditContext` parameter to all mutation methods:

```typescript
static async create(input: CreateInput, auditContext?: AuditContext): Promise<Result> {
    // ... implementation
}
```

### 3. Log After Successful Operations

Log the activity immediately after the database operation succeeds:

```typescript
static async create(input: CreateInput, auditContext?: AuditContext): Promise<Result> {
    // Perform the operation
    const result = await db.model.create({ data: input });
    
    // Log activity
    await logActivity(
        {
            action: AUDIT_ACTIONS.CREATE,
            resource: AUDIT_RESOURCES.YOUR_RESOURCE,
            resourceId: result.id,
            metadata: { /* relevant data */ }
        },
        auditContext
    );
    
    return result;
}
```

### 4. For DELETE Operations

Fetch the record before deletion to include metadata in the audit log:

```typescript
static async delete(id: string, auditContext?: AuditContext): Promise<void> {
    // Get record info before deletion
    const record = await db.model.findUnique({
        where: { id },
        select: { id: true, name: true, /* other relevant fields */ }
    });
    
    await db.model.delete({ where: { id } });
    
    // Log activity
    if (record) {
        await logActivity(
            {
                action: AUDIT_ACTIONS.DELETE,
                resource: AUDIT_RESOURCES.YOUR_RESOURCE,
                resourceId: record.id,
                metadata: { name: record.name, /* other fields */ }
            },
            auditContext
        );
    }
}
```

## Route Handler Pattern

In route handlers, always extract and pass audit context:

```typescript
import { getAuditContext } from '$lib/server/utils/audit-context';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const session = await locals.auth?.();
        if (!session?.user) {
            throw error(401, 'Unauthorized');
        }
        
        // Get audit context
        const auditContext = getAuditContext(
            { request, getClientAddress: () => 'unknown' } as any,
            session
        );
        
        // Call service with audit context
        await YourService.create(input, auditContext);
    }
};
```

## Standard Actions

Use these standard actions from `AUDIT_ACTIONS`:
- `CREATE` - Creating a new record
- `UPDATE` - Updating an existing record
- `DELETE` - Deleting a record
- `ACTIVATE` - Activating a record
- `DEACTIVATE` - Deactivating a record
- `LOGIN` - User login
- `LOGOUT` - User logout
- `SIGNUP` - User registration
- `RESET_PASSWORD` - Password reset
- `FORGOT_PASSWORD` - Password reset request
- `CANCEL` - Canceling an invite/request
- `ACCEPT` - Accepting an invite
- `RESEND` - Resending an invite

## Standard Resources

Use these standard resources from `AUDIT_RESOURCES`:
- `USER` - 'users'
- `ORGANIZATION` - 'organizations'
- `ROLE` - 'roles'
- `INVITE` - 'invites'
- `ORGANIZATION_SETTINGS` - 'organization_settings'
- `PERMISSION` - 'permissions'
- `SESSION` - 'sessions'
- `AUDIT_LOG` - 'audit_logs'

## Helper Functions

For common resources, use helper functions:

```typescript
// Instead of:
await logActivity({ action: AUDIT_ACTIONS.CREATE, resource: AUDIT_RESOURCES.USER, ... }, context);

// Use:
await logUserActivity(AUDIT_ACTIONS.CREATE, userId, metadata, context);
```

Available helpers:
- `logUserActivity()`
- `logOrganizationActivity()`
- `logRoleActivity()`
- `logInviteActivity()`

## Error Handling

Audit logging should NEVER throw errors. It's wrapped in try-catch internally, but if you add custom logging, ensure it doesn't break the main flow:

```typescript
try {
    await logActivity(...);
} catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - continue execution
}
```

## Metadata Best Practices

Include relevant context in metadata:
- For CREATE: Include key fields (name, email, etc.)
- For UPDATE: Include what changed (list of changed fields, old/new values)
- For DELETE: Include identifying information (name, email, etc.)
- For state changes: Include previous and new status

## Examples

### Example: Service Method

```typescript
export class VehicleService {
    static async create(input: CreateVehicleInput, auditContext?: AuditContext): Promise<Vehicle> {
        const vehicle = await db.vehicle.create({ data: input });
        
        await logActivity(
            {
                action: AUDIT_ACTIONS.CREATE,
                resource: 'vehicles', // Add to AUDIT_RESOURCES if frequently used
                resourceId: vehicle.id,
                metadata: {
                    licensePlate: vehicle.licensePlate,
                    make: vehicle.make,
                    model: vehicle.model
                }
            },
            auditContext
        );
        
        return vehicle;
    }
}
```

### Example: Route Handler

```typescript
export const actions: Actions = {
    create: async ({ request, locals }) => {
        const session = await locals.auth?.();
        if (!session?.user) throw error(401, 'Unauthorized');
        
        const auditContext = getAuditContext(
            { request, getClientAddress: () => 'unknown' } as any,
            session
        );
        
        await VehicleService.create(input, auditContext);
    }
};
```

## Checklist for New Services

- [ ] Import audit logging utilities
- [ ] Add `auditContext?: AuditContext` parameter to all mutation methods
- [ ] Log CREATE operations after successful creation
- [ ] Log UPDATE operations after successful update (include what changed)
- [ ] Log DELETE operations (fetch record first for metadata)
- [ ] Log ACTIVATE/DEACTIVATE operations
- [ ] Update all route handlers to pass audit context
- [ ] Test that audit logs are created correctly
- [ ] Verify metadata includes relevant information

## Future Modules

When creating new modules:
1. Follow this pattern from the start
2. Add new resource types to `AUDIT_RESOURCES` if needed
3. Create helper functions for frequently used resources
4. Ensure all mutation operations are logged
