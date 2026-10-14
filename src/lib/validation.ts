import { z } from 'zod';
import DOMPurify from 'dompurify';
import { isValidCPF } from './cpf-validation';

// Sanitization utility
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input.trim());
};

// Common validation patterns
const PASSWORD_MIN_LENGTH = 8;
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} dígitos (ex: 10203040)`)
  .max(72, 'Senha deve ter no máximo 72 caracteres');

const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF deve estar no formato 000.000.000-00')
  .refine((val) => isValidCPF(val), { message: 'CPF inválido. Verifique os dígitos.' });

const phoneSchema = z
  .string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/, 'Telefone deve estar no formato (11) 99999-9999');

// User authentication schemas
export const loginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform(sanitizeInput),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  cpf: cpfSchema.transform(sanitizeInput),
  phone: phoneSchema.transform(sanitizeInput),
  password: passwordSchema
});

// Admin authentication schemas
export const adminLoginSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
});

export const adminRegisterSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform(sanitizeInput),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Partner signup schema
export const partnerSignUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform(sanitizeInput),
  companyName: z
    .string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da empresa deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s&.-]+$/, 'Nome da empresa contém caracteres inválidos')
    .transform(sanitizeInput),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ deve estar no formato 00.000.000/0000-00')
    .transform(sanitizeInput),
  phone: phoneSchema.transform(sanitizeInput),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  password: passwordSchema,
  confirmPassword: z.string(),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Affiliate signup schema
export const affiliateSignUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
    .transform(sanitizeInput),
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .transform(sanitizeInput),
  phone: phoneSchema.transform(sanitizeInput),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Enhanced validation schemas for sensitive operations
export const companySchema = z.object({
  name: z
    .string()
    .min(2, 'Nome da empresa deve ter pelo menos 2 caracteres')
    .max(100, 'Nome da empresa deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s&.-]+$/, 'Nome da empresa contém caracteres inválidos')
    .transform(sanitizeInput),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'CNPJ deve estar no formato 00.000.000/0000-00')
    .transform(sanitizeInput),
  email: z
    .string()
    .email('Email inválido')
    .transform(sanitizeInput),
  phone: phoneSchema.optional(),
  website: z
    .string()
    .url('Website deve ser uma URL válida')
    .optional()
    .transform((val) => val ? sanitizeInput(val) : undefined)
});

export const voucherSchema = z.object({
  title: z
    .string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .transform(sanitizeInput),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .transform(sanitizeInput),
  discount_value: z
    .number()
    .positive('Valor do desconto deve ser positivo')
    .max(10000, 'Valor do desconto muito alto'),
  original_price: z
    .number()
    .positive('Preço original deve ser positivo')
    .max(100000, 'Preço original muito alto')
});

// Security: Enhanced password validation
export const strongPasswordSchema = z
  .string()
  .min(12, 'Senha deve ter pelo menos 12 caracteres para maior segurança')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Senha deve conter pelo menos: 1 minúscula, 1 maiúscula, 1 número e 1 caractere especial')
  .refine((password) => {
    // Check for common patterns
    const commonPatterns = [
      /123456/, /password/, /admin/, /qwerty/, /abc123/,
      /(?:(.)\1{2,})/, // Repeated characters
    ];
    return !commonPatterns.some(pattern => pattern.test(password.toLowerCase()));
  }, 'Senha não pode conter padrões comuns ou caracteres repetidos');

// Utility function to format validation errors
export const formatValidationErrors = (error: z.ZodError): string => {
  return error.issues.map(issue => issue.message).join(', ');
};