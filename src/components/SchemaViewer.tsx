'use client';

import React, { useState } from 'react';
import { Database, ShieldCheck, Code, Layers, Copy, Check } from 'lucide-react';

export const SchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prisma' | 'ddl' | 'architecture'>('prisma');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-3 py-1 rounded-full border border-amber-800">
                Deliverable 1: Relational Schema & Multi-Tenancy
              </span>
              <span className="text-xs text-slate-400">PostgreSQL RLS & Prisma ORM</span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Database Schema & Row-Level Security (RLS) Specification
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Complete primary/foreign key integrity, cascade guards, soft deletes, tenant_id isolation, and JSONB blueprints.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('prisma')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'prisma'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Prisma Schema
            </button>
            <button
              onClick={() => setActiveTab('ddl')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'ddl'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              PostgreSQL DDL & RLS
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'architecture'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Architecture & Security
            </button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      {activeTab === 'prisma' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Code className="w-4 h-4 text-amber-400" />
              <span>prisma/schema.prisma (Multi-Tenant Relational Data Model)</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">13 Core Models &bull; Strict Relations</span>
          </div>

          <pre className="text-xs font-mono text-slate-300 bg-slate-900/90 p-5 rounded-xl overflow-x-auto max-h-[580px] leading-relaxed border border-slate-800">
{`// ============================================================================
// Multi-Tenant Academic ERP & OBE Attainment Platform - Prisma Schema
// ============================================================================

model Tenant {
  id                    String                 @id @default(uuid())
  code                  String                 @unique // e.g. "STANFORD", "BITS-PILANI"
  name                  String                 // e.g. "Apex Institute of Science & Technology"
  subdomain             String                 @unique // e.g. "apex.obeplatform.io"
  mfaEnforced           Boolean                @default(true)
  faculties             Faculty[]
  users                 User[]
  regulations           AcademicRegulation[]
}

model Faculty {
  id                    String                 @id @default(uuid())
  tenantId              String
  tenant                Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  code                  String                 // e.g. "FET"
  name                  String                 // "Faculty of Engineering & Technology"
  schools               School[]
}

model School {
  id                    String                 @id @default(uuid())
  tenantId              String
  facultyId             String
  faculty               Faculty                @relation(fields: [facultyId], references: [id], onDelete: Cascade)
  code                  String                 // e.g. "SCSE"
  name                  String                 // "School of Computer Science & Engineering"
  departments           Department[]
}

model Department {
  id                    String                 @id @default(uuid())
  tenantId              String
  schoolId              String
  school                School                 @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  code                  String                 // e.g. "CSE-AI"
  name                  String
  programs              Program[]
  users                 User[]
}

model AcademicRegulation {
  id                    String                 @id @default(uuid())
  tenantId              String
  code                  String                 // e.g. "R2026-CBCS"
  name                  String
  minTotalCredits       Int                    @default(160)
  gradingScale          Json                   // Letter grades (O, A+, A, B+)
  defaultObeThreshold   Float                  @default(60.0) // 60% student cutoff
  defaultAttainmentLevels Json                 // Level 3: >=70%, Level 2: >=60%, Level 1: >=50%
  directWeight          Float                  @default(0.80) // 80% Direct OBE
  indirectWeight        Float                  @default(0.20) // 20% Exit Survey
  programs              Program[]
}

model Program {
  id                    String                 @id @default(uuid())
  tenantId              String
  departmentId          String
  department            Department             @relation(fields: [departmentId], references: [id])
  regulationId          String
  regulation            AcademicRegulation     @relation(fields: [regulationId], references: [id])
  code                  String                 // e.g. "BTECH-CSE"
  terms                 Term[]
  programOutcomes       ProgramOutcome[]
}

model ProgramOutcome {
  id                    String                 @id @default(uuid())
  tenantId              String
  programId             String
  program               Program                @relation(fields: [programId], references: [id])
  code                  String                 // "PO1" - "PO12" / "PSO1" - "PSO3"
  type                  OutcomeType            // PO or PSO
  title                 String                 // e.g. "Engineering Knowledge"
  description           String
  targetLevel           Float                  @default(2.5)  // 0-3 scale
  coMappings            CoPoMapping[]
}

model Course {
  id                    String                 @id @default(uuid())
  tenantId              String
  termId                String
  term                  Term                   @relation(fields: [termId], references: [id])
  code                  String                 // e.g. "CS301"
  title                 String                 // "Advanced Data Structures"
  credits               Int                    @default(4)
  lectureHours          Int                    @default(3)
  tutorialHours         Int                    @default(0)
  practicalHours        Int                    @default(2)
  courseOutcomes        CourseOutcome[]
  sections              Section[]
  evaluationScheme      CourseEvaluationScheme?
}

model CourseOutcome {
  id                    String                 @id @default(uuid())
  tenantId              String
  courseId              String
  course                Course                 @relation(fields: [courseId], references: [id])
  code                  String                 // "CO1", "CO2"
  statement             String
  bloomsLevel           BloomsTaxonomyLevel    // REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE
  poMappings            CoPoMapping[]
  questions             Question[]
}

model CoPoMapping {
  id                    String                 @id @default(uuid())
  tenantId              String
  courseOutcomeId       String
  courseOutcome         CourseOutcome          @relation(fields: [courseOutcomeId], references: [id])
  programOutcomeId      String
  programOutcome        ProgramOutcome         @relation(fields: [programOutcomeId], references: [id])
  mappingLevel          Int                    // 0: None, 1: Low, 2: Medium, 3: High
  justification         String?                // ABET/NBA audit justification
}

model Section {
  id                    String                 @id @default(uuid())
  tenantId              String
  courseId              String
  name                  String                 // "Section A", "Section B"
  enrollments           Enrollment[]
  assessmentWindows     AssessmentWindow[]
}

model AssessmentWindow {
  id                    String                 @id @default(uuid())
  tenantId              String
  sectionId             String
  subComponentId        String
  questionPaperId       String
  status                AssessmentWindowStatus // DRAFT, SUBMITTED, FROZEN, UNLOCKED_BY_ADMIN
  openDateTime          DateTime
  closeDateTime         DateTime
  emergencyCloseDate    DateTime?
  markEntries           MarkEntry[]
}

model MarkEntry {
  id                    String                 @id @default(uuid())
  tenantId              String
  assessmentWindowId    String
  enrollmentId          String
  questionId            String
  statusCode            MarkEntryStatusCode    // PRESENT, ABSENT, MALPRACTICE, EXEMPTED
  marksObtained         Float?
  createdById           String
}`}
          </pre>
        </div>
      )}

      {activeTab === 'ddl' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>prisma/ddl.sql (Native PostgreSQL Row-Level Security Policies & Indexes)</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">Row-Level Security (RLS) Active</span>
          </div>

          <pre className="text-xs font-mono text-slate-300 bg-slate-900/90 p-5 rounded-xl overflow-x-auto max-h-[580px] leading-relaxed border border-slate-800">
{`-- ============================================================================
-- Row-Level Security (RLS) Policies & Dynamic Multi-Tenant Isolation
-- ============================================================================

-- Dynamic Tenant Context Helper Function
-- Session configuration parameter 'app.current_tenant_id' is set per request
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Super Admin Bypass Flag Helper Function
CREATE OR REPLACE FUNCTION is_app_super_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(current_setting('app.is_super_admin', true)::BOOLEAN, false);
$$ LANGUAGE sql STABLE;

-- Enable Row-Level Security on all tenant-isolated tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE obe_attainment_snapshots ENABLE ROW LEVEL SECURITY;

-- Enforce Strict Tenant Isolation via RLS Policies
CREATE POLICY mark_entries_tenant_isolation ON mark_entries
    FOR ALL
    USING (
        is_app_super_admin() OR tenant_id = current_app_tenant_id()
    )
    WITH CHECK (
        is_app_super_admin() OR tenant_id = current_app_tenant_id()
    );

-- Performance Composite Indexes
CREATE INDEX idx_marks_window_enrollment ON mark_entries(tenant_id, assessment_window_id, enrollment_id);
CREATE INDEX idx_marks_question ON mark_entries(tenant_id, question_id);
CREATE INDEX idx_asmtwin_section_status ON assessment_windows(tenant_id, section_id, status);
CREATE INDEX idx_copo_co ON co_po_mappings(tenant_id, course_outcome_id);
CREATE INDEX idx_copo_po ON co_po_mappings(tenant_id, program_outcome_id);`}
          </pre>
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">
              Enterprise Multi-Tenant SaaS Architecture Overview
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Architectural design decisions ensuring data privacy, ABET/NBA accreditation compliance, and high throughput.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-indigo-400 font-bold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>1. Multi-Tenant Isolation</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every query is automatically scoped with <code className="text-indigo-300 font-mono">tenant_id</code> via PostgreSQL native Row-Level Security (RLS) session variables. No university can ever read or write another tenant&apos;s records.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>2. Granular RBAC & Scopes</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rigorous role hierarchy: <code className="text-emerald-300 font-mono">SUPER_ADMIN</code> &rarr; <code className="text-emerald-300 font-mono">TENANT_ADMIN</code> &rarr; <code className="text-emerald-300 font-mono">DEAN/HOD</code> &rarr; <code className="text-emerald-300 font-mono">COORDINATOR</code> &rarr; <code className="text-emerald-300 font-mono">FACULTY</code> &rarr; <code className="text-emerald-300 font-mono">STUDENT</code>. Faculty can only edit assigned sections.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="text-purple-400 font-bold text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>3. Audit Integrity & Freeze</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Marks enter an immutable state machine (<code className="text-purple-300 font-mono">DRAFT &rarr; SUBMITTED &rarr; FROZEN</code>). Once frozen, attainment snapshots are locked. Emergency admin unlocks require mandatory audit logging.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
