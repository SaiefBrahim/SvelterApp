# SvelterApp

<div align="center">

**A modern, production-ready SvelteKit dashboard starter with fully functional Role-Based Access Control (RBAC)**

[![Svelte](https://img.shields.io/badge/Svelte-5.45.6-FF3E00?logo=svelte)](https://svelte.dev)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.49.1-FF3E00?logo=svelte)](https://kit.svelte.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.2.0-2D3748?logo=prisma)](https://www.prisma.io)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 📖 Introduction

**SvelterApp** is a comprehensive, open-source SvelteKit dashboard starter template designed for building modern SaaS applications and admin dashboards. It comes with a fully functional **Role-Based Access Control (RBAC)** system, multi-tenant organization support, and a beautiful, responsive UI built with modern web technologies.

### 🎯 Use Cases

- **SaaS Applications**: Build multi-tenant SaaS platforms with organization management
- **Admin Dashboards**: Create powerful admin panels with granular permission control
- **Enterprise Applications**: Deploy enterprise-grade applications with robust authentication and authorization
- **Internal Tools**: Develop internal management tools with role-based access
- **Startup MVPs**: Quickly bootstrap your next project with production-ready features

### ✨ Key Features

- 🔐 **Complete Authentication System**
  - Email/password authentication with Auth.js (NextAuth)
  - Password reset and email verification flows
  - Secure session management
  - Email change confirmation

- 🛡️ **Role-Based Access Control (RBAC)**
  - Multi-level role hierarchy (Super Admin, Admin, Manager, Operator)
  - Granular permission system (resource:action pattern)
  - Role-based route protection
  - Permission-based UI rendering
  - Organization-scoped roles

- 🏢 **Multi-Tenant Architecture**
  - Organization/tenant isolation
  - Organization settings management
  - Tax identifier support
  - Organization-specific user management

- 👥 **User Management**
  - User CRUD operations
  - User invitations system
  - Active session management
  - User profile management
  - Email change workflow

- 📊 **Dashboard & Analytics**
  - Real-time statistics
  - Audit logging system
  - Activity tracking
  - Export capabilities

- 🌍 **Internationalization (i18n)**
  - Multi-language support (English, French, Arabic)
  - Paraglide.js integration
  - RTL layout support
  - Language switching

- 🎨 **Modern UI/UX**
  - Shadcn-svelte components
  - Tailwind CSS 4 with utility-first styling
  - Responsive design
  - Dark mode support (via mode-watcher)
  - Accessible components
  - Beautiful data tables

- 📧 **Email Service**
  - Resend integration
  - Email templates
  - Transactional emails

- 🔍 **Audit Logging**
  - Comprehensive action tracking
  - IP address and user agent logging
  - Metadata support
  - Filterable audit logs

### 🛠️ Technologies & Libraries

#### Core Framework
- **[Svelte 5](https://svelte.dev)** - The latest version with runes (`$state`, `$derived`, `$effect`)
- **[SvelteKit 2](https://kit.svelte.dev)** - Full-stack framework with SSR and file-based routing
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development

#### Database & ORM
- **[Prisma 7](https://www.prisma.io)** - Next-generation ORM with driver adapters
- **[PostgreSQL](https://www.postgresql.org)** - Robust relational database
- **[Prisma Adapter for PostgreSQL](https://www.prisma.io/docs/concepts/components/prisma-adapter)** - Optimized database connections

#### Authentication & Security
- **[Auth.js (SvelteKit)](https://authjs.dev)** - Complete authentication solution
- **[Prisma Adapter for Auth.js](https://authjs.dev/reference/adapter/prisma)** - Database session strategy
- **[bcryptjs](https://www.npmjs.com/package/bcryptjs)** - Password hashing

#### UI Components & Styling
- **[Shadcn-svelte](https://www.shadcn-svelte.com)** - Beautiful, accessible component library
- **[Tailwind CSS 4](https://tailwindcss.com)** - Utility-first CSS framework
- **[Bits UI](https://bits-ui.com)** - Headless UI primitives
- **[Lucide Svelte](https://lucide.dev)** - Beautiful icon library
- **[Svelte Sonner](https://svelte-sonner.vercel.app)** - Toast notifications

#### Forms & Validation
- **[SvelteKit Superforms](https://superforms.rocks)** - Form handling and validation
- **[Formsnap](https://formsnap.dev)** - Form component library
- **[Zod](https://zod.dev)** - Schema validation

#### Internationalization
- **[Paraglide.js](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)** - Compile-time i18n
- **[Inlang](https://inlang.com)** - Translation management

#### Email Service
- **[Resend](https://resend.com)** - Modern email API

#### Development Tools
- **[Vite](https://vitejs.dev)** - Next-generation build tool
- **[tsx](https://github.com/esbuild-kit/tsx)** - TypeScript execution
- **[Svelte Check](https://github.com/sveltejs/svelte-check)** - Type checking

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ (recommended: 20+)
- **pnpm** (recommended) or npm/yarn
- **PostgreSQL** 14+ (running locally or via cloud service)
- **Git**

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/SaiefBrahim/SvelterApp.git
cd SvelterApp
```

2. **Install dependencies**

```bash
pnpm install
# or
npm install
```

3. **Set up environment variables**

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/svelterapp?schema=public"

# Auth.js Configuration
# Generate with: npx auth secret
AUTH_SECRET="your_auth_secret"
AUTH_TRUST_HOST=true

# Application
ENVIRONMENT="development"
PUBLIC_APP_NAME="Svelter App"
PUBLIC_APP_URL="http://localhost:5173"

# Resend Email Service (optional for development)
RESEND_API_KEY=
MAILER_ADDRESS="SvelterApp <noreply@svelterapp.com>"
```

**Important**: Generate a secure `AUTH_SECRET`:

```bash
npx auth secret
```

4. **Set up the database**

```bash
# Generate Prisma Client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed the database with initial data
pnpm db:seed
```

The seed script will create:
- System roles (SUPER_ADMIN, ADMIN, MANAGER, OPERATOR)
- Default permissions
- A super admin user (email: `admin@svelterapp.com`, password: `admin123`)
- Sample organization and users

5. **Compile i18n messages**

```bash
pnpm lang:compile
```

6. **Start the development server**

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Default Login Credentials

After seeding the database, you can log in with:

- **Email**: `admin@svelterapp.com`
- **Password**: `admin123`

**⚠️ Important**: Change the default password in production!

### Available Scripts

| Command | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm check` | Run type checking |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:reset` | Reset database (⚠️ destructive) |
| `pnpm lang:compile` | Compile i18n messages |

---

## 📚 Documentation

### Project Structure

```
svelterapp/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Database seeding script
│   └── migrations/            # Database migrations
├── src/
│   ├── lib/
│   │   ├── components/        # Reusable components
│   │   │   ├── ui/           # Shadcn-svelte components
│   │   │   └── layout/       # Layout components
│   │   ├── server/
│   │   │   ├── auth/         # Authentication logic
│   │   │   ├── db/           # Database connection
│   │   │   ├── rbac/         # RBAC guards and permissions
│   │   │   └── services/     # Business logic services
│   │   └── utils/            # Utility functions
│   └── routes/
│       ├── (app)/            # Protected routes
│       ├── (auth)/           # Authentication routes
│       └── api/              # API endpoints
├── messages/                  # i18n translation files
├── static/                    # Static assets
└── project.inlang/           # Inlang configuration
```

### RBAC System

The RBAC system is built on a hierarchical role structure:

1. **SUPER_ADMIN** (Level 4)
   - Global access across all organizations
   - Bypasses all permission checks
   - System-level administration

2. **ADMIN** (Level 3)
   - Full access within their organization
   - Can manage users, roles, invites, sessions
   - Organization settings management

3. **MANAGER** (Level 2)
   - Read access to users and roles
   - View active sessions
   - Limited operational access

4. **OPERATOR** (Level 1)
   - Minimal permissions
   - Basic profile access

### Permissions

Permissions follow the `resource:action` pattern:
- `users:create`, `users:read`, `users:update`, `users:delete`, `users:manage`
- `roles:read`, `roles:manage`
- `audit_logs:read`
- `invites:read`, `invites:manage`
- `sessions:read`, `sessions:manage`
- `organization_settings:read`, `organization_settings:update`, `organization_settings:manage`

### Adding New Permissions

1. Add permission to `src/lib/server/rbac/permissions.ts`
2. Add to database seed in `prisma/seed.ts`
3. Assign to roles in `DEFAULT_ROLE_PERMISSIONS`
4. Use in route guards: `requirePermission(event, 'resource:action')`

---

## 🤝 Contributing

We welcome contributions! SvelterApp is an open-source project, and we appreciate your help in making it better.

### How to Contribute

1. **Fork the repository**

2. **Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**

   - Follow the existing code style
   - Write clear commit messages
   - Add tests if applicable
   - Update documentation as needed

4. **Commit your changes**

```bash
git commit -m "Add amazing feature"
```

5. **Push to the branch**

```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request**

   - Provide a clear description of your changes
   - Reference any related issues
   - Include screenshots for UI changes

### Development Guidelines

- **Code Style**: Follow TypeScript and Svelte best practices
- **Type Safety**: Maintain strict TypeScript types
- **Components**: Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- **Styling**: Use Tailwind CSS utility classes
- **Components**: Import from `$lib/components/ui` for UI components
- **RBAC**: Always use permission guards for protected routes
- **i18n**: Add translations for all user-facing strings

### Reporting Issues

If you find a bug or have a feature request:

1. Check if the issue already exists
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)

### Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Svelte](https://svelte.dev) team for the amazing framework
- [Shadcn](https://ui.shadcn.com) for the beautiful component library
- [Auth.js](https://authjs.dev) for authentication
- [Prisma](https://www.prisma.io) for the excellent ORM
- All contributors and the open-source community

---

## 📞 Support

- **Documentation**: Check the inline code comments and this README
- **Issues**: [GitHub Issues](https://github.com/SaiefBrahim/SvelterApp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SaiefBrahim/SvelterApp/discussions)

---

<div align="center">

**Built with ❤️ using SvelteKit**

[⭐ Star us on GitHub](https://github.com/SaiefBrahim/SvelterApp) • [🐛 Report Bug](https://github.com/SaiefBrahim/SvelterApp/issues) • [💡 Request Feature](https://github.com/SaiefBrahim/SvelterApp/issues)

</div>
