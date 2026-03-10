import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string) {
  return bcrypt.hash(plainTextPassword, BCRYPT_ROUNDS);
}

export async function verifyPassword(plainTextPassword: string, passwordHash: string) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
