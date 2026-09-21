import bcrypt from 'bcryptjs';
import { query } from '../../db/index.js';
import { env } from '../../config/env.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import {
  type UserRow,
  type UserSanitized,
  sanitizeUser,
} from '../auth/auth.service.js';
import type { UpdateProfileInput } from '../auth/auth.schema.js';

export class UsersService {
  /**
   * Get current user profile
   */
  public static async getProfile(userId: string): Promise<UserSanitized> {
    const { rows } = await query<UserRow>('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    if (!rows.length) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }
    return sanitizeUser(rows[0]);
  }

  /**
   * Update profile information
   */
  public static async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserSanitized> {
    const { rows: existingRows } = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (!existingRows.length) {
      throw new NotFoundError('Không tìm thấy tài khoản người dùng');
    }

    const user = existingRows[0];

    let newPasswordHash: string | undefined;
    if (input.newPassword) {
      if (!input.currentPassword) {
        throw new BadRequestError('Vui lòng cung cấp mật khẩu hiện tại để đổi mật khẩu mới');
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        input.currentPassword,
        user.password_hash
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestError('Mật khẩu hiện tại không chính xác');
      }

      newPasswordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    }

    const updatedDisplayName = input.displayName !== undefined ? input.displayName : user.display_name;
    const updatedAvatarUrl = input.avatarUrl !== undefined ? input.avatarUrl : user.avatar_url;
    const finalPasswordHash = newPasswordHash || user.password_hash;

    const { rows: updatedRows } = await query<UserRow>(
      `UPDATE users
       SET display_name = $1,
           full_name = $1,
           avatar_url = $2,
           password_hash = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [updatedDisplayName, updatedAvatarUrl, finalPasswordHash, userId]
    );

    return sanitizeUser(updatedRows[0]);
  }
}
