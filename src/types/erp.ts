import { z } from 'zod';

// ============================================================================
// Core Enums and Types
// ============================================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'HEAD_OF_FACULTY'
  | 'HEAD_OF_SCHOOL'
  | 'HOD'
  | 'COURSE_COORDINATOR'
  | 'COURSE_FACULTY'
  | 'DEAN'
  | 'STUDENT';

export type BloomsTaxonomyLevel =
  | 'REMEMBER'
  | 'UNDERSTAND'
  | 'APPLY'
  | 'ANALYZE'
  | 'EVALUATE'
  | 'CREATE';

export type AssessmentWindowStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SUBMITTED'
  | 'FROZEN'
  | 'LOCKED'
  | 'FINALIZED'
  | 'UNLOCKED_BY_ADMIN';

export type MarkEntryStatusCode =
  | 'PRESENT'
  | 'ABSENT'
  | 'MALPRACTICE'
  | 'EXEMPTED'
  | 'NOT_EVALUATED';

export type ComponentType = 'CIE' | 'SEE';

export type OutcomeType = 'PO' | 'PSO';

export type AppTheme = 'obsidian-black' | 'clean-light';

export type MenuItemId =
  | 'org-structure'
  | 'regulations'
  | 'programs-outcomes'
  | 'terms'
  | 'courses'
  | 'scoring-components'
  | 'assessment-papers'
  | 'mark-entry'
  | 'co-reports'
  | 'db-manager';

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const MarkEntryInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  questionId: z.string().uuid(),
  statusCode: z.enum(['PRESENT', 'ABSENT', 'MALPRACTICE', 'EXEMPTED', 'NOT_EVALUATED']),
  marksObtained: z.number().min(0).nullable(),
  remarks: z.string().optional(),
});

export const BulkMarkSubmissionSchema = z.object({
  assessmentWindowId: z.string().uuid(),
  sectionId: z.string().uuid(),
  entries: z.array(MarkEntryInputSchema),
});

export const EmergencyUnlockSchema = z.object({
  assessmentWindowId: z.string().uuid(),
  reason: z.string().min(10, 'A comprehensive reason (min 10 chars) is required for audit log compliance'),
  extendedDeadline: z.string().datetime(),
});

export const CoPoMappingSchema = z.object({
  courseOutcomeId: z.string().uuid(),
  programOutcomeId: z.string().uuid(),
  mappingLevel: z.number().int().min(0).max(3),
  justification: z.string().optional(),
});

// ============================================================================
// Domain Entities
// ============================================================================

export interface OrganizationTenant {
  id: string;
  code: string;
  name: string;
  subdomain: string;
  logoUrl?: string;
  mfaEnforced: boolean;
}

export interface AcademicFaculty {
  id: string;
  code: string;
  name: string;
  headUserId?: string; // Mapped Head of Faculty User ID
  headUserName?: string;
}

export interface AcademicSchool {
  id: string;
  facultyId: string;
  code: string;
  name: string;
  headUserId?: string; // Mapped Head of School User ID
  headUserName?: string;
}

export interface AcademicDepartment {
  id: string;
  schoolId: string;
  code: string;
  name: string;
  headUserId?: string; // Mapped Head of Department (HOD) User ID
  headUserName?: string;
}

export interface AcademicRegulation {
  id: string;
  code: string; // e.g. "R2026"
  name: string; // e.g. "Autonomous Academic Regulations 2026"
  yearOfInception: number; // e.g. 2026
  totalCredits: number; // e.g. 160
  gradeSystem: string; // e.g. "10-Point Relative Grading"
  description?: string;
}

export interface AcademicProgram {
  id: string;
  departmentId: string;
  regulationId?: string;
  code: string;
  name: string;
  degreeType: string;
  totalTerms: number;
  batchYear?: string; // e.g. "2026-2030"
}

export interface AcademicTerm {
  id: string;
  programId?: string;
  code: string; // e.g. "TERM-2026-SEM1"
  name: string; // e.g. "Semester I - Batch 2026"
  academicYear: string; // e.g. "2026-2027"
  termNumber: number; // e.g. 1
  startDate: string; // e.g. "2026-08-01"
  endDate: string; // e.g. "2026-12-15"
}

export interface ScoringScheme {
  id: string;
  courseId?: string; // Connected to each Course
  code: string; // e.g. "SCHEME-CS2601"
  name: string; // e.g. "Theory Assessment Scheme (Batch 2026)"
  cieWeight: number; // e.g. 40
  seeWeight: number; // e.g. 60
}

export interface ScoringSubComponent {
  id: string;
  courseId?: string; // Connected to the Course
  schemeId: string; // Connected to the Scoring Scheme
  type: 'CIE' | 'SEE';
  name: string; // e.g. "Continuous Internal Evaluation 1 (CIE-1)", "Lab Assessment"
  maxMarks: number;
  weightPercentage: number;
  questionPaperId?: string; // Each Sub Component has an associated Question Paper
}

export interface CourseSection {
  id: string;
  courseId: string;
  name: string; // e.g. "Section A", "Section B"
  facultyId?: string; // Mapped Faculty User ID
  facultyName?: string; // Mapped Faculty Name
  academicYear?: string; // e.g. "2026-2027"
}

export interface QuestionPaperSection {
  id: string;
  questionPaperId: string;
  sectionName: string; // e.g. "Section A - Objective", "Section B - Analytical"
  instructions?: string; // e.g. "Answer ALL questions" or "Answer any 3 out of 5 questions"
  choiceRule: 'ALL' | 'ANY_N'; // "Answer ALL" vs "Answer ANY N"
  questionsToAnswer?: number; // e.g. 3 (if ANY_N)
  totalQuestions?: number;
  displayOrder: number;
}

export interface QuestionPaper {
  id: string;
  courseId: string;
  subComponentId: string;
  subComponentName?: string;
  title: string; // e.g. "CIE-1 Question Paper (Batch 2026)"
  totalMarks: number;
  instructions?: string;
  templateId?: string;
}

export interface QuestionPaperTemplate {
  id: string;
  name: string; // e.g. "Standard CIE 50-Marks Blueprint"
  description?: string;
  totalMarks: number;
  sections: Array<{
    id: string;
    sectionName: string;
    instructions?: string;
    choiceRule: 'ALL' | 'ANY_N';
    questionsToAnswer?: number;
    totalQuestions: number;
    marksPerQuestion: number;
    hasOptions?: boolean; // Option A or Option B
    hasParts?: boolean; // Part questions (a, b)
    defaultBlooms?: BloomsTaxonomyLevel;
    questions?: Array<{
      questionNumber: string;
      partLabel?: string;
      isOption?: boolean;
      optionGroup?: string;
      optionLabel?: string;
      content?: string;
      maxMarks: number;
      coCode: string; // Restores Question-Wise CO (e.g. "CO1", "CO2")
      bloomsLevel: BloomsTaxonomyLevel;
      displayOrder: number;
    }>;
  }>;
}

export interface CourseOutcomeItem {
  id: string;
  courseId: string;
  code: string; // e.g. "CO1"
  statement: string;
  bloomsLevel: BloomsTaxonomyLevel;
}

export interface ProgramOutcomeItem {
  id: string;
  programId: string;
  code: string; // "PO1" - "PO12" or "PSO1" - "PSO3"
  type: OutcomeType;
  title: string;
  description: string;
  targetThresholdPct: number; // e.g. 60.0
  targetLevel: number;        // e.g. 2.5 on scale of 3.0
}

export interface QuestionItem {
  id: string;
  questionPaperId: string;
  sectionId?: string; // Belongs to QuestionPaperSection
  questionNumber: string; // e.g. "Q1", "1", "Q1(a)"
  partLabel?: string; // e.g. "a", "b", "c" or "(i)", "(ii)"
  parentQuestionId?: string; // For nested part questions
  isOption?: boolean; // Option question (Option A vs Option B / Either-Or)
  optionGroup?: string; // Grouping identifier (e.g. "OPT_1")
  optionLabel?: string; // e.g. "Option A", "Option B" or "OR"
  content?: string; // Rich Text & KaTeX / LaTeX - OPTIONAL
  imageUrl?: string; // Diagram / Equation figure URL or Base64 Data URL
  imageCaption?: string; // Caption for diagram (e.g. "Figure 1: State Diagram")
  maxMarks: number;
  courseOutcomeId: string;
  bloomsLevel: BloomsTaxonomyLevel;
  targetThresholdPct: number; // default 60%
  displayOrder: number;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  avatarUrl?: string;
  enrollmentStatus: 'ACTIVE' | 'DROPPED' | 'WITHDRAWN';
  courseId?: string; // Enrolled Course
  sectionId?: string; // Grouped into Course Section
}

export interface MarkEntryRecord {
  id: string;
  assessmentWindowId: string;
  enrollmentId: string;
  questionId: string;
  statusCode: MarkEntryStatusCode;
  marksObtained: number | null;
  remarks?: string;
}

export interface AssessmentWindowRecord {
  id: string;
  courseId?: string; // Connected Course
  sectionId: string; // Connected Course Section
  subComponentId: string;
  subComponentName: string;
  questionPaperId: string;
  status: AssessmentWindowStatus;
  facultyId?: string; // Specific assigned faculty to enter marks
  facultyName?: string; // Assigned faculty name
  openDateTime: string; // Start date & time range
  closeDateTime: string; // Deadline configured by admin
  emergencyCloseDate?: string;
  frozenAt?: string;
  frozenBy?: string;
  submittedAt?: string;
  submittedBy?: string;
  unlockAuditReason?: string;
}

export interface DeadlineExtensionRequest {
  id: string;
  windowId: string;
  windowName: string;
  courseId: string;
  courseCode?: string;
  sectionId?: string;
  sectionName?: string;
  facultyId: string;
  facultyName: string;
  currentCloseDateTime: string;
  requestedCloseDateTime: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedByRole?: UserRole;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  isMfaEnabled: boolean;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: string;
  isMfaEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_PASSWORD_SETUP' | 'PENDING_APPROVAL';
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  createdByUserId?: string;
  createdByRole?: UserRole;
  createdByName?: string;
  rejectionReason?: string;
  createdAt: string;
  passwordHash?: string;
  setupOtp?: string;
  setupOtpExpiresAt?: string;
  hasCompletedInitialReset?: boolean; // First reset / initial setup done?
  passwordResetLocked?: boolean; // Locked after 1st reset. Only Main Admin can unlock/reset!
  resetOtp?: string;
  resetOtpExpiresAt?: string;
}

export interface CourseRecord {
  id: string;
  programId?: string; // Connected Academic Program
  code: string;
  title: string;
  credits: number;
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  term: string;
  coordinator?: string;
  coordinatorId?: string; // Mapped Faculty User ID
  regulation: string;
}

export interface EmailSmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  senderName: string;
  senderEmail: string;
  username: string;
  password?: string;
  isConfigured: boolean;
}

export interface OutgoingEmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  type:
    | 'FIRST_TIME_SETUP'
    | 'FORGOT_PASSWORD'
    | 'ADMIN_RESET'
    | 'TEST_EMAIL'
    | 'MARK_ENTRY_ALLOCATION'
    | 'DEADLINE_EXTENSION'
    | 'GENERAL_NOTIFICATION';
  body?: string;
  otp?: string;
  link?: string;
  sentAt: string;
  status: 'DELIVERED' | 'SIMULATED';
}

export interface CoPoMappingRecord {
  courseOutcomeId: string;
  programOutcomeId: string;
  mappingLevel: number;
  justification?: string;
}

