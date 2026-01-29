export interface Team {
  id: number;
  name_en: string;
  name_sv: string;
}

export interface Role {
  id: number;
  title_en: string;
  title_sv: string;
  description_en: string;
  description_sv: string;
  contact_email: string | null;
  team: Team;
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
  title_en: string;
  title_sv: string;
  status: string;
  term_start: string;
  term_end: string;
}
