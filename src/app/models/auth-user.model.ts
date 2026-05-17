export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  nombreCompleto: string;
  whatsapp: string | null;
  whatsappVerificado: boolean;
  emailVerificado: boolean;
  esAdmin: boolean;
}
