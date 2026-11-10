export type FieldErrors<T extends string> = Partial<Record<T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(email: string, password: string) {
  const errors: FieldErrors<'email' | 'password'> = {};
  if (!email.trim()) errors.email = 'El correo es obligatorio';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'El correo no tiene un formato válido';
  if (!password) errors.password = 'La contraseña es obligatoria';
  return errors;
}

export function validateRegister(name: string, email: string, password: string) {
  const errors: FieldErrors<'name' | 'email' | 'password'> = validateLogin(email, password);
  if (!name.trim()) errors.name = 'El nombre es obligatorio';
  else if (name.trim().length > 100) errors.name = 'El nombre no puede superar los 100 caracteres';
  if (errors.password) return errors;
  if (password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres';
  else if (password.length > 72) errors.password = 'La contraseña no puede superar los 72 caracteres';
  return errors;
}
