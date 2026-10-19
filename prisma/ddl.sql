-- ============================================================================
-- Enterprise Multi-Tenant Academic ERP & OBE Attainment Platform
-- PostgreSQL DDL with Native Row-Level Security (RLS), Strict FKs, & Audit Indexes
-- Target Compatibility: PostgreSQL 14+, Supabase, AWS RDS, Neon
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. CUSTOM TYPES & ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPER_ADMIN', 'TENANT_ADMIN', 'DEAN', 'HOD', 
        'COURSE_COORDINATOR', 'COURSE_FACULTY', 'STUDENT'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE blooms_level AS ENUM (
        'REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE window_status AS ENUM (
        'DRAFT', 'SUBMITTED', 'FROZEN', 'UNLOCKED_BY_ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE mark_status_code AS ENUM (
        'PRESENT', 'ABSENT', 'MALPRACTICE', 'EXEMPTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE component_type AS ENUM ('CIE', 'SEE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM ('PO', 'PSO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 2. TENANT & CORE INSTITUTIONAL HIERARCHY
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    mfa_enforced BOOLEAN DEFAULT TRUE NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    mfa_secret TEXT,
    department_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    dean_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_faculties_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_schools_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_departments_tenant_code UNIQUE (tenant_id, code)
);

ALTER TABLE users ADD CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. ACADEMIC REGULATIONS, PROGRAMS & TERMS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS academic_regulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    min_total_credits INT DEFAULT 160 NOT NULL,
    grading_scale JSONB NOT NULL,
    default_obe_threshold NUMERIC(5,2) DEFAULT 60.00 NOT NULL,
    default_attainment_levels JSONB NOT NULL,
    direct_weight NUMERIC(4,2) DEFAULT 0.80 NOT NULL,
    indirect_weight NUMERIC(4,2) DEFAULT 0.20 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_regulations_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    regulation_id UUID NOT NULL REFERENCES academic_regulations(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(50) NOT NULL,
    duration_years INT DEFAULT 4 NOT NULL,
    total_terms INT DEFAULT 8 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_programs_tenant_dept_reg_code UNIQUE (tenant_id, code, regulation_id)
);

CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    term_number INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    session VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_terms_tenant_prog_session UNIQUE (tenant_id, program_id, academic_year, session, term_number)
);

-- ----------------------------------------------------------------------------
-- 4. OUTCOME-BASED EDUCATION (OBE): POS, PSOS, COURSES & COS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS program_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- 'PO1', 'PO2', 'PSO1'
    type outcome_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_threshold_pct NUMERIC(5,2) DEFAULT 60.00 NOT NULL,
    target_level NUMERIC(3,2) DEFAULT 2.50 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_pos_tenant_program_code UNIQUE (tenant_id, program_id, code)
);

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    credits INT DEFAULT 4 NOT NULL,
    lecture_hours INT DEFAULT 3 NOT NULL,
    tutorial_hours INT DEFAULT 0 NOT NULL,
    practical_hours INT DEFAULT 2 NOT NULL,
    syllabus TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_courses_tenant_term_code UNIQUE (tenant_id, term_id, code)
);

CREATE TABLE IF NOT EXISTS course_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL, -- 'CO1', 'CO2'
    statement TEXT NOT NULL,
    blooms_level blooms_level NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_cos_tenant_course_code UNIQUE (tenant_id, course_id, code)
);

CREATE TABLE IF NOT EXISTS co_po_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_outcome_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE CASCADE,
    program_outcome_id UUID NOT NULL REFERENCES program_outcomes(id) ON DELETE CASCADE,
    mapping_level INT CHECK (mapping_level BETWEEN 0 AND 3) NOT NULL,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_copo_tenant_co_po UNIQUE (tenant_id, course_outcome_id, program_outcome_id)
);

-- ----------------------------------------------------------------------------
-- 5. SECTIONS & ENROLLMENTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- 'Section A', 'Section B'
    max_capacity INT DEFAULT 60 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_sections_tenant_course_name UNIQUE (tenant_id, course_id, name)
);

CREATE TABLE IF NOT EXISTS section_faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT FALSE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_secfac_tenant_sec_fac UNIQUE (tenant_id, section_id, faculty_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) NOT NULL,
    enrollment_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_enrollments_tenant_sec_student UNIQUE (tenant_id, section_id, student_id),
    CONSTRAINT uq_enrollments_tenant_roll UNIQUE (tenant_id, roll_number)
);

-- ----------------------------------------------------------------------------
-- 6. EVALUATION SCHEMES & QUESTION PAPERS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_evaluation_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID UNIQUE NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    cie_weight NUMERIC(4,2) DEFAULT 0.40 NOT NULL,
    see_weight NUMERIC(4,2) DEFAULT 0.60 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS scoring_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scheme_id UUID NOT NULL REFERENCES course_evaluation_schemes(id) ON DELETE CASCADE,
    type component_type NOT NULL,
    name VARCHAR(100) NOT NULL, -- e.g. "Continuous Internal Evaluation (CIE)"
    total_marks NUMERIC(6,2) NOT NULL,
    scaled_weight NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS sub_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scoring_component_id UUID NOT NULL REFERENCES scoring_components(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- "Mid-Term Exam 1", "Lab Practical"
    code VARCHAR(50) NOT NULL,
    max_marks NUMERIC(6,2) NOT NULL,
    pass_percentage NUMERIC(5,2) DEFAULT 40.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_subcomp_tenant_score_code UNIQUE (tenant_id, scoring_component_id, code)
);

CREATE TABLE IF NOT EXISTS question_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sub_component_id UUID NOT NULL REFERENCES sub_components(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    total_marks NUMERIC(6,2) NOT NULL,
    duration_minutes INT DEFAULT 90 NOT NULL,
    instructions TEXT,
    blueprint_structure JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE NOT NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    question_paper_id UUID NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
    course_outcome_id UUID NOT NULL REFERENCES course_outcomes(id) ON DELETE RESTRICT,
    parent_question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    question_number VARCHAR(20) NOT NULL, -- 'Q1.a', 'Q1.b'
    content TEXT NOT NULL,
    max_marks NUMERIC(5,2) NOT NULL,
    blooms_level blooms_level NOT NULL,
    target_threshold_pct NUMERIC(5,2) DEFAULT 60.00 NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. ASSESSMENT WINDOWS, MARK ENTRIES & AUDIT LOGS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessment_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    sub_component_id UUID NOT NULL REFERENCES sub_components(id) ON DELETE CASCADE,
    question_paper_id UUID NOT NULL REFERENCES question_papers(id) ON DELETE CASCADE,
    status window_status DEFAULT 'DRAFT' NOT NULL,
    open_date_time TIMESTAMPTZ NOT NULL,
    close_date_time TIMESTAMPTZ NOT NULL,
    emergency_close_date TIMESTAMPTZ,
    frozen_at TIMESTAMPTZ,
    frozen_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_asmtwin_tenant_sec_subcomp UNIQUE (tenant_id, section_id, sub_component_id)
);

CREATE TABLE IF NOT EXISTS mark_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_window_id UUID NOT NULL REFERENCES assessment_windows(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status_code mark_status_code DEFAULT 'PRESENT' NOT NULL,
    marks_obtained NUMERIC(5,2),
    created_by_id UUID NOT NULL REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_marks_tenant_win_enroll_q UNIQUE (tenant_id, assessment_window_id, enrollment_id, question_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    assessment_window_id UUID REFERENCES assessment_windows(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS obe_attainment_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL,
    term_session VARCHAR(20) NOT NULL,
    target_cutoff_pct NUMERIC(5,2) NOT NULL,
    direct_weight NUMERIC(4,2) NOT NULL,
    indirect_weight NUMERIC(4,2) NOT NULL,
    co_attainment_data JSONB NOT NULL,
    po_attainment_data JSONB NOT NULL,
    raw_matrices JSONB NOT NULL,
    compliance_report JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    calculated_by VARCHAR(255) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANCY
-- ----------------------------------------------------------------------------

-- Enable Row-Level Security on all tenant-isolated tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_po_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE section_faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_evaluation_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE obe_attainment_snapshots ENABLE ROW LEVEL SECURITY;

-- Dynamic Tenant Context Helper Function
-- Session configuration parameter 'app.current_tenant_id' is set per request/connection
CREATE OR REPLACE FUNCTION current_app_tenant_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- Super Admin Bypass Flag Helper Function
CREATE OR REPLACE FUNCTION is_app_super_admin() RETURNS BOOLEAN AS $$
    SELECT COALESCE(current_setting('app.is_super_admin', true)::BOOLEAN, false);
$$ LANGUAGE sql STABLE;

-- Generic Policy Generator for Tenant Isolation
DO $$
DECLARE
    tbl text;
    tenant_tables text[] := ARRAY[
        'users', 'faculties', 'schools', 'departments', 'academic_regulations', 
        'programs', 'terms', 'program_outcomes', 'courses', 'course_outcomes', 
        'co_po_mappings', 'sections', 'section_faculties', 'enrollments', 
        'course_evaluation_schemes', 'scoring_components', 'sub_components', 
        'question_papers', 'questions', 'assessment_windows', 'mark_entries', 
        'audit_logs', 'obe_attainment_snapshots'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS %I_tenant_isolation ON %I;
            CREATE POLICY %I_tenant_isolation ON %I
                FOR ALL
                USING (
                    is_app_super_admin() OR tenant_id = current_app_tenant_id()
                )
                WITH CHECK (
                    is_app_super_admin() OR tenant_id = current_app_tenant_id()
                );
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 9. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(tenant_id, section_id);
CREATE INDEX IF NOT EXISTS idx_questions_qp ON questions(tenant_id, question_paper_id);
CREATE INDEX IF NOT EXISTS idx_questions_co ON questions(tenant_id, course_outcome_id);
CREATE INDEX IF NOT EXISTS idx_marks_window_enrollment ON mark_entries(tenant_id, assessment_window_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_marks_question ON mark_entries(tenant_id, question_id);
CREATE INDEX IF NOT EXISTS idx_asmtwin_section_status ON assessment_windows(tenant_id, section_id, status);
CREATE INDEX IF NOT EXISTS idx_copo_co ON co_po_mappings(tenant_id, course_outcome_id);
CREATE INDEX IF NOT EXISTS idx_copo_po ON co_po_mappings(tenant_id, program_outcome_id);
