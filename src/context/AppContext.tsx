'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  OrganizationTenant,
  AdminUser,
  UserAccount,
  AcademicFaculty,
  AcademicSchool,
  AcademicDepartment,
  AcademicRegulation,
  AcademicProgram,
  AcademicTerm,
  CourseRecord,
  CourseOutcomeItem,
  ProgramOutcomeItem,
  CoPoMappingRecord,
  ScoringScheme,
  ScoringSubComponent,
  CourseSection,
  QuestionPaper,
  QuestionPaperSection,
  QuestionPaperTemplate,
  StudentEnrollment,
  QuestionItem,
  MarkEntryRecord,
  AssessmentWindowRecord,
  MarkEntryStatusCode,
  UserRole,
  BloomsTaxonomyLevel,
  AppTheme,
  MenuItemId,
  EmailSmtpConfig,
  OutgoingEmailNotification,
} from '@/types/erp';
import { computeAcademicScope, AcademicRoleScope, requiresAdminApproval } from '@/lib/permissions';
export type { AcademicRoleScope } from '@/lib/permissions';

export const DEFAULT_QUESTION_PAPER_TEMPLATES: QuestionPaperTemplate[] = [
  {
    id: 'tpl-cie-50',
    name: 'Standard CIE 50-Marks Blueprint (Batch 2026)',
    description:
      'Section A: 5 Compulsory Questions (2M each = 10M); Section B: 4 Questions with Option A/B choice & Parts a/b (10M each = 40M). Restores Question-Wise COs.',
    totalMarks: 50,
    sections: [
      {
        id: 'sec-tpl-a',
        sectionName: 'Section A - Fundamental Knowledge',
        choiceRule: 'ALL',
        questionsToAnswer: 5,
        totalQuestions: 5,
        marksPerQuestion: 2,
        hasOptions: false,
        hasParts: false,
        defaultBlooms: 'REMEMBER',
        questions: [
          { questionNumber: 'Q1', maxMarks: 2, coCode: 'CO1', bloomsLevel: 'REMEMBER', displayOrder: 1 },
          { questionNumber: 'Q2', maxMarks: 2, coCode: 'CO1', bloomsLevel: 'REMEMBER', displayOrder: 2 },
          { questionNumber: 'Q3', maxMarks: 2, coCode: 'CO2', bloomsLevel: 'UNDERSTAND', displayOrder: 3 },
          { questionNumber: 'Q4', maxMarks: 2, coCode: 'CO2', bloomsLevel: 'UNDERSTAND', displayOrder: 4 },
          { questionNumber: 'Q5', maxMarks: 2, coCode: 'CO3', bloomsLevel: 'UNDERSTAND', displayOrder: 5 },
        ],
      },
      {
        id: 'sec-tpl-b',
        sectionName: 'Section B - Problem Solving & Analysis',
        choiceRule: 'ANY_N',
        questionsToAnswer: 4,
        totalQuestions: 4,
        marksPerQuestion: 10,
        hasOptions: true,
        hasParts: true,
        defaultBlooms: 'APPLY',
        questions: [
          // Q6 Option A (a & b)
          { questionNumber: 'Q6(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q6', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 6 },
          { questionNumber: 'Q6(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q6', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 7 },
          // Q6 Option B (a & b)
          { questionNumber: 'Q6 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q6', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 8 },
          { questionNumber: 'Q6 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q6', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 9 },

          // Q7 Option A (a & b)
          { questionNumber: 'Q7(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q7', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 10 },
          { questionNumber: 'Q7(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q7', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 11 },
          // Q7 Option B (a & b)
          { questionNumber: 'Q7 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q7', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 12 },
          { questionNumber: 'Q7 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q7', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 13 },

          // Q8 Option A (a & b)
          { questionNumber: 'Q8(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q8', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 14 },
          { questionNumber: 'Q8(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q8', optionLabel: 'Option A', maxMarks: 5, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 15 },
          // Q8 Option B (a & b)
          { questionNumber: 'Q8 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q8', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 16 },
          { questionNumber: 'Q8 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q8', optionLabel: 'Option B (OR)', maxMarks: 5, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 17 },
        ],
      },
    ],
  },
  {
    id: 'tpl-see-100',
    name: 'Semester End Examination (SEE) 100-Marks Comprehensive (Batch 2026)',
    description:
      'Section A: 10 Short questions (2M = 20M); Section B: 5 Major Modules with Option A or B (16M each = 80M). Restores Question-Wise COs.',
    totalMarks: 100,
    sections: [
      {
        id: 'sec-tpl-see-a',
        sectionName: 'Section A - Short Answer Questions',
        choiceRule: 'ALL',
        questionsToAnswer: 10,
        totalQuestions: 10,
        marksPerQuestion: 2,
        hasOptions: false,
        hasParts: false,
        defaultBlooms: 'UNDERSTAND',
        questions: [
          { questionNumber: 'Q1', maxMarks: 2, coCode: 'CO1', bloomsLevel: 'REMEMBER', displayOrder: 1 },
          { questionNumber: 'Q2', maxMarks: 2, coCode: 'CO1', bloomsLevel: 'UNDERSTAND', displayOrder: 2 },
          { questionNumber: 'Q3', maxMarks: 2, coCode: 'CO2', bloomsLevel: 'REMEMBER', displayOrder: 3 },
          { questionNumber: 'Q4', maxMarks: 2, coCode: 'CO2', bloomsLevel: 'UNDERSTAND', displayOrder: 4 },
          { questionNumber: 'Q5', maxMarks: 2, coCode: 'CO3', bloomsLevel: 'UNDERSTAND', displayOrder: 5 },
          { questionNumber: 'Q6', maxMarks: 2, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 6 },
          { questionNumber: 'Q7', maxMarks: 2, coCode: 'CO4', bloomsLevel: 'APPLY', displayOrder: 7 },
          { questionNumber: 'Q8', maxMarks: 2, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 8 },
          { questionNumber: 'Q9', maxMarks: 2, coCode: 'CO5', bloomsLevel: 'ANALYZE', displayOrder: 9 },
          { questionNumber: 'Q10', maxMarks: 2, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 10 },
        ],
      },
      {
        id: 'sec-tpl-see-b',
        sectionName: 'Section B - Comprehensive Essay & Case Problems',
        choiceRule: 'ANY_N',
        questionsToAnswer: 5,
        totalQuestions: 5,
        marksPerQuestion: 16,
        hasOptions: true,
        hasParts: true,
        defaultBlooms: 'ANALYZE',
        questions: [
          // Module 1 (CO1)
          { questionNumber: 'Q11(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q11', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO1', bloomsLevel: 'UNDERSTAND', displayOrder: 11 },
          { questionNumber: 'Q11(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q11', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO1', bloomsLevel: 'APPLY', displayOrder: 12 },
          { questionNumber: 'Q11 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q11', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO1', bloomsLevel: 'UNDERSTAND', displayOrder: 13 },
          { questionNumber: 'Q11 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q11', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO1', bloomsLevel: 'APPLY', displayOrder: 14 },

          // Module 2 (CO2)
          { questionNumber: 'Q12(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q12', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO2', bloomsLevel: 'APPLY', displayOrder: 15 },
          { questionNumber: 'Q12(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q12', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO2', bloomsLevel: 'ANALYZE', displayOrder: 16 },
          { questionNumber: 'Q12 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q12', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO2', bloomsLevel: 'APPLY', displayOrder: 17 },
          { questionNumber: 'Q12 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q12', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO2', bloomsLevel: 'ANALYZE', displayOrder: 18 },

          // Module 3 (CO3)
          { questionNumber: 'Q13(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q13', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 19 },
          { questionNumber: 'Q13(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q13', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO3', bloomsLevel: 'ANALYZE', displayOrder: 20 },
          { questionNumber: 'Q13 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q13', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 21 },
          { questionNumber: 'Q13 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q13', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO3', bloomsLevel: 'ANALYZE', displayOrder: 22 },

          // Module 4 (CO4)
          { questionNumber: 'Q14(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q14', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 23 },
          { questionNumber: 'Q14(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q14', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO4', bloomsLevel: 'EVALUATE', displayOrder: 24 },
          { questionNumber: 'Q14 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q14', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 25 },
          { questionNumber: 'Q14 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q14', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO4', bloomsLevel: 'EVALUATE', displayOrder: 26 },

          // Module 5 (CO5)
          { questionNumber: 'Q15(a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q15', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 27 },
          { questionNumber: 'Q15(b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q15', optionLabel: 'Option A', maxMarks: 8, coCode: 'CO5', bloomsLevel: 'CREATE', displayOrder: 28 },
          { questionNumber: 'Q15 OR (a)', partLabel: 'a', isOption: true, optionGroup: 'OPT-Q15', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO5', bloomsLevel: 'EVALUATE', displayOrder: 29 },
          { questionNumber: 'Q15 OR (b)', partLabel: 'b', isOption: true, optionGroup: 'OPT-Q15', optionLabel: 'Option B (OR)', maxMarks: 8, coCode: 'CO5', bloomsLevel: 'CREATE', displayOrder: 30 },
        ],
      },
    ],
  },
  {
    id: 'tpl-quiz-20',
    name: 'Continuous Assessment Quiz 20-Marks (Batch 2026)',
    description: '4 Objective & Conceptual Questions (5 Marks each). Answer all. Restores Question-Wise COs.',
    totalMarks: 20,
    sections: [
      {
        id: 'sec-tpl-q-a',
        sectionName: 'Section A - Quick Assessment',
        choiceRule: 'ALL',
        questionsToAnswer: 4,
        totalQuestions: 4,
        marksPerQuestion: 5,
        hasOptions: false,
        hasParts: false,
        defaultBlooms: 'APPLY',
        questions: [
          { questionNumber: 'Q1', maxMarks: 5, coCode: 'CO1', bloomsLevel: 'REMEMBER', displayOrder: 1 },
          { questionNumber: 'Q2', maxMarks: 5, coCode: 'CO2', bloomsLevel: 'UNDERSTAND', displayOrder: 2 },
          { questionNumber: 'Q3', maxMarks: 5, coCode: 'CO3', bloomsLevel: 'APPLY', displayOrder: 3 },
          { questionNumber: 'Q4', maxMarks: 5, coCode: 'CO4', bloomsLevel: 'ANALYZE', displayOrder: 4 },
        ],
      },
    ],
  },
];

interface AppContextType {
  isInitialized: boolean;
  tenant: OrganizationTenant | null;
  adminUser: AdminUser | null;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;

  // Global Theme Management
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  // Active Navigation & Deep-Linking Subtabs
  activeMenuItem: MenuItemId;
  setActiveMenuItem: (item: MenuItemId) => void;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  navigateTo: (menuId: MenuItemId, subTabId?: string) => void;

  // Authenticated User Session & Role Scoping
  currentUser: UserAccount | null;
  academicScope: AcademicRoleScope;
  login: (user: UserAccount) => void;
  logout: () => void;

  // 0. User Accounts, Password Setup, OTP & Reset
  users: UserAccount[];
  addUser: (user: Omit<UserAccount, 'id' | 'createdAt' | 'hasCompletedInitialReset' | 'passwordResetLocked'>) => { user: UserAccount; otp: string; link: string };
  addUsersBatch: (newUsers: Array<Omit<UserAccount, 'id' | 'createdAt' | 'hasCompletedInitialReset' | 'passwordResetLocked'>>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  approveUserAccount: (userId: string) => { success: boolean; message: string; otp?: string; link?: string };
  rejectUserAccount: (userId: string, reason?: string) => { success: boolean; message: string };
  adminResetUserPassword: (userId: string) => { success: boolean; message: string; otp?: string; link?: string };
  requestForgotPassword: (email: string) => { success: boolean; message: string; isLocked?: boolean; otp?: string };
  verifyOtpAndSetPassword: (email: string, otp: string, newPassword: string) => { success: boolean; message: string };

  // Email / SMTP Notifications
  emailConfig: EmailSmtpConfig;
  updateEmailConfig: (cfg: Partial<EmailSmtpConfig>) => void;
  outgoingEmails: OutgoingEmailNotification[];
  clearOutgoingEmails: () => void;
  sendTestEmail: (recipientEmail: string) => { success: boolean; message: string };
  sendInstitutionalNotification: (params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    type: OutgoingEmailNotification['type'];
    body?: string;
    otp?: string;
    link?: string;
  }) => OutgoingEmailNotification;

  // 1. Organization Structure & Hierarchy Heads
  faculties: AcademicFaculty[];
  addFaculty: (code: string, name: string, headUserId?: string, headUserName?: string) => void;
  addFacultiesBatch: (facs: Array<Omit<AcademicFaculty, 'id'>>) => void;
  updateFaculty: (id: string, updates: Partial<AcademicFaculty>) => void;
  deleteFaculty: (id: string) => void;
  setFacultyHead: (facultyId: string, userId: string, userName: string) => void;

  schools: AcademicSchool[];
  addSchool: (facultyId: string, code: string, name: string, headUserId?: string, headUserName?: string) => void;
  addSchoolsBatch: (schs: Array<Omit<AcademicSchool, 'id'>>) => void;
  updateSchool: (id: string, updates: Partial<AcademicSchool>) => void;
  deleteSchool: (id: string) => void;
  setSchoolHead: (schoolId: string, userId: string, userName: string) => void;

  departments: AcademicDepartment[];
  addDepartment: (schoolId: string, code: string, name: string, headUserId?: string, headUserName?: string) => void;
  addDepartmentsBatch: (depts: Array<Omit<AcademicDepartment, 'id'>>) => void;
  updateDepartment: (id: string, updates: Partial<AcademicDepartment>) => void;
  deleteDepartment: (id: string) => void;
  setDepartmentHead: (departmentId: string, userId: string, userName: string) => void;

  // 2. Regulations
  regulations: AcademicRegulation[];
  addRegulation: (reg: Omit<AcademicRegulation, 'id'>) => void;
  addRegulationsBatch: (regs: Array<Omit<AcademicRegulation, 'id'>>) => void;
  updateRegulation: (id: string, updates: Partial<AcademicRegulation>) => void;
  deleteRegulation: (id: string) => void;

  // 3. Programs & Outcomes
  programs: AcademicProgram[];
  activeProgramId: string | null;
  setActiveProgramId: (id: string | null) => void;
  addProgram: (prog: Omit<AcademicProgram, 'id'>) => void;
  addProgramsBatch: (progs: Array<Omit<AcademicProgram, 'id'>>) => void;
  updateProgram: (id: string, updates: Partial<AcademicProgram>) => void;
  deleteProgram: (id: string) => void;

  programOutcomes: ProgramOutcomeItem[];
  addProgramOutcome: (po: Omit<ProgramOutcomeItem, 'id'>) => void;
  addProgramOutcomesBatch: (pos: Array<Omit<ProgramOutcomeItem, 'id'>>) => void;
  updateProgramOutcome: (id: string, updates: Partial<ProgramOutcomeItem>) => void;
  deleteProgramOutcome: (id: string) => void;
  loadStandardNbaReferencePos: (programId: string) => void;

  // 4. Terms
  terms: AcademicTerm[];
  activeTermId: string | null;
  setActiveTermId: (id: string | null) => void;
  addTerm: (term: Omit<AcademicTerm, 'id'>) => void;
  addTermsBatch: (terms: Array<Omit<AcademicTerm, 'id'>>) => void;
  updateTerm: (id: string, updates: Partial<AcademicTerm>) => void;
  deleteTerm: (id: string) => void;

  // 5. Courses & Sections
  courses: CourseRecord[];
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  addCourse: (course: Omit<CourseRecord, 'id'>) => void;
  addCoursesBatch: (courses: Array<Omit<CourseRecord, 'id'>>) => void;
  updateCourse: (id: string, updates: Partial<CourseRecord>) => void;
  deleteCourse: (id: string) => void;

  courseSections: CourseSection[];
  activeSectionId: string | null;
  setActiveSectionId: (id: string | null) => void;
  addCourseSection: (sec: Omit<CourseSection, 'id'>) => void;
  addCourseSectionsBatch: (sections: Array<Omit<CourseSection, 'id'>>) => void;
  updateCourseSection: (id: string, updates: Partial<CourseSection>) => void;
  deleteCourseSection: (id: string) => void;
  assignStudentsToSection: (studentIds: string[], sectionId: string) => void;
  assignFacultyToSection: (sectionId: string, facultyId: string, facultyName: string) => void;

  courseOutcomes: CourseOutcomeItem[];
  addCourseOutcome: (outcome: Omit<CourseOutcomeItem, 'id'>) => void;
  addCourseOutcomesBatch: (outcomes: Array<Omit<CourseOutcomeItem, 'id'>>) => void;
  updateCourseOutcome: (id: string, updates: Partial<CourseOutcomeItem>) => void;
  deleteCourseOutcome: (id: string) => void;

  coPoMappings: CoPoMappingRecord[];
  updateCoPoMapping: (
    coId: string,
    poId: string,
    mappingLevel: number,
    justification?: string
  ) => void;
  deleteCoPoMapping: (coId: string, poId: string) => void;

  // 6. Scoring Components
  scoringSchemes: ScoringScheme[];
  addScoringScheme: (scheme: Omit<ScoringScheme, 'id'>) => void;
  addScoringSchemesBatch: (schemes: Array<Omit<ScoringScheme, 'id'>>) => void;
  updateScoringScheme: (id: string, updates: Partial<ScoringScheme>) => void;
  deleteScoringScheme: (id: string) => void;

  scoringSubComponents: ScoringSubComponent[];
  addScoringSubComponent: (subComp: Omit<ScoringSubComponent, 'id'>) => void;
  addScoringSubComponentsBatch: (subComps: Array<Omit<ScoringSubComponent, 'id'>>) => void;
  updateScoringSubComponent: (id: string, updates: Partial<ScoringSubComponent>) => void;
  deleteScoringSubComponent: (id: string) => void;

  // 7. Assessment & Question Papers
  assessmentWindows: AssessmentWindowRecord[];
  activeWindowId: string | null;
  setActiveWindowId: (id: string | null) => void;
  addAssessmentWindow: (win: Omit<AssessmentWindowRecord, 'id'>) => void;
  updateAssessmentWindow: (window: AssessmentWindowRecord) => void;
  deleteAssessmentWindow: (id: string) => void;
  extendAssessmentWindowDeadline: (
    windowId: string,
    newCloseDateTime: string,
    newFacultyId?: string,
    reason?: string
  ) => void;

  questionPapers: QuestionPaper[];
  activeQuestionPaperId: string | null;
  setActiveQuestionPaperId: (id: string | null) => void;
  addQuestionPaper: (qp: Omit<QuestionPaper, 'id'>) => string;
  updateQuestionPaper: (id: string, updates: Partial<QuestionPaper>) => void;
  deleteQuestionPaper: (id: string) => void;
  getOrCreateQuestionPaperForSubComponent: (
    subCompId: string,
    courseId: string,
    subCompName: string
  ) => QuestionPaper;

  questionPaperSections: QuestionPaperSection[];
  addQuestionPaperSection: (sec: Omit<QuestionPaperSection, 'id'>) => void;
  updateQuestionPaperSection: (id: string, updates: Partial<QuestionPaperSection>) => void;
  deleteQuestionPaperSection: (id: string) => void;

  questionPaperTemplates: QuestionPaperTemplate[];
  addQuestionPaperTemplate: (tpl: Omit<QuestionPaperTemplate, 'id'>) => void;
  updateQuestionPaperTemplate: (id: string, updates: Partial<QuestionPaperTemplate>) => void;
  deleteQuestionPaperTemplate: (id: string) => void;
  applyQuestionPaperTemplate: (
    templateId: string,
    questionPaperId: string,
    defaultCoId?: string
  ) => void;

  questions: QuestionItem[];
  addQuestion: (q: Omit<QuestionItem, 'id'>) => void;
  addQuestionsBatch: (questions: Array<Omit<QuestionItem, 'id'>>) => void;
  updateQuestion: (id: string, updates: Partial<QuestionItem>) => void;
  deleteQuestion: (id: string) => void;

  // 8. Filling of Question Wise Marks & Students
  students: StudentEnrollment[];
  addStudent: (student: Omit<StudentEnrollment, 'id' | 'studentId'>) => void;
  addStudentsBatch: (newStudents: Array<{ rollNumber: string; studentName: string; sectionId?: string; courseId?: string }>) => void;
  updateStudent: (id: string, updates: Partial<StudentEnrollment>) => void;
  deleteStudent: (id: string) => void;

  marks: MarkEntryRecord[];
  updateMarkEntry: (
    enrollmentId: string,
    questionId: string,
    statusCode: MarkEntryStatusCode,
    marksObtained: number | null
  ) => void;
  importMarksBatch: (entries: MarkEntryRecord[]) => void;
  clearMarks: (windowId?: string) => void;

  // 9. Course Outcome Reports & Feedback
  surveyResponses: Array<{ courseOutcomeId: string; likertScore: number }>;
  addSurveyResponse: (courseOutcomeId: string, likertScore: number) => void;

  config: {
    targetCutoffPct: number;
    directWeight: number;
    indirectWeight: number;
    defaultTargetLevel: number;
  };
  updateConfig: (cfg: Partial<{
    targetCutoffPct: number;
    directWeight: number;
    indirectWeight: number;
    defaultTargetLevel: number;
  }>) => void;

  initializeInstitution: (data: {
    tenant: OrganizationTenant;
    admin: AdminUser;
    initialFacultyName?: string;
    initialDeptName?: string;
    initialProgramName?: string;
    initialCourseCode?: string;
    initialCourseTitle?: string;
  }) => void;

  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'academic_erp_state_v3';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [tenant, setTenant] = useState<OrganizationTenant | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('TENANT_ADMIN');

  // 0. User accounts & Notifications
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailSmtpConfig>({
    host: 'smtp.institution.edu',
    port: 587,
    secure: true,
    senderName: 'Academic ERP Notification Service',
    senderEmail: 'notifications@institution.edu',
    username: 'notifications@institution.edu',
    password: '',
    isConfigured: false,
  });
  const [outgoingEmails, setOutgoingEmails] = useState<OutgoingEmailNotification[]>([]);

  const updateEmailConfig = (cfg: Partial<EmailSmtpConfig>) => {
    setEmailConfig((prev) => ({ ...prev, ...cfg, isConfigured: true }));
  };

  const clearOutgoingEmails = () => {
    setOutgoingEmails([]);
  };

  const sendTestEmail = (recipientEmail: string) => {
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailItem: OutgoingEmailNotification = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: recipientEmail.trim(),
      recipientName: 'Institutional Administrator',
      subject: `[TEST] Academic ERP SMTP Notification Test Delivery`,
      type: 'TEST_EMAIL',
      otp: testOtp,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    setOutgoingEmails((prev) => [emailItem, ...prev]);
    return {
      success: true,
      message: `Test email successfully dispatched via SMTP (${emailConfig.host}:${emailConfig.port}) to ${recipientEmail}.`,
    };
  };

  // 1. Organization Structure
  const [faculties, setFaculties] = useState<AcademicFaculty[]>([]);
  const [schools, setSchools] = useState<AcademicSchool[]>([]);
  const [departments, setDepartments] = useState<AcademicDepartment[]>([]);

  // 2. Regulations
  const [regulations, setRegulations] = useState<AcademicRegulation[]>([]);

  // 3. Programs & Outcomes
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [programOutcomes, setProgramOutcomes] = useState<ProgramOutcomeItem[]>([]);

  // 4. Terms
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);

  // 5. Courses & Sections
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [courseSections, setCourseSections] = useState<CourseSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcomeItem[]>([]);
  const [coPoMappings, setCoPoMappings] = useState<CoPoMappingRecord[]>([]);

  // 6. Scoring Components
  const [scoringSchemes, setScoringSchemes] = useState<ScoringScheme[]>([]);
  const [scoringSubComponents, setScoringSubComponents] = useState<ScoringSubComponent[]>([]);

  // 7. Assessment & Question Papers
  const [assessmentWindows, setAssessmentWindows] = useState<AssessmentWindowRecord[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [questionPapers, setQuestionPapers] = useState<QuestionPaper[]>([]);
  const [activeQuestionPaperId, setActiveQuestionPaperId] = useState<string | null>(null);
  const [questionPaperSections, setQuestionPaperSections] = useState<QuestionPaperSection[]>([]);
  const [questionPaperTemplates, setQuestionPaperTemplates] = useState<QuestionPaperTemplate[]>(
    DEFAULT_QUESTION_PAPER_TEMPLATES
  );
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  // 8. Filling of Marks & Students
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [marks, setMarks] = useState<MarkEntryRecord[]>([]);

  // 9. Feedback & Configuration
  const [surveyResponses, setSurveyResponses] = useState<
    Array<{ courseOutcomeId: string; likertScore: number }>
  >([]);

  const [config, setConfig] = useState({
    targetCutoffPct: 60.0,
    directWeight: 0.80,
    indirectWeight: 0.20,
    defaultTargetLevel: 2.5,
  });

  // Global Theme & Authenticated User
  const [theme, setThemeState] = useState<AppTheme>('obsidian-black');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Active Navigation & Deep-Linking Subtabs
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItemId>('org-structure');
  const [activeSubTab, setActiveSubTab] = useState<string>('faculties');

  const navigateTo = (menuId: MenuItemId, subTabId?: string) => {
    setActiveMenuItem(menuId);
    if (subTabId) {
      setActiveSubTab(subTabId);
    }
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('academic_erp_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const login = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentUserRole(user.role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('academic_erp_current_user', JSON.stringify(user));
    }
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('academic_erp_current_user');
    }
  };

  // Dynamic Academic Scope & Governance Permissions
  const academicScope = React.useMemo(() => {
    return computeAcademicScope(
      currentUser,
      faculties,
      schools,
      departments,
      programs,
      courses,
      courseSections
    );
  }, [currentUser, faculties, schools, departments, programs, courses, courseSections]);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTheme = (localStorage.getItem('academic_erp_theme') as AppTheme) || 'obsidian-black';
        setThemeState(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        const savedUser = localStorage.getItem('academic_erp_current_user');
        if (savedUser) {
          try {
            const userObj = JSON.parse(savedUser);
            setCurrentUser(userObj);
            if (userObj.role) setCurrentUserRole(userObj.role);
          } catch {}
        }
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.isInitialized && parsed.tenant && parsed.adminUser) {
          setIsInitialized(true);
          setTenant(parsed.tenant);
          setAdminUser(parsed.adminUser);
          setCurrentUserRole(parsed.adminUser.role || 'TENANT_ADMIN');
          setUsers(parsed.users || []);
          setFaculties(parsed.faculties || []);
          setSchools(parsed.schools || []);
          setDepartments(parsed.departments || []);
          setRegulations(parsed.regulations || []);
          setPrograms(parsed.programs || []);
          setActiveProgramId(parsed.activeProgramId || (parsed.programs?.[0]?.id ?? null));
          setProgramOutcomes(parsed.programOutcomes || []);
          setTerms(parsed.terms || []);
          setActiveTermId(parsed.activeTermId || (parsed.terms?.[0]?.id ?? null));
          setCourses(parsed.courses || []);
          setActiveCourseId(parsed.activeCourseId || (parsed.courses?.[0]?.id ?? null));
          setCourseSections(parsed.courseSections || []);
          setActiveSectionId(parsed.activeSectionId || (parsed.courseSections?.[0]?.id ?? null));
          setCourseOutcomes(parsed.courseOutcomes || []);
          setCoPoMappings(parsed.coPoMappings || []);
          setScoringSchemes(parsed.scoringSchemes || []);
          setScoringSubComponents(parsed.scoringSubComponents || []);
          setAssessmentWindows(parsed.assessmentWindows || []);
          setActiveWindowId(parsed.activeWindowId || (parsed.assessmentWindows?.[0]?.id ?? null));
          setQuestionPapers(parsed.questionPapers || []);
          setActiveQuestionPaperId(parsed.activeQuestionPaperId || (parsed.questionPapers?.[0]?.id ?? null));
          setQuestionPaperSections(parsed.questionPaperSections || []);
          if (parsed.questionPaperTemplates?.length) {
            setQuestionPaperTemplates(parsed.questionPaperTemplates);
          }
          setQuestions(parsed.questions || []);
          setStudents(parsed.students || []);
          setMarks(parsed.marks || []);
          setSurveyResponses(parsed.surveyResponses || []);
          if (parsed.config) setConfig(parsed.config);
          if (parsed.emailConfig) setEmailConfig(parsed.emailConfig);
          if (parsed.outgoingEmails) setOutgoingEmails(parsed.outgoingEmails);
        }
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isInitialized) {
      try {
        const dataToSave = {
          isInitialized,
          tenant,
          adminUser,
          users,
          faculties,
          schools,
          departments,
          regulations,
          programs,
          activeProgramId,
          programOutcomes,
          terms,
          activeTermId,
          courses,
          activeCourseId,
          courseSections,
          activeSectionId,
          courseOutcomes,
          coPoMappings,
          scoringSchemes,
          scoringSubComponents,
          assessmentWindows,
          activeWindowId,
          questionPapers,
          activeQuestionPaperId,
          questionPaperSections,
          questionPaperTemplates,
          questions,
          students,
          marks,
          surveyResponses,
          config,
          emailConfig,
          outgoingEmails,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Failed to save state to localStorage', e);
      }
    }
  }, [
    isInitialized,
    tenant,
    adminUser,
    users,
    faculties,
    schools,
    departments,
    regulations,
    programs,
    activeProgramId,
    programOutcomes,
    terms,
    activeTermId,
    courses,
    activeCourseId,
    courseSections,
    activeSectionId,
    courseOutcomes,
    coPoMappings,
    scoringSchemes,
    scoringSubComponents,
    assessmentWindows,
    activeWindowId,
    questionPapers,
    activeQuestionPaperId,
    questionPaperSections,
    questionPaperTemplates,
    questions,
    students,
    marks,
    surveyResponses,
    config,
    emailConfig,
    outgoingEmails,
  ]);

  // Initial Setup Wizard Handler
  const initializeInstitution = (data: {
    tenant: OrganizationTenant;
    admin: AdminUser;
    initialFacultyName?: string;
    initialDeptName?: string;
    initialProgramName?: string;
    initialCourseCode?: string;
    initialCourseTitle?: string;
  }) => {
    setTenant(data.tenant);
    setAdminUser(data.admin);
    setCurrentUserRole(data.admin.role || 'TENANT_ADMIN');

    const primaryAdminAccount: UserAccount = {
      id: data.admin.id,
      fullName: data.admin.fullName,
      email: data.admin.email,
      role: 'TENANT_ADMIN',
      department: data.admin.department || 'Office of the Registrar',
      isMfaEnabled: data.admin.isMfaEnabled,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    // Only the real primary administrator account is created - NO dummy accounts!
    setUsers([primaryAdminAccount]);
    login(primaryAdminAccount);

    const facId = `fac-${Date.now()}`;
    const schId = `sch-${Date.now()}`;
    const deptId = `dept-${Date.now()}`;
    const progId = `prog-${Date.now()}`;
    const courseId = `course-${Date.now()}`;
    const sectionId = `sec-a-${Date.now()}`;

    const newFaculties: AcademicFaculty[] = [];
    if (data.initialFacultyName) {
      newFaculties.push({
        id: facId,
        code: 'FAC-ENG-2026',
        name: data.initialFacultyName,
      });
    }

    const newSchools: AcademicSchool[] = [
      {
        id: schId,
        facultyId: facId,
        code: 'SCH-COMP-2026',
        name: 'School of Computing & Artificial Intelligence',
      },
    ];

    const newDepts: AcademicDepartment[] = [];
    if (data.initialDeptName) {
      newDepts.push({
        id: deptId,
        schoolId: schId,
        code: 'DEPT-CSE-2026',
        name: data.initialDeptName,
      });
    }

    const newPrograms: AcademicProgram[] = [];
    if (data.initialProgramName) {
      newPrograms.push({
        id: progId,
        departmentId: deptId,
        code: 'BTECH-CSE-2026',
        name: data.initialProgramName,
        degreeType: 'UNDERGRADUATE',
        totalTerms: 8,
        batchYear: '2026-2030',
      });
      setActiveProgramId(progId);
    }

    const newCourses: CourseRecord[] = [];
    const newSections: CourseSection[] = [];
    if (data.initialCourseCode && data.initialCourseTitle) {
      newCourses.push({
        id: courseId,
        programId: progId,
        code: data.initialCourseCode,
        title: data.initialCourseTitle,
        credits: 4,
        lectureHours: 3,
        tutorialHours: 0,
        practicalHours: 2,
        term: 'Semester I (Batch 2026)',
        regulation: 'R2026',
      });
      setActiveCourseId(courseId);

      // Create initial Section A ready for faculty allocation
      newSections.push({
        id: sectionId,
        courseId: courseId,
        name: 'Section A',
        academicYear: '2026-2027',
      });
      setActiveSectionId(sectionId);
    }

    // Set structures created from setup wizard, but absolutely ZERO predefined content!
    setFaculties(newFaculties);
    setSchools(newSchools);
    setDepartments(newDepts);
    setRegulations([]);
    setPrograms(newPrograms);
    setProgramOutcomes([]);
    setTerms([]);
    setCourses(newCourses);
    setCourseSections(newSections);
    setCourseOutcomes([]);
    setCoPoMappings([]);
    setScoringSchemes([]);
    setScoringSubComponents([]);
    setAssessmentWindows([]);
    setQuestionPapers([]);
    setQuestionPaperSections([]);
    setQuestions([]);
    setStudents([]);
    setMarks([]);
    setSurveyResponses([]);

    setIsInitialized(true);
  };

  // Institutional Email Notification Engine
  const sendInstitutionalNotification = (params: {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    type: OutgoingEmailNotification['type'];
    body?: string;
    otp?: string;
    link?: string;
  }): OutgoingEmailNotification => {
    const emailItem: OutgoingEmailNotification = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      subject: params.subject,
      type: params.type,
      body: params.body,
      otp: params.otp,
      link: params.link,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    setOutgoingEmails((prev) => [emailItem, ...prev]);
    return emailItem;
  };

  // 0. User Management, Password Setup, OTP & Reset Policy
  const addUser = (u: Omit<UserAccount, 'id' | 'createdAt' | 'hasCompletedInitialReset' | 'passwordResetLocked'>) => {
    const isApprovalNeeded = requiresAdminApproval(currentUser?.role);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?action=set-password&email=${encodeURIComponent(u.email)}&otp=${otp}`;

    const newUser: UserAccount = {
      ...u,
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: isApprovalNeeded ? 'PENDING_APPROVAL' : (u.status || 'PENDING_PASSWORD_SETUP'),
      approvalStatus: isApprovalNeeded ? 'PENDING' : 'APPROVED',
      createdByUserId: currentUser?.id,
      createdByRole: currentUser?.role,
      createdByName: currentUser?.fullName,
      createdAt: new Date().toISOString(),
      setupOtp: otp,
      setupOtpExpiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      hasCompletedInitialReset: false,
      passwordResetLocked: false,
    };
    setUsers((prev) => [...prev, newUser]);

    if (!isApprovalNeeded) {
      // Dispatch welcome email with OTP, Activation Link, and institutional body
      sendInstitutionalNotification({
        recipientEmail: u.email,
        recipientName: u.fullName,
        subject: `Welcome to ${tenant?.name || 'Academic ERP'} - Set Your Account Password`,
        type: 'FIRST_TIME_SETUP',
        otp,
        link,
        body: `Welcome to ${tenant?.name || 'Academic Institution'}. Your institutional account has been provisioned with role: ${u.role}. Please click the activation link and verify your 6-digit OTP code (${otp}) to set your password.`,
      });
    } else {
      // Notify Admin about the pending request created by academic head
      if (adminUser?.email) {
        sendInstitutionalNotification({
          recipientEmail: adminUser.email,
          recipientName: adminUser.fullName,
          subject: `User Account Approval Requested: ${u.fullName} (${u.role})`,
          type: 'GENERAL_NOTIFICATION',
          body: `A new user account for ${u.fullName} (${u.email}) with role "${u.role}" has been created by ${currentUser?.fullName} (${currentUser?.role}). It is awaiting your administrator approval in Organization Structure -> Users.`,
        });
      }
    }

    return { user: newUser, otp, link };
  };

  const addUsersBatch = (
    newUsers: Array<Omit<UserAccount, 'id' | 'createdAt' | 'hasCompletedInitialReset' | 'passwordResetLocked'>>
  ) => {
    const isApprovalNeeded = requiresAdminApproval(currentUser?.role);
    const createdUsers: UserAccount[] = [];

    newUsers.forEach((u, idx) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?action=set-password&email=${encodeURIComponent(u.email)}&otp=${otp}`;

      const usr: UserAccount = {
        ...u,
        id: `u-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        status: isApprovalNeeded ? 'PENDING_APPROVAL' : (u.status || 'PENDING_PASSWORD_SETUP'),
        approvalStatus: isApprovalNeeded ? 'PENDING' : 'APPROVED',
        createdByUserId: currentUser?.id,
        createdByRole: currentUser?.role,
        createdByName: currentUser?.fullName,
        createdAt: new Date().toISOString(),
        setupOtp: otp,
        setupOtpExpiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        hasCompletedInitialReset: false,
        passwordResetLocked: false,
      };
      createdUsers.push(usr);

      if (!isApprovalNeeded) {
        sendInstitutionalNotification({
          recipientEmail: u.email,
          recipientName: u.fullName,
          subject: `Welcome to ${tenant?.name || 'Academic ERP'} - Set Your Account Password`,
          type: 'FIRST_TIME_SETUP',
          otp,
          link,
          body: `Welcome to ${tenant?.name || 'Academic Institution'}. Your institutional account has been created with role: ${u.role}. Use OTP ${otp} and activation link to set your password.`,
        });
      }
    });

    setUsers((prev) => [...prev, ...createdUsers]);
  };

  const approveUserAccount = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'User not found in system.' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?action=set-password&email=${encodeURIComponent(target.email)}&otp=${otp}`;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'PENDING_PASSWORD_SETUP',
              approvalStatus: 'APPROVED',
              setupOtp: otp,
              setupOtpExpiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
            }
          : u
      )
    );

    sendInstitutionalNotification({
      recipientEmail: target.email,
      recipientName: target.fullName,
      subject: `Account Approved: Welcome to ${tenant?.name || 'Academic ERP'}`,
      type: 'FIRST_TIME_SETUP',
      otp,
      link,
      body: `Your institutional user account has been approved by the Administrator. Your assigned role is: ${target.role}. Please click the activation link and verify with OTP (${otp}) to set your password.`,
    });

    return { success: true, message: `Approved account for ${target.fullName}. Setup email dispatched.`, otp, link };
  };

  const rejectUserAccount = (userId: string, reason?: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, message: 'User not found in system.' };

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'INACTIVE',
              approvalStatus: 'REJECTED',
              rejectionReason: reason || 'Not approved by institutional policy',
            }
          : u
      )
    );

    return { success: true, message: `Account request for ${target.fullName} rejected.` };
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Main Admin password reset authorization: unlocks reset lock and issues fresh OTP
  const adminResetUserPassword = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, message: 'User not found in system.' };

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?action=admin-reset&email=${encodeURIComponent(user.email)}&otp=${otp}`;

    updateUser(user.id, {
      passwordResetLocked: false, // Unlocked explicitly by Main Admin!
      hasCompletedInitialReset: false,
      resetOtp: otp,
      resetOtpExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: 'PENDING_PASSWORD_SETUP',
    });

    const emailItem: OutgoingEmailNotification = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: user.email,
      recipientName: user.fullName,
      subject: `Administrator Password Reset Authorization - ${tenant?.name || 'Academic ERP'}`,
      type: 'ADMIN_RESET',
      otp,
      link,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    setOutgoingEmails((prev) => [emailItem, ...prev]);

    return {
      success: true,
      message: `Administrator authorization granted for ${user.fullName}. New OTP (${otp}) and reset link dispatched to ${user.email}.`,
      otp,
      link,
    };
  };

  // User self-service forgot password (enforcing single-reset policy!)
  const requestForgotPassword = (email: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, message: 'No registered user found with this email address.' };
    }

    if (user.passwordResetLocked) {
      return {
        success: false,
        isLocked: true,
        message: 'Security Policy Lock: You have already used self-service password reset. For institutional compliance, subsequent password resets must be authorized and issued by the Main Institutional Administrator.',
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const link = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}?action=reset-password&email=${encodeURIComponent(user.email)}&otp=${otp}`;

    updateUser(user.id, {
      resetOtp: otp,
      resetOtpExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    });

    const emailItem: OutgoingEmailNotification = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: user.email,
      recipientName: user.fullName,
      subject: `Password Reset Verification Code - ${tenant?.name || 'Academic ERP'}`,
      type: 'FORGOT_PASSWORD',
      otp,
      link,
      sentAt: new Date().toISOString(),
      status: 'DELIVERED',
    };
    setOutgoingEmails((prev) => [emailItem, ...prev]);

    return {
      success: true,
      message: `Password reset OTP has been sent to ${user.email}. Check your inbox or system email simulator.`,
      otp,
    };
  };

  // Validates OTP (setup or reset) and saves new password, locking subsequent self-service resets
  const verifyOtpAndSetPassword = (email: string, otp: string, newPassword: string) => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, message: 'Account not found for this email.' };
    }

    const trimmedOtp = otp.trim();
    const isSetupMatch = user.setupOtp && user.setupOtp === trimmedOtp;
    const isResetMatch = user.resetOtp && user.resetOtp === trimmedOtp;

    if (!isSetupMatch && !isResetMatch) {
      return { success: false, message: 'Invalid or expired OTP code. Please verify the code and try again.' };
    }

    updateUser(user.id, {
      status: 'ACTIVE',
      passwordHash: newPassword,
      setupOtp: undefined,
      setupOtpExpiresAt: undefined,
      resetOtp: undefined,
      resetOtpExpiresAt: undefined,
      hasCompletedInitialReset: true,
      passwordResetLocked: true, // Strict policy: locks self-service after 1st reset!
    });

    return {
      success: true,
      message: 'Password successfully verified and updated. You can now log in with your credentials.',
    };
  };

  // 1. Organization Structure
  const addFaculty = (code: string, name: string, headUserId?: string, headUserName?: string) => {
    const newId = `fac-${Date.now()}`;
    const newFac: AcademicFaculty = { id: newId, code, name, headUserId, headUserName };
    setFaculties((prev) => [...prev, newFac]);
    if (headUserId) {
      const user = users.find((u) => u.id === headUserId);
      if (user && user.role !== 'TENANT_ADMIN') {
        updateUser(headUserId, { role: 'HEAD_OF_FACULTY' });
      }
    }
  };

  const addFacultiesBatch = (facs: Array<Omit<AcademicFaculty, 'id'>>) => {
    const newItems = facs.map((f, idx) => ({ ...f, id: `fac-${Date.now()}-${idx}` }));
    setFaculties((prev) => [...prev, ...newItems]);
  };

  const updateFaculty = (id: string, updates: Partial<AcademicFaculty>) => {
    setFaculties((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const deleteFaculty = (id: string) => {
    setFaculties((prev) => prev.filter((f) => f.id !== id));
  };

  const addSchool = (facultyId: string, code: string, name: string, headUserId?: string, headUserName?: string) => {
    const newId = `school-${Date.now()}`;
    const newSchool: AcademicSchool = { id: newId, facultyId, code, name, headUserId, headUserName };
    setSchools((prev) => [...prev, newSchool]);
    if (headUserId) {
      const user = users.find((u) => u.id === headUserId);
      if (user && user.role !== 'TENANT_ADMIN') {
        updateUser(headUserId, { role: 'HEAD_OF_SCHOOL' });
      }
    }
  };

  const addSchoolsBatch = (schs: Array<Omit<AcademicSchool, 'id'>>) => {
    const newItems = schs.map((s, idx) => ({ ...s, id: `school-${Date.now()}-${idx}` }));
    setSchools((prev) => [...prev, ...newItems]);
  };

  const updateSchool = (id: string, updates: Partial<AcademicSchool>) => {
    setSchools((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSchool = (id: string) => {
    setSchools((prev) => prev.filter((s) => s.id !== id));
  };

  const addDepartment = (schoolId: string, code: string, name: string, headUserId?: string, headUserName?: string) => {
    const newId = `dept-${Date.now()}`;
    const newDept: AcademicDepartment = { id: newId, schoolId, code, name, headUserId, headUserName };
    setDepartments((prev) => [...prev, newDept]);
    if (headUserId) {
      const user = users.find((u) => u.id === headUserId);
      if (user && user.role !== 'TENANT_ADMIN') {
        updateUser(headUserId, { role: 'HOD' });
      }
    }
  };

  const addDepartmentsBatch = (depts: Array<Omit<AcademicDepartment, 'id'>>) => {
    const newItems = depts.map((d, idx) => ({ ...d, id: `dept-${Date.now()}-${idx}` }));
    setDepartments((prev) => [...prev, ...newItems]);
  };

  const updateDepartment = (id: string, updates: Partial<AcademicDepartment>) => {
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDepartment = (id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  };

  const setFacultyHead = (facultyId: string, userId: string, userName: string) => {
    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user && user.role === 'COURSE_FACULTY') {
        throw new Error("Validation Error: An account with just 'Faculty' role cannot be assigned as Head of Faculty (HoF). User must hold the HoF role.");
      }
    }
    setFaculties((prev) =>
      prev.map((f) => (f.id === facultyId ? { ...f, headUserId: userId || undefined, headUserName: userName || undefined } : f))
    );
  };

  const setSchoolHead = (schoolId: string, userId: string, userName: string) => {
    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user && user.role === 'COURSE_FACULTY') {
        throw new Error("Validation Error: An account with just 'Faculty' role cannot be assigned as Head of School (HoS). User must hold the HoS role.");
      }
    }
    setSchools((prev) =>
      prev.map((s) => (s.id === schoolId ? { ...s, headUserId: userId || undefined, headUserName: userName || undefined } : s))
    );
  };

  const setDepartmentHead = (departmentId: string, userId: string, userName: string) => {
    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user && user.role === 'COURSE_FACULTY') {
        throw new Error("Validation Error: An account with just 'Faculty' role cannot be assigned as Head of Department (HOD). User must hold the HoD role.");
      }
    }
    setDepartments((prev) =>
      prev.map((d) => (d.id === departmentId ? { ...d, headUserId: userId || undefined, headUserName: userName || undefined } : d))
    );
  };

  // 2. Regulations
  const addRegulation = (reg: Omit<AcademicRegulation, 'id'>) => {
    setRegulations((prev) => [...prev, { ...reg, id: `reg-${Date.now()}` }]);
  };

  const addRegulationsBatch = (regs: Array<Omit<AcademicRegulation, 'id'>>) => {
    const newItems = regs.map((r, idx) => ({ ...r, id: `reg-${Date.now()}-${idx}` }));
    setRegulations((prev) => [...prev, ...newItems]);
  };

  const updateRegulation = (id: string, updates: Partial<AcademicRegulation>) => {
    setRegulations((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRegulation = (id: string) => {
    setRegulations((prev) => prev.filter((r) => r.id !== id));
  };

  // 3. Programs & Outcomes
  const addProgram = (prog: Omit<AcademicProgram, 'id'>) => {
    const newId = `prog-${Date.now()}`;
    setPrograms((prev) => [...prev, { ...prog, id: newId }]);
    if (!activeProgramId) setActiveProgramId(newId);
  };

  const addProgramsBatch = (progs: Array<Omit<AcademicProgram, 'id'>>) => {
    const newItems = progs.map((p, idx) => ({ ...p, id: `prog-${Date.now()}-${idx}` }));
    setPrograms((prev) => [...prev, ...newItems]);
    if (!activeProgramId && newItems.length > 0) setActiveProgramId(newItems[0].id);
  };

  const updateProgram = (id: string, updates: Partial<AcademicProgram>) => {
    setPrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProgram = (id: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    setProgramOutcomes((prev) => prev.filter((po) => po.programId !== id));
    if (activeProgramId === id) setActiveProgramId(null);
  };

  const addProgramOutcome = (po: Omit<ProgramOutcomeItem, 'id'>) => {
    setProgramOutcomes((prev) => [
      ...prev,
      {
        ...po,
        id: `po-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      },
    ]);
  };

  const addProgramOutcomesBatch = (pos: Array<Omit<ProgramOutcomeItem, 'id'>>) => {
    const newItems = pos.map((p, idx) => ({ ...p, id: `po-${Date.now()}-${idx}` }));
    setProgramOutcomes((prev) => [...prev, ...newItems]);
  };

  const updateProgramOutcome = (id: string, updates: Partial<ProgramOutcomeItem>) => {
    setProgramOutcomes((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProgramOutcome = (id: string) => {
    setProgramOutcomes((prev) => prev.filter((p) => p.id !== id));
    setCoPoMappings((prev) => prev.filter((m) => m.programOutcomeId !== id));
  };

  const loadStandardNbaReferencePos = (targetProgramId: string) => {
    const referencePos: Array<Omit<ProgramOutcomeItem, 'id'>> = [
      {
        programId: targetProgramId,
        code: 'PO1',
        type: 'PO',
        title: 'Engineering Knowledge',
        description:
          'Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PO2',
        type: 'PO',
        title: 'Problem Analysis',
        description:
          'Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PO3',
        type: 'PO',
        title: 'Design & Development of Solutions',
        description:
          'Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for public health and safety.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PO4',
        type: 'PO',
        title: 'Conduct Investigations of Complex Problems',
        description:
          'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of information to provide valid conclusions.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PO5',
        type: 'PO',
        title: 'Modern Tool Usage',
        description:
          'Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PSO1',
        type: 'PSO',
        title: 'Core Domain Problem Solving',
        description:
          'Demonstrate mastery in designing, developing, and deploying robust software and algorithmic solutions in contemporary environments.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
      {
        programId: targetProgramId,
        code: 'PSO2',
        type: 'PSO',
        title: 'Industry Systems & Cloud Engineering',
        description:
          'Design and implement secure, scalable enterprise architectural frameworks utilizing modern cloud, DevOps, and AI principles.',
        targetThresholdPct: 60.0,
        targetLevel: 2.5,
      },
    ];

    setProgramOutcomes((prev) => {
      const filtered = prev.filter((po) => po.programId !== targetProgramId);
      const generated = referencePos.map((item, idx) => ({
        ...item,
        id: `po-${Date.now()}-${idx}`,
      }));
      return [...filtered, ...generated];
    });
  };

  // 4. Terms
  const addTerm = (term: Omit<AcademicTerm, 'id'>) => {
    const newId = `term-${Date.now()}`;
    setTerms((prev) => [...prev, { ...term, id: newId }]);
    if (!activeTermId) setActiveTermId(newId);
  };

  const addTermsBatch = (termsList: Array<Omit<AcademicTerm, 'id'>>) => {
    const newItems = termsList.map((t, idx) => ({ ...t, id: `term-${Date.now()}-${idx}` }));
    setTerms((prev) => [...prev, ...newItems]);
    if (!activeTermId && newItems.length > 0) setActiveTermId(newItems[0].id);
  };

  const updateTerm = (id: string, updates: Partial<AcademicTerm>) => {
    setTerms((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTerm = (id: string) => {
    setTerms((prev) => prev.filter((t) => t.id !== id));
    if (activeTermId === id) setActiveTermId(null);
  };

  // 5. Courses & Sections
  const addCourse = (course: Omit<CourseRecord, 'id'>) => {
    const newId = `course-${Date.now()}`;
    const pId = course.programId || activeProgramId || (programs[0]?.id ?? '');
    setCourses((prev) => [...prev, { ...course, programId: pId, id: newId }]);
    if (!activeCourseId) setActiveCourseId(newId);

    // Automatically create a default Section A for this new course
    const newSecId = `sec-${Date.now()}`;
    const defaultSection: CourseSection = {
      id: newSecId,
      courseId: newId,
      name: 'Section A',
      facultyName: course.coordinator || 'Assigned Faculty',
      academicYear: '2026-2027',
    };
    setCourseSections((prev) => [...prev, defaultSection]);
    if (!activeSectionId) setActiveSectionId(newSecId);
  };

  const addCoursesBatch = (courseList: Array<Omit<CourseRecord, 'id'>>) => {
    const createdCourses: CourseRecord[] = [];
    const createdSections: CourseSection[] = [];

    courseList.forEach((c, idx) => {
      const cId = `course-${Date.now()}-${idx}`;
      const pId = c.programId || activeProgramId || (programs[0]?.id ?? '');
      createdCourses.push({ ...c, programId: pId, id: cId });

      const sId = `sec-${Date.now()}-${idx}`;
      createdSections.push({
        id: sId,
        courseId: cId,
        name: 'Section A',
        facultyName: c.coordinator || 'Assigned Faculty',
        academicYear: '2026-2027',
      });
    });

    setCourses((prev) => [...prev, ...createdCourses]);
    setCourseSections((prev) => [...prev, ...createdSections]);
    if (!activeCourseId && createdCourses.length > 0) {
      setActiveCourseId(createdCourses[0].id);
      setActiveSectionId(createdSections[0].id);
    }
  };

  const updateCourse = (id: string, updates: Partial<CourseRecord>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    setCourseSections((prev) => prev.filter((s) => s.courseId !== id));
    setCourseOutcomes((prev) => prev.filter((co) => co.courseId !== id));
    setScoringSchemes((prev) => prev.filter((s) => s.courseId !== id));
    setScoringSubComponents((prev) => prev.filter((sub) => sub.courseId !== id));
    if (activeCourseId === id) setActiveCourseId(null);
  };

  const addCourseSection = (sec: Omit<CourseSection, 'id'>) => {
    const newId = `sec-${Date.now()}`;
    setCourseSections((prev) => [...prev, { ...sec, id: newId }]);
    if (!activeSectionId) setActiveSectionId(newId);
  };

  const addCourseSectionsBatch = (secList: Array<Omit<CourseSection, 'id'>>) => {
    const newItems = secList.map((s, idx) => ({ ...s, id: `sec-${Date.now()}-${idx}` }));
    setCourseSections((prev) => [...prev, ...newItems]);
    if (!activeSectionId && newItems.length > 0) setActiveSectionId(newItems[0].id);
  };

  const updateCourseSection = (id: string, updates: Partial<CourseSection>) => {
    setCourseSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteCourseSection = (id: string) => {
    setCourseSections((prev) => prev.filter((s) => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const assignStudentsToSection = (studentIds: string[], sectionId: string) => {
    setStudents((prev) =>
      prev.map((s) => (studentIds.includes(s.id) ? { ...s, sectionId } : s))
    );
  };

  const assignFacultyToSection = (
    sectionId: string,
    facultyId: string,
    facultyName: string
  ) => {
    setCourseSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, facultyId, facultyName } : s))
    );
  };

  const addCourseOutcome = (outcome: Omit<CourseOutcomeItem, 'id'>) => {
    setCourseOutcomes((prev) => [...prev, { ...outcome, id: `co-${Date.now()}` }]);
  };

  const addCourseOutcomesBatch = (outcomes: Array<Omit<CourseOutcomeItem, 'id'>>) => {
    const created = outcomes.map((co, idx) => ({
      ...co,
      id: `co-${Date.now()}-${idx}`,
    }));
    setCourseOutcomes((prev) => [...prev, ...created]);
  };

  const updateCourseOutcome = (id: string, updates: Partial<CourseOutcomeItem>) => {
    setCourseOutcomes((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const deleteCourseOutcome = (id: string) => {
    setCourseOutcomes((prev) => prev.filter((c) => c.id !== id));
    setCoPoMappings((prev) => prev.filter((m) => m.courseOutcomeId !== id));
    setQuestions((prev) => prev.filter((q) => q.courseOutcomeId !== id));
  };

  const updateCoPoMapping = (
    coId: string,
    poId: string,
    mappingLevel: number,
    justification?: string
  ) => {
    setCoPoMappings((prev) => {
      const idx = prev.findIndex(
        (m) => m.courseOutcomeId === coId && m.programOutcomeId === poId
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], mappingLevel, justification };
        return next;
      } else {
        return [
          ...prev,
          { courseOutcomeId: coId, programOutcomeId: poId, mappingLevel, justification },
        ];
      }
    });
  };

  const deleteCoPoMapping = (coId: string, poId: string) => {
    setCoPoMappings((prev) =>
      prev.filter((m) => !(m.courseOutcomeId === coId && m.programOutcomeId === poId))
    );
  };

  // 6. Scoring Components (Connected to each Course)
  const addScoringScheme = (scheme: Omit<ScoringScheme, 'id'>) => {
    const cId = scheme.courseId || activeCourseId || (courses[0]?.id ?? '');
    setScoringSchemes((prev) => [
      ...prev,
      { ...scheme, courseId: cId, id: `scheme-${Date.now()}` },
    ]);
  };

  const addScoringSchemesBatch = (schemesList: Array<Omit<ScoringScheme, 'id'>>) => {
    const newItems = schemesList.map((s, idx) => ({
      ...s,
      courseId: s.courseId || activeCourseId || (courses[0]?.id ?? ''),
      id: `scheme-${Date.now()}-${idx}`,
    }));
    setScoringSchemes((prev) => [...prev, ...newItems]);
  };

  const updateScoringScheme = (id: string, updates: Partial<ScoringScheme>) => {
    setScoringSchemes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteScoringScheme = (id: string) => {
    setScoringSchemes((prev) => prev.filter((s) => s.id !== id));
    setScoringSubComponents((prev) => prev.filter((sub) => sub.schemeId !== id));
  };

  // Each Sub Component has an associated question paper
  const addScoringSubComponent = (subComp: Omit<ScoringSubComponent, 'id'>) => {
    const subId = `sub-${Date.now()}`;
    const cId = subComp.courseId || activeCourseId || (courses[0]?.id ?? '');
    const qpId = `qp-${Date.now()}`;

    // Create the associated Question Paper
    const newQuestionPaper: QuestionPaper = {
      id: qpId,
      courseId: cId,
      subComponentId: subId,
      subComponentName: subComp.name,
      title: `${subComp.name} Question Paper (Batch 2026)`,
      totalMarks: subComp.maxMarks || 50,
      instructions: 'Please read all section instructions carefully before answering.',
    };

    setQuestionPapers((prev) => [...prev, newQuestionPaper]);
    if (!activeQuestionPaperId) setActiveQuestionPaperId(qpId);

    // Create default Section A
    const secId = `sec-${Date.now()}`;
    setQuestionPaperSections((prev) => [
      ...prev,
      {
        id: secId,
        questionPaperId: qpId,
        sectionName: 'Section A',
        choiceRule: 'ALL',
        totalQuestions: 5,
        questionsToAnswer: 5,
        instructions: 'Answer ALL questions in this section.',
        displayOrder: 1,
      },
    ]);

    setScoringSubComponents((prev) => [
      ...prev,
      {
        ...subComp,
        id: subId,
        courseId: cId,
        questionPaperId: qpId,
      },
    ]);
  };

  const addScoringSubComponentsBatch = (subList: Array<Omit<ScoringSubComponent, 'id'>>) => {
    const newSubs: ScoringSubComponent[] = [];
    const newPapers: QuestionPaper[] = [];

    subList.forEach((sub, idx) => {
      const subId = `sub-${Date.now()}-${idx}`;
      const cId = sub.courseId || activeCourseId || (courses[0]?.id ?? '');
      const qpId = `qp-${Date.now()}-${idx}`;

      newSubs.push({
        ...sub,
        id: subId,
        courseId: cId,
        questionPaperId: qpId,
      });

      newPapers.push({
        id: qpId,
        courseId: cId,
        subComponentId: subId,
        subComponentName: sub.name,
        title: `${sub.name} Question Paper (Batch 2026)`,
        totalMarks: sub.maxMarks || 50,
        instructions: 'Answer all questions as specified in each section.',
      });
    });

    setScoringSubComponents((prev) => [...prev, ...newSubs]);
    setQuestionPapers((prev) => [...prev, ...newPapers]);
  };

  const updateScoringSubComponent = (id: string, updates: Partial<ScoringSubComponent>) => {
    setScoringSubComponents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteScoringSubComponent = (id: string) => {
    setScoringSubComponents((prev) => prev.filter((s) => s.id !== id));
    setQuestionPapers((prev) => prev.filter((qp) => qp.subComponentId !== id));
  };

  // 7. Assessment Windows & Question Papers
  const addAssessmentWindow = (win: Omit<AssessmentWindowRecord, 'id'>) => {
    const newId = `win-${Date.now()}`;
    const newWin: AssessmentWindowRecord = {
      ...win,
      id: newId,
      courseId: win.courseId || activeCourseId || '',
    };
    setAssessmentWindows((prev) => [...prev, newWin]);
    if (!activeWindowId) setActiveWindowId(newId);

    // Notify assigned faculty of question-wise mark entry allocation
    if (win.facultyId) {
      const assignedFac = users.find((u) => u.id === win.facultyId);
      if (assignedFac) {
        sendInstitutionalNotification({
          recipientEmail: assignedFac.email,
          recipientName: assignedFac.fullName,
          subject: `Marks Entry Allocation: ${win.subComponentName} (Deadline: ${new Date(win.closeDateTime).toLocaleString()})`,
          type: 'MARK_ENTRY_ALLOCATION',
          body: `You have been allocated by the administrator to enter question-wise marks for ${win.subComponentName}. The marks entry window opens on ${new Date(win.openDateTime).toLocaleString()} and closes strictly at ${new Date(win.closeDateTime).toLocaleString()}.`,
          link: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}`,
        });
      }
    }
  };

  const updateAssessmentWindow = (window: AssessmentWindowRecord) => {
    setAssessmentWindows((prev) => {
      const idx = prev.findIndex((w) => w.id === window.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = window;
        return next;
      }
      return [...prev, window];
    });
  };

  const deleteAssessmentWindow = (id: string) => {
    setAssessmentWindows((prev) => prev.filter((w) => w.id !== id));
    if (activeWindowId === id) setActiveWindowId(null);
  };

  const extendAssessmentWindowDeadline = (
    windowId: string,
    newCloseDateTime: string,
    newFacultyId?: string,
    reason?: string
  ) => {
    let notifiedFac: UserAccount | undefined;
    let windowSubName = 'Assessment Component';

    setAssessmentWindows((prev) =>
      prev.map((w) => {
        if (w.id !== windowId) return w;
        windowSubName = w.subComponentName;
        let facName = w.facultyName;
        const targetFacId = newFacultyId || w.facultyId;
        if (targetFacId) {
          const fac = users.find((u) => u.id === targetFacId);
          if (fac) {
            facName = fac.fullName;
            notifiedFac = fac;
          }
        }
        return {
          ...w,
          closeDateTime: newCloseDateTime,
          status: 'UNLOCKED_BY_ADMIN',
          facultyId: targetFacId,
          facultyName: facName,
          unlockAuditReason: reason || `Deadline extended by Admin to ${newCloseDateTime}`,
        };
      })
    );

    if (notifiedFac) {
      sendInstitutionalNotification({
        recipientEmail: (notifiedFac as UserAccount).email,
        recipientName: (notifiedFac as UserAccount).fullName,
        subject: `Assessment Marks Entry Window Deadline Extended: ${windowSubName}`,
        type: 'DEADLINE_EXTENSION',
        body: `The deadline for entering question-wise marks for ${windowSubName} has been extended to ${new Date(newCloseDateTime).toLocaleString()}. Audit Reason: ${reason || 'Administrative Extension'}. Please log in to complete marks entry within the extended deadline.`,
        link: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}`,
      });
    }
  };

  const addQuestionPaper = (qp: Omit<QuestionPaper, 'id'>): string => {
    const newId = `qp-${Date.now()}`;
    setQuestionPapers((prev) => [...prev, { ...qp, id: newId }]);
    setActiveQuestionPaperId(newId);
    return newId;
  };

  const updateQuestionPaper = (id: string, updates: Partial<QuestionPaper>) => {
    setQuestionPapers((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestionPaper = (id: string) => {
    setQuestionPapers((prev) => prev.filter((q) => q.id !== id));
    setQuestionPaperSections((prev) => prev.filter((s) => s.questionPaperId !== id));
    setQuestions((prev) => prev.filter((q) => q.questionPaperId !== id));
    if (activeQuestionPaperId === id) setActiveQuestionPaperId(null);
  };

  const getOrCreateQuestionPaperForSubComponent = (
    subCompId: string,
    courseId: string,
    subCompName: string
  ): QuestionPaper => {
    const existing = questionPapers.find(
      (qp) => qp.subComponentId === subCompId && qp.courseId === courseId
    );
    if (existing) return existing;

    const newId = `qp-${Date.now()}`;
    const newPaper: QuestionPaper = {
      id: newId,
      courseId,
      subComponentId: subCompId,
      subComponentName: subCompName,
      title: `${subCompName} Question Paper (Batch 2026)`,
      totalMarks: 50,
      instructions: 'Answer all compulsory questions and required choices as specified in each section.',
    };

    setQuestionPapers((prev) => [...prev, newPaper]);
    setActiveQuestionPaperId(newId);

    // Create default Section A
    const secId = `sec-${Date.now()}`;
    setQuestionPaperSections((prev) => [
      ...prev,
      {
        id: secId,
        questionPaperId: newId,
        sectionName: 'Section A',
        choiceRule: 'ALL',
        totalQuestions: 5,
        questionsToAnswer: 5,
        instructions: 'Answer ALL questions in Section A.',
        displayOrder: 1,
      },
    ]);

    setScoringSubComponents((prev) =>
      prev.map((s) => (s.id === subCompId ? { ...s, questionPaperId: newId } : s))
    );

    return newPaper;
  };

  const addQuestionPaperSection = (sec: Omit<QuestionPaperSection, 'id'>) => {
    setQuestionPaperSections((prev) => [
      ...prev,
      { ...sec, id: `sec-${Date.now()}`, displayOrder: prev.length + 1 },
    ]);
  };

  const updateQuestionPaperSection = (id: string, updates: Partial<QuestionPaperSection>) => {
    setQuestionPaperSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteQuestionPaperSection = (id: string) => {
    setQuestionPaperSections((prev) => prev.filter((s) => s.id !== id));
    setQuestions((prev) => prev.filter((q) => q.sectionId !== id));
  };

  const addQuestionPaperTemplate = (tpl: Omit<QuestionPaperTemplate, 'id'>) => {
    setQuestionPaperTemplates((prev) => [...prev, { ...tpl, id: `tpl-${Date.now()}` }]);
  };

  const updateQuestionPaperTemplate = (id: string, updates: Partial<QuestionPaperTemplate>) => {
    setQuestionPaperTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteQuestionPaperTemplate = (id: string) => {
    setQuestionPaperTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const applyQuestionPaperTemplate = (
    templateId: string,
    questionPaperId: string,
    defaultCoId?: string
  ) => {
    const tpl = questionPaperTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    // Find the target question paper and its course to match COs
    const targetQp = questionPapers.find((qp) => qp.id === questionPaperId);
    const targetCourseId = targetQp?.courseId;
    const relevantCos = courseOutcomes.filter(
      (co) => !targetCourseId || co.courseId === targetCourseId
    );

    const newSections: QuestionPaperSection[] = [];
    const newQuestions: QuestionItem[] = [];

    let qGlobalIndex = 1;

    tpl.sections.forEach((secTpl, secIdx) => {
      const secId = `sec-${Date.now()}-${secIdx}`;
      newSections.push({
        id: secId,
        questionPaperId,
        sectionName: secTpl.sectionName,
        instructions:
          secTpl.instructions ||
          (secTpl.choiceRule === 'ALL'
            ? `Answer ALL questions in this section (${secTpl.totalQuestions} questions x ${secTpl.marksPerQuestion} Marks).`
            : `Answer any ${secTpl.questionsToAnswer || secTpl.totalQuestions} questions out of ${secTpl.totalQuestions} (${secTpl.questionsToAnswer} questions x ${secTpl.marksPerQuestion} Marks).`),
        choiceRule: secTpl.choiceRule,
        questionsToAnswer: secTpl.questionsToAnswer,
        totalQuestions: secTpl.totalQuestions,
        displayOrder: secIdx + 1,
      });

      // If template has explicitly saved questions (Restores Question-Wise COs!)
      if (secTpl.questions && secTpl.questions.length > 0) {
        secTpl.questions.forEach((tplQ, qIdx) => {
          // Resolve Question-Wise CO by matching coCode (e.g. "CO1") to target course
          let matchedCo = relevantCos.find(
            (c) => c.code.trim().toUpperCase() === tplQ.coCode.trim().toUpperCase()
          );
          if (!matchedCo && relevantCos.length > 0) {
            const coIndex = parseInt(tplQ.coCode.replace(/\D/g, '') || '1', 10) - 1;
            matchedCo = relevantCos[coIndex % relevantCos.length];
          }

          newQuestions.push({
            id: `q-${Date.now()}-${newQuestions.length + 1}-${qIdx}`,
            questionPaperId,
            sectionId: secId,
            questionNumber: tplQ.questionNumber,
            partLabel: tplQ.partLabel,
            parentQuestionId: tplQ.questionNumber.includes('(')
              ? tplQ.questionNumber.split('(')[0].trim()
              : undefined,
            isOption: tplQ.isOption,
            optionGroup: tplQ.optionGroup,
            optionLabel: tplQ.optionLabel,
            content: tplQ.content || '',
            maxMarks: tplQ.maxMarks,
            courseOutcomeId: matchedCo?.id || defaultCoId || '',
            bloomsLevel: tplQ.bloomsLevel,
            targetThresholdPct: 60,
            displayOrder: tplQ.displayOrder || newQuestions.length + 1,
          });
        });
      } else {
        // Fallback procedural generation for templates without explicit question arrays
        for (let q = 1; q <= secTpl.totalQuestions; q++) {
          const qNum = `Q${qGlobalIndex}`;
          qGlobalIndex++;
          const coForQ =
            relevantCos.length > 0
              ? relevantCos[(qGlobalIndex - 2) % relevantCos.length]?.id
              : defaultCoId || '';

          if (secTpl.hasOptions) {
            // Create Option A and Option B
            const optGroupId = `OPT-${qNum}`;

            if (secTpl.hasParts) {
              // Part a & b for Option A
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}(a)`,
                partLabel: 'a',
                parentQuestionId: qNum,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option A',
                content: '',
                maxMarks: Math.floor(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'APPLY',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}(b)`,
                partLabel: 'b',
                parentQuestionId: qNum,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option A',
                content: '',
                maxMarks: Math.ceil(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'APPLY',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });

              // Part a & b for Option B (OR)
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum} OR (a)`,
                partLabel: 'a',
                parentQuestionId: `${qNum} OR`,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option B (OR)',
                content: '',
                maxMarks: Math.floor(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'ANALYZE',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum} OR (b)`,
                partLabel: 'b',
                parentQuestionId: `${qNum} OR`,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option B (OR)',
                content: '',
                maxMarks: Math.ceil(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'ANALYZE',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
            } else {
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}`,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option A',
                content: '',
                maxMarks: secTpl.marksPerQuestion,
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'APPLY',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum} OR`,
                isOption: true,
                optionGroup: optGroupId,
                optionLabel: 'Option B (OR)',
                content: '',
                maxMarks: secTpl.marksPerQuestion,
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'ANALYZE',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
            }
          } else {
            if (secTpl.hasParts) {
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}.a`,
                partLabel: 'a',
                parentQuestionId: qNum,
                content: '',
                maxMarks: Math.floor(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'UNDERSTAND',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}.b`,
                partLabel: 'b',
                parentQuestionId: qNum,
                content: '',
                maxMarks: Math.ceil(secTpl.marksPerQuestion / 2),
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'UNDERSTAND',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
            } else {
              newQuestions.push({
                id: `q-${Date.now()}-${newQuestions.length + 1}`,
                questionPaperId,
                sectionId: secId,
                questionNumber: `${qNum}`,
                content: '',
                maxMarks: secTpl.marksPerQuestion,
                courseOutcomeId: coForQ,
                bloomsLevel: secTpl.defaultBlooms || 'REMEMBER',
                targetThresholdPct: 60,
                displayOrder: newQuestions.length + 1,
              });
            }
          }
        }
      }
    });

    setQuestionPaperSections((prev) => [
      ...prev.filter((s) => s.questionPaperId !== questionPaperId),
      ...newSections,
    ]);
    setQuestions((prev) => [
      ...prev.filter((q) => q.questionPaperId !== questionPaperId),
      ...newQuestions,
    ]);
  };

  const addQuestion = (q: Omit<QuestionItem, 'id'>) => {
    setQuestions((prev) => [
      ...prev,
      { ...q, id: `q-${Date.now()}`, displayOrder: prev.length + 1 },
    ]);
  };

  const addQuestionsBatch = (newQuestions: Array<Omit<QuestionItem, 'id'>>) => {
    const created: QuestionItem[] = newQuestions.map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      displayOrder: q.displayOrder || questions.length + idx + 1,
    }));
    setQuestions((prev) => [...prev, ...created]);
  };

  const updateQuestion = (id: string, updates: Partial<QuestionItem>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setMarks((prev) => prev.filter((m) => m.questionId !== id));
  };

  // 8. Filling of Marks & Students
  const addStudent = (student: Omit<StudentEnrollment, 'id' | 'studentId'>) => {
    const id = `stu-${Date.now()}`;
    setStudents((prev) => [
      ...prev,
      {
        ...student,
        id,
        studentId: `user-${Date.now()}`,
        courseId: student.courseId || activeCourseId || '',
        sectionId: student.sectionId || activeSectionId || '',
      },
    ]);
  };

  const addStudentsBatch = (
    newStudents: Array<{
      rollNumber: string;
      studentName: string;
      sectionId?: string;
      courseId?: string;
    }>
  ) => {
    const created: StudentEnrollment[] = newStudents.map((s, idx) => ({
      id: `stu-${Date.now()}-${idx}`,
      studentId: `u-${Date.now()}-${idx}`,
      rollNumber: s.rollNumber,
      studentName: s.studentName,
      enrollmentStatus: 'ACTIVE',
      courseId: s.courseId || activeCourseId || '',
      sectionId: s.sectionId || activeSectionId || '',
    }));
    setStudents((prev) => [...prev, ...created]);
  };

  const updateStudent = (id: string, updates: Partial<StudentEnrollment>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setMarks((prev) => prev.filter((m) => m.enrollmentId !== id));
  };

  const updateMarkEntry = (
    enrollmentId: string,
    questionId: string,
    statusCode: MarkEntryStatusCode,
    marksObtained: number | null
  ) => {
    setMarks((prev) => {
      const idx = prev.findIndex(
        (m) => m.enrollmentId === enrollmentId && m.questionId === questionId
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], statusCode, marksObtained };
        return next;
      } else {
        const newEntry: MarkEntryRecord = {
          id: `m-${Date.now()}-${Math.random()}`,
          assessmentWindowId: activeWindowId || assessmentWindows[0]?.id || 'win-1',
          enrollmentId,
          questionId,
          statusCode,
          marksObtained,
        };
        return [...prev, newEntry];
      }
    });
  };

  const importMarksBatch = (entries: MarkEntryRecord[]) => {
    setMarks((prev) => {
      const markMap = new Map<string, MarkEntryRecord>();
      prev.forEach((m) => markMap.set(`${m.enrollmentId}_${m.questionId}`, m));
      entries.forEach((m) => markMap.set(`${m.enrollmentId}_${m.questionId}`, m));
      return Array.from(markMap.values());
    });
  };

  const clearMarks = (windowId?: string) => {
    if (windowId) {
      setMarks((prev) => prev.filter((m) => m.assessmentWindowId !== windowId));
    } else {
      setMarks([]);
    }
  };

  // 9. Feedback Survey
  const addSurveyResponse = (courseOutcomeId: string, likertScore: number) => {
    setSurveyResponses((prev) => [...prev, { courseOutcomeId, likertScore }]);
  };

  // Reset & Wipe All Data - Deletes ALL logins including the admin login
  const resetAllData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('academic_erp_current_user');
      localStorage.removeItem('academic_erp_theme');
    }
    setCurrentUser(null);
    setCurrentUserRole('TENANT_ADMIN');
    setIsInitialized(false);
    setTenant(null);
    setAdminUser(null);
    setUsers([]);
    setFaculties([]);
    setSchools([]);
    setDepartments([]);
    setRegulations([]);
    setPrograms([]);
    setActiveProgramId(null);
    setProgramOutcomes([]);
    setTerms([]);
    setActiveTermId(null);
    setCourses([]);
    setActiveCourseId(null);
    setCourseSections([]);
    setActiveSectionId(null);
    setCourseOutcomes([]);
    setCoPoMappings([]);
    setScoringSchemes([]);
    setScoringSubComponents([]);
    setAssessmentWindows([]);
    setActiveWindowId(null);
    setQuestionPapers([]);
    setActiveQuestionPaperId(null);
    setQuestionPaperSections([]);
    setQuestionPaperTemplates(DEFAULT_QUESTION_PAPER_TEMPLATES);
    setQuestions([]);
    setStudents([]);
    setMarks([]);
    setSurveyResponses([]);
    setOutgoingEmails([]);
  };

  const updateConfig = (cfg: Partial<typeof config>) => {
    setConfig((prev) => ({ ...prev, ...cfg }));
  };

  return (
    <AppContext.Provider
      value={{
        isInitialized,
        tenant,
        adminUser,
        currentUserRole,
        setCurrentUserRole,
        theme,
        setTheme,
        currentUser,
        academicScope,
        login,
        logout,
        users,
        addUser,
        addUsersBatch,
        updateUser,
        deleteUser,
        approveUserAccount,
        rejectUserAccount,
        adminResetUserPassword,
        requestForgotPassword,
        verifyOtpAndSetPassword,
        emailConfig,
        updateEmailConfig,
        outgoingEmails,
        clearOutgoingEmails,
        sendTestEmail,
        sendInstitutionalNotification,
        faculties,
        addFaculty,
        addFacultiesBatch,
        updateFaculty,
        deleteFaculty,
        setFacultyHead,
        schools,
        addSchool,
        addSchoolsBatch,
        updateSchool,
        deleteSchool,
        setSchoolHead,
        departments,
        addDepartment,
        addDepartmentsBatch,
        updateDepartment,
        deleteDepartment,
        setDepartmentHead,
        regulations,
        addRegulation,
        addRegulationsBatch,
        updateRegulation,
        deleteRegulation,
        programs,
        activeProgramId,
        setActiveProgramId,
        addProgram,
        addProgramsBatch,
        updateProgram,
        deleteProgram,
        programOutcomes,
        addProgramOutcome,
        addProgramOutcomesBatch,
        updateProgramOutcome,
        deleteProgramOutcome,
        loadStandardNbaReferencePos,
        terms,
        activeTermId,
        setActiveTermId,
        addTerm,
        addTermsBatch,
        updateTerm,
        deleteTerm,
        courses,
        activeCourseId,
        setActiveCourseId,
        addCourse,
        addCoursesBatch,
        updateCourse,
        deleteCourse,
        courseSections,
        activeSectionId,
        setActiveSectionId,
        addCourseSection,
        addCourseSectionsBatch,
        updateCourseSection,
        deleteCourseSection,
        assignStudentsToSection,
        assignFacultyToSection,
        courseOutcomes,
        addCourseOutcome,
        addCourseOutcomesBatch,
        updateCourseOutcome,
        deleteCourseOutcome,
        coPoMappings,
        updateCoPoMapping,
        deleteCoPoMapping,
        scoringSchemes,
        addScoringScheme,
        addScoringSchemesBatch,
        updateScoringScheme,
        deleteScoringScheme,
        scoringSubComponents,
        addScoringSubComponent,
        addScoringSubComponentsBatch,
        updateScoringSubComponent,
        deleteScoringSubComponent,
        assessmentWindows,
        activeWindowId,
        setActiveWindowId,
        addAssessmentWindow,
        updateAssessmentWindow,
        deleteAssessmentWindow,
        extendAssessmentWindowDeadline,
        questionPapers,
        activeQuestionPaperId,
        setActiveQuestionPaperId,
        addQuestionPaper,
        updateQuestionPaper,
        deleteQuestionPaper,
        getOrCreateQuestionPaperForSubComponent,
        questionPaperSections,
        addQuestionPaperSection,
        updateQuestionPaperSection,
        deleteQuestionPaperSection,
        questionPaperTemplates,
        addQuestionPaperTemplate,
        updateQuestionPaperTemplate,
        deleteQuestionPaperTemplate,
        applyQuestionPaperTemplate,
        questions,
        addQuestion,
        addQuestionsBatch,
        updateQuestion,
        deleteQuestion,
        students,
        addStudent,
        addStudentsBatch,
        updateStudent,
        deleteStudent,
        marks,
        updateMarkEntry,
        importMarksBatch,
        clearMarks,
        surveyResponses,
        addSurveyResponse,
        config,
        updateConfig,
        activeMenuItem,
        setActiveMenuItem,
        activeSubTab,
        setActiveSubTab,
        navigateTo,
        initializeInstitution,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
