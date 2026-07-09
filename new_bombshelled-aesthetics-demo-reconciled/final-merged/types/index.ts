export type ProcedureCategory = 'surgical' | 'non-surgical'

export type SurgicalInterest =
  | 'breast-augmentation' | 'breast-lift' | 'breast-reduction' | 'breast-revision'
  | 'tummy-tuck' | 'liposuction' | 'bbl' | 'facelift' | 'eyelid-surgery'
  | 'rhinoplasty' | 'body-contouring' | 'other-surgical'

export type NonSurgicalInterest =
  | 'filler' | 'microdermabrasion' | 'skin-rejuvenation' | 'other-nonsurgical'

export type SpecificInterest = SurgicalInterest | NonSurgicalInterest
export type Timeline = 'ready-to-book' | 'exploring' | 'just-researching'
export type PatientLocation = 'local' | 'out-of-town'
export type ConsultationPreference = 'in-person' | 'virtual'

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  procedure_category: ProcedureCategory
  specific_interest: SpecificInterest
  timeline: Timeline
  patient_location: PatientLocation
  travel_origin_city?: string
  needs_travel_logistics?: number
  consultation_preference: ConsultationPreference
  notes?: string
  score: number
  status: 'new' | 'qualifying' | 'qualified' | 'booked' | 'lost'
  ai_summary?: string
  created_at: string
}

export interface Appointment {
  id: string
  lead_id: string
  slot_date: string
  slot_time: string
  consultation_type: ConsultationPreference
  confirmed: number
  created_at: string
}

export interface SMSLog {
  id: string
  lead_id: string
  direction: 'inbound' | 'outbound'
  body: string
  sent_at: string
}

export interface CalendarSlot {
  date: string
  time: string
  available: boolean
}
