// Keep the existing Firebase identity mapping for username-only accounts.
export function resolveLoginIdentifier(value: string): string {
  const identifier = value.trim().toLowerCase();
  if (identifier.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      throw new Error('Email không hợp lệ.');
    }
    return identifier;
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(identifier)) {
    throw new Error('Tên tài khoản cần 3–32 ký tự, gồm chữ không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang; bắt đầu bằng chữ hoặc số.');
  }
  return `${identifier}@cdnghe01bqp.edu.vn`;
}
