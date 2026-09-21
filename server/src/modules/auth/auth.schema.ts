import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập địa chỉ email' })
    .email('Địa chỉ email không đúng định dạng')
    .toLowerCase()
    .trim(),
  username: z
    .string({ required_error: 'Vui lòng nhập tên người dùng' })
    .min(3, 'Tên người dùng phải có ít nhất 3 ký tự')
    .max(30, 'Tên người dùng không được vượt quá 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới (_)')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(8, 'Mật khẩu phải có độ dài tối thiểu 8 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(100, 'Tên hiển thị không được vượt quá 100 ký tự')
    .trim()
    .optional(),
});

export const loginSchema = z.object({
  login: z
    .string({ required_error: 'Vui lòng nhập email hoặc tên người dùng' })
    .min(1, 'Vui lòng nhập email hoặc tên người dùng')
    .trim(),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu'),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Tên hiển thị phải có ít nhất 2 ký tự')
    .max(100, 'Tên hiển thị không được vượt quá 100 ký tự')
    .trim()
    .optional(),
  avatarUrl: z
    .string()
    .url('URL ảnh đại diện không hợp lệ')
    .optional()
    .or(z.literal('')),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'Mật khẩu mới phải có tối thiểu 8 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ cái')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
    .optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.currentPassword) {
      return false;
    }
    return true;
  },
  {
    message: 'Vui lòng cung cấp mật khẩu hiện tại để đổi mật khẩu mới',
    path: ['currentPassword'],
  }
);

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
