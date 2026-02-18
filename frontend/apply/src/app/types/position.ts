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
  recruitmentStart: string;
  recruitmentEnd: string;
  termStart: string;
  termEnd: string;
  slotsAvailable: number;
}

export interface Application {
  id: string;
  title: string;
  status: string;
  termStart: string;
  termEnd: string;
}
