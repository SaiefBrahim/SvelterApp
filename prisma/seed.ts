import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { env } from '$env/dynamic/private';

const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
    adapter,
    log: ['error', 'warn']
});

// SUPER_ADMIN role (global, no organization)
const SUPER_ADMIN_ROLE = {
    name: 'SUPER_ADMIN',
    displayName: 'Super Administrator',
    description: 'System administrator with access to all organizations',
    level: 4,
    isSystem: true,
    organizationId: null
};

// Default organization roles
const DEFAULT_ORG_ROLES = [
    {
        name: 'ADMIN',
        displayName: 'Administrator',
        description: 'Organization administrator with full access within their organization',
        level: 3,
        isSystem: true
    },
    {
        name: 'MANAGER',
        displayName: 'Manager',
        description: 'Organization manager with operational access',
        level: 2,
        isSystem: true
    },
    {
        name: 'OPERATOR',
        displayName: 'Operator',
        description: 'Organization operator with limited access',
        level: 1,
        isSystem: true
    }
];

// Permission definitions
const PERMISSIONS = [
    // User permissions
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View user information' },
    { resource: 'users', action: 'update', description: 'Update user information' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'manage', description: 'Full user management access' },

    // Role permissions
    { resource: 'roles', action: 'read', description: 'View role information' },
    { resource: 'roles', action: 'manage', description: 'Full role management access' },

    // Audit log permissions
    { resource: 'audit_logs', action: 'read', description: 'View audit logs' },

    // Invite permissions
    { resource: 'invites', action: 'read', description: 'View invites' },
    { resource: 'invites', action: 'manage', description: 'Create and revoke invites' },

    // Session permissions
    { resource: 'sessions', action: 'read', description: 'View active sessions' },
    { resource: 'sessions', action: 'manage', description: 'Revoke sessions' },

    // Organization settings permissions
    { resource: 'organization_settings', action: 'read', description: 'View organization settings' },
    { resource: 'organization_settings', action: 'update', description: 'Update organization settings' },
    { resource: 'organization_settings', action: 'manage', description: 'Full organization settings management' }
];

// Role-Permission mappings
const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: [
        'users:manage',
        'roles:manage',
        'audit_logs:read',
        'invites:manage',
        'sessions:manage',
        'organization_settings:manage'
    ],
    MANAGER: ['users:read', 'roles:read', 'sessions:read'],
    OPERATOR: []
};

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Create SUPER_ADMIN role (global, no organization)
    console.log('📋 Creating SUPER_ADMIN role...');
    // Check if SUPER_ADMIN role already exists
    let superAdminRole = await (prisma.role.findFirst as any)({
        where: {
            name: SUPER_ADMIN_ROLE.name,
            organizationId: null
        }
    });

    if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
            data: SUPER_ADMIN_ROLE as any
        });
    } else {
        superAdminRole = await prisma.role.update({
            where: { id: superAdminRole.id },
            data: {
                displayName: SUPER_ADMIN_ROLE.displayName,
                description: SUPER_ADMIN_ROLE.description,
                level: SUPER_ADMIN_ROLE.level
            }
        });
    }
    console.log(`   ✓ Role: ${superAdminRole.displayName}`);

    // Create permissions
    console.log('\n🔐 Creating permissions...');
    const createdPermissions: Record<string, string> = {};

    for (const permission of PERMISSIONS) {
        const key = `${permission.resource}:${permission.action}`;
        const created = await prisma.permission.upsert({
            where: {
                resource_action: {
                    resource: permission.resource,
                    action: permission.action
                }
            },
            update: { description: permission.description },
            create: permission
        });
        createdPermissions[key] = created.id;
        console.log(`   ✓ Permission: ${key}`);
    }

    // SUPER_ADMIN has no permissions (bypasses all checks)
    console.log('\n   ✓ SUPER_ADMIN: No permissions (bypasses all checks)');

    // Create a demo organization
    console.log('\n🏢 Creating demo organization...');

    const demoOrg = await prisma.organization.upsert({
        where: { slug: 'demo-company' },
        update: {},
        create: {
            name: 'Demo Company',
            slug: 'demo-company',
            isActive: true
        }
    });

    console.log(`   ✓ Organization: ${demoOrg.name} (${demoOrg.slug})`);

    // Create default organization settings
    console.log('\n⚙️ Creating organization settings...');
    await (prisma as any).organizationSettings.upsert({
        where: { organizationId: demoOrg.id },
        update: {},
        create: {
            organizationId: demoOrg.id,
            currency: 'USD',
            timezone: 'UTC',
            dateFormat: 'YYYY-MM-DD',
            timeFormat: '24h',
            language: 'en-US'
        }
    });
    console.log(`   ✓ Settings created for ${demoOrg.name}`);

    // Create default roles for the organization
    console.log('\n📋 Creating default roles for organization...');
    const createdRoles: Record<string, string> = {};

    for (const role of DEFAULT_ORG_ROLES) {
        // Check if role already exists
        let existingRole = await (prisma.role.findFirst as any)({
            where: {
                name: role.name,
                organizationId: demoOrg.id
            } as any
        });

        let created;
        if (!existingRole) {
            created = await prisma.role.create({
                data: {
                    ...role,
                    organizationId: demoOrg.id
                } as any
            });
        } else {
            created = await prisma.role.update({
                where: { id: existingRole.id },
                data: {
                    displayName: role.displayName,
                    description: role.description,
                    level: role.level
                }
            });
        }
        createdRoles[role.name] = created.id;
        console.log(`   ✓ Role: ${role.displayName}`);
    }

    // Assign permissions to organization roles
    console.log('\n🔗 Assigning permissions to organization roles...');

    for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        const roleId = createdRoles[roleName];
        if (!roleId) continue;

        // Clear existing permissions
        await prisma.rolePermission.deleteMany({
            where: { roleId }
        });

        // Assign new permissions
        for (const permission of permissions) {
            const permissionId = createdPermissions[permission];
            if (permissionId) {
                await prisma.rolePermission.create({
                    data: { roleId, permissionId }
                });
            }
        }
        console.log(`   ✓ ${roleName}: ${permissions.length} permissions`);
    }

    // Create demo admin for the organization
    console.log('\n👤 Creating demo organization admin...');

    const demoAdminPassword = await bcrypt.hash('svelter2026', 12);

    const demoAdmin = await prisma.user.upsert({
        where: { email: 'admin@svelterapp.com' },
        update: {
            passwordHash: demoAdminPassword,
            roleId: createdRoles['ADMIN'],
            organizationId: demoOrg.id
        },
        create: {
            email: 'admin@svelterapp.com',
            passwordHash: demoAdminPassword,
            firstName: 'Demo',
            lastName: 'Admin',
            roleId: createdRoles['ADMIN'],
            organizationId: demoOrg.id,
            isActive: true
        }
    });

    console.log(`   ✓ Demo Admin: ${demoAdmin.email}`);

    // Create SUPER_ADMIN user
    console.log('\n👑 Creating SUPER_ADMIN user...');

    const superAdminPassword = await bcrypt.hash('svelter2026', 12);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@svelterapp.com' },
        update: {
            passwordHash: superAdminPassword,
            roleId: superAdminRole.id,
            organizationId: null
        },
        create: {
            email: 'superadmin@svelterapp.com',
            passwordHash: superAdminPassword,
            firstName: 'Super',
            lastName: 'Admin',
            roleId: superAdminRole.id,
            organizationId: null,
            isActive: true
        }
    });

    console.log(`   ✓ SUPER_ADMIN: ${superAdmin.email}`);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Login Credentials:');
    console.log('   SUPER_ADMIN:');
    console.log('   Email: superadmin@svelterapp.com');
    console.log('   Password: svelter2026');
    console.log('');
    console.log('   Organization Admin:');
    console.log('   Email: admin@svelterapp.com');
    console.log('   Password: svelter2026');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
