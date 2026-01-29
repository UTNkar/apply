export interface Role {
  id: number;
  title: string;
  description: string;
  contact_email: string | null;
  team_name: string;
  team_logo: string;
}

export interface Position {
  id: number;
  role: Role;
  recruitment_start: string;
  recruitment_end: string;
  term_start: string;
  term_end: string;
  slots_available: number;
}

export interface Application {
  id: number;
  title: string;
  status: string;
  term_start: string;
  term_end: string;
}
