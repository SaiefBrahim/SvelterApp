import { z } from 'zod/v3';

// ============================================
// AUTH SCHEMAS
// ============================================
export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required')
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long')
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export type SignupSchema = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email('Please enter a valid email address')
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

// ============================================
// USER SCHEMAS
// ============================================
export const createUserSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
    roleId: z.string().min(1, 'Role is required'),
    organizationId: z.string().optional(),
    isActive: z.boolean().default(true)
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
    email: z.string().email('Please enter a valid email address').optional(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .optional()
        .or(z.literal('')),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long').optional(),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long').optional(),
    roleId: z.string().min(1, 'Role is required').optional(),
    isActive: z.boolean().optional()
});

export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

// ============================================
// ORGANIZATION SCHEMAS
// ============================================
export const createOrganizationSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    slug: z
        .string()
        .min(1, 'Slug is required')
        .max(50, 'Slug is too long')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    isActive: z.boolean().default(true)
});

export type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
    slug: z
        .string()
        .min(1, 'Slug is required')
        .max(50, 'Slug is too long')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
        .optional(),
    isActive: z.boolean().optional()
});

export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;

// ============================================
// COMMON SCHEMAS
// ============================================
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10)
});

export type PaginationSchema = z.infer<typeof paginationSchema>;

export const searchSchema = z.object({
    search: z.string().optional(),
    ...paginationSchema.shape
});

export type SearchSchema = z.infer<typeof searchSchema>;

// ============================================
// ID PARAM SCHEMA
// ============================================
export const idParamSchema = z.object({
    id: z.string().min(1, 'ID is required')
});

export type IdParamSchema = z.infer<typeof idParamSchema>;

// ============================================
// PROFILE SETTINGS SCHEMAS
// ============================================
export const updateProfileSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long')
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;

export const requestEmailChangeSchema = z.object({
    newEmail: z.string().email('Please enter a valid email address')
});

export type RequestEmailChangeSchema = z.infer<typeof requestEmailChangeSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
});

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
