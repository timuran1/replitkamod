import { type Request, type Response, type NextFunction } from "express";
import { getSupabaseAdmin } from "../lib/supabaseAdmin";

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Войдите в аккаунт для генерации контента" });
  }

  try {
    const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "unauthorized", message: "Сессия истекла. Войдите снова." });
    }
    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Недействительный токен" });
  }
}
