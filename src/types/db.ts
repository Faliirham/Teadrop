export type Role = "admin" | "member";
export type PaymentMethod = "cash" | "transfer" | "qris" | "other";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  default_amount: number;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  profile?: Profile;
}

export interface Period {
  id: string;
  circle_id: string;
  name: string;
  start_date: string;
  due_date: string;
  amount_per_member: number;
  is_closed: boolean;
  created_at: string;
}

export interface Contribution {
  id: string;
  period_id: string;
  member_id: string;
  amount: number;
  paid_at: string;
  method: PaymentMethod;
  note: string | null;
  recorded_by: string;
  created_at: string;
}

export interface BalanceUpdate {
  id: string;
  circle_id: string;
  previous_amount: number;
  new_amount: number;
  note: string;
  recorded_by: string;
  created_at: string;
}

/** Kontribusi + data anggota & profil untuk tampilan riwayat */
export interface ContributionWithMember extends Contribution {
  member?: CircleMember;
}
