export interface Position {
  id: number;
  role: {
    team_name: string;
    team_logo?: string;
    title: string;
    description: string;
    contact_email?: string;
  };
  recruitment_start: string;
  recruitment_end: string;
  term_from: string;
  term_end: string;
  comment?: string;
  user_app_status: string;
}

export interface Application {
  id: number;
  position_details: Position;
  email: string;
  phone_number?: string;
  study_program?: string;
  status: 'draft' | 'submitted' | 'approved' | 'disapproved' | 'appointed';
  cover_letter: string;
  qualifications: string;
  gdpr: boolean;
  decision_date?: string;
  references?: Reference[];
}

export interface Reference {
  name?: string;
  phone_num?: string;
  title?: string;
  email?: string;
  comment?: string;
}

export interface CreateApplicationData {
  position: number;
  cover_letter: string;
  qualifications: string;
  gdpr: boolean;
  status: 'draft' | 'submitted';
  references?: Reference[];
}
