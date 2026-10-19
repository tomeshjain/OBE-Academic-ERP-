import {
  UserAccount,
  UserRole,
  MenuItemId,
  AcademicFaculty,
  AcademicSchool,
  AcademicDepartment,
  AcademicProgram,
  CourseRecord,
  CourseSection,
} from '@/types/erp';

export const ROLE_HIERARCHY_LEVEL: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  TENANT_ADMIN: 90,
  DEAN: 80,
  HEAD_OF_FACULTY: 80,
  HEAD_OF_SCHOOL: 70,
  HOD: 60,
  COURSE_COORDINATOR: 50,
  COURSE_FACULTY: 40,
  STUDENT: 10,
};

/**
 * Returns the exact roles a user can assign when creating new accounts.
 * HoF/HoS/HoD can only select roles strictly below their own role.
 */
export function getAssignableRoles(creatorRole?: UserRole | null): UserRole[] {
  if (!creatorRole) return [];
  if (creatorRole === 'SUPER_ADMIN' || creatorRole === 'TENANT_ADMIN') {
    return [
      'HEAD_OF_FACULTY',
      'HEAD_OF_SCHOOL',
      'HOD',
      'COURSE_COORDINATOR',
      'COURSE_FACULTY',
      'STUDENT',
    ];
  }
  if (creatorRole === 'HEAD_OF_FACULTY' || creatorRole === 'DEAN') {
    return [
      'HEAD_OF_SCHOOL',
      'HOD',
      'COURSE_COORDINATOR',
      'COURSE_FACULTY',
      'STUDENT',
    ];
  }
  if (creatorRole === 'HEAD_OF_SCHOOL') {
    return [
      'HOD',
      'COURSE_COORDINATOR',
      'COURSE_FACULTY',
      'STUDENT',
    ];
  }
  if (creatorRole === 'HOD') {
    return [
      'COURSE_COORDINATOR',
      'COURSE_FACULTY',
      'STUDENT',
    ];
  }
  return [];
}

/**
 * Determines whether the creator requires Admin approval for accounts they create.
 */
export function requiresAdminApproval(creatorRole?: UserRole | null): boolean {
  if (!creatorRole) return true;
  return creatorRole !== 'TENANT_ADMIN' && creatorRole !== 'SUPER_ADMIN';
}

/**
 * Determines whether the user has administrator approval authority.
 */
export function canApproveUserAccount(currentUser?: UserAccount | null): boolean {
  if (!currentUser) return false;
  return currentUser.role === 'TENANT_ADMIN' || currentUser.role === 'SUPER_ADMIN';
}

/**
 * Filters the 9 Menu Items based on academic role hierarchy to ensure a clean, uncluttered interface.
 */
export function getVisibleMenuItemsForRole(role?: UserRole | null): MenuItemId[] {
  if (!role) return ['courses', 'mark-entry', 'co-reports'];

  switch (role) {
    case 'SUPER_ADMIN':
    case 'TENANT_ADMIN':
      return [
        'org-structure',
        'programs-outcomes',
        'courses',
        'scoring-components',
        'assessment-papers',
        'mark-entry',
        'co-reports',
        'db-manager',
      ];
    case 'HEAD_OF_FACULTY':
      return [
        'org-structure',
        'programs-outcomes',
        'courses',
        'scoring-components',
        'assessment-papers',
        'mark-entry',
        'co-reports',
      ];
    case 'HEAD_OF_SCHOOL':
    case 'HOD':
      return [
        'org-structure',
        'programs-outcomes',
        'courses',
        'scoring-components',
        'assessment-papers',
        'mark-entry',
        'co-reports',
      ];
    case 'COURSE_COORDINATOR':
      return [
        'courses',
        'scoring-components',
        'assessment-papers',
        'mark-entry',
        'co-reports',
      ];
    case 'COURSE_FACULTY':
      return [
        'courses',
        'assessment-papers',
        'mark-entry',
        'co-reports',
      ];
    case 'STUDENT':
      return [
        'mark-entry',
        'co-reports',
      ];
    default:
      return ['courses', 'mark-entry', 'co-reports'];
  }
}

export interface AcademicRoleScope {
  // Role checks
  isAdmin: boolean;
  isHeadOfFaculty: boolean;
  isHeadOfSchool: boolean;
  isHod: boolean;
  isCoordinator: boolean;
  isFaculty: boolean;
  isStudent: boolean;

  // Primary Entities Led by this User (Supports multiple entity leadership, e.g. heading 2+ faculties)
  ledFaculty: AcademicFaculty | null;
  ledFaculties: AcademicFaculty[];
  ledSchool: AcademicSchool | null;
  ledSchools: AcademicSchool[];
  ledDepartment: AcademicDepartment | null;
  ledDepartments: AcademicDepartment[];
  coordinatedCourses: CourseRecord[];
  mappedSections: CourseSection[];

  // Visible Scoped Entities
  visibleFaculties: AcademicFaculty[];
  visibleSchools: AcademicSchool[];
  visibleDepartments: AcademicDepartment[];
  visiblePrograms: AcademicProgram[];
  visibleCourses: CourseRecord[];
  visibleSections: CourseSection[];

  // Action Permissions
  canCreateFaculty: boolean;
  canCreateSchool: boolean;
  canCreateDepartment: boolean;
  canCreateProgram: boolean;
  canCreateCourse: boolean;
  canManageCourse: (courseId?: string | null) => boolean;
  canEditMarksForSection: (sectionId?: string | null, isWindowLocked?: boolean) => boolean;
  canUnlockOrExtendDeadline: boolean;
  canRequestDeadlineExtension: boolean;
  canApproveDeadlineExtension: boolean;
  canViewReportsForSection: (sectionId?: string | null) => boolean;

  // Specific Entity Governance Capabilities
  canEditFaculty: boolean;
  canDeleteFaculty: boolean;
  canAssignFacultyHead: boolean;

  canEditSchool: boolean;
  canDeleteSchool: boolean;
  canAssignSchoolHead: boolean;

  canEditDepartment: boolean;
  canDeleteDepartment: boolean;
  canAssignDepartmentHead: boolean;

  canDeleteProgram: boolean;
  canDeleteCourse: boolean;

  // User Management & Security Permissions
  canCreateUser: boolean;
  canDeleteUser: boolean;
  canEditUserRole: boolean;
  canManageEmailGateway: boolean;
  canApproveUser: boolean;
  assignableRoles: UserRole[];
  allowedMenuItems: MenuItemId[];
}

/**
 * Computes the exact academic scope, entity filters, and authorization capabilities for the active user.
 */
export function computeAcademicScope(
  currentUser: UserAccount | null,
  allFaculties: AcademicFaculty[],
  allSchools: AcademicSchool[],
  allDepartments: AcademicDepartment[],
  allPrograms: AcademicProgram[],
  allCourses: CourseRecord[],
  allSections: CourseSection[]
): AcademicRoleScope {
  if (!currentUser) {
    return {
      isAdmin: false,
      isHeadOfFaculty: false,
      isHeadOfSchool: false,
      isHod: false,
      isCoordinator: false,
      isFaculty: false,
      isStudent: false,
      ledFaculty: null,
      ledFaculties: [],
      ledSchool: null,
      ledSchools: [],
      ledDepartment: null,
      ledDepartments: [],
      coordinatedCourses: [],
      mappedSections: [],
      visibleFaculties: [],
      visibleSchools: [],
      visibleDepartments: [],
      visiblePrograms: [],
      visibleCourses: [],
      visibleSections: [],
      canCreateFaculty: false,
      canEditFaculty: false,
      canDeleteFaculty: false,
      canAssignFacultyHead: false,
      canCreateSchool: false,
      canEditSchool: false,
      canDeleteSchool: false,
      canAssignSchoolHead: false,
      canCreateDepartment: false,
      canEditDepartment: false,
      canDeleteDepartment: false,
      canAssignDepartmentHead: false,
      canCreateProgram: false,
      canDeleteProgram: false,
      canCreateCourse: false,
      canDeleteCourse: false,
      canManageCourse: () => false,
      canEditMarksForSection: () => false,
      canUnlockOrExtendDeadline: false,
      canRequestDeadlineExtension: false,
      canApproveDeadlineExtension: false,
      canViewReportsForSection: () => false,
      canCreateUser: false,
      canDeleteUser: false,
      canEditUserRole: false,
      canManageEmailGateway: false,
      canApproveUser: false,
      assignableRoles: [],
      allowedMenuItems: ['courses', 'mark-entry', 'co-reports'],
    };
  }

  const role = currentUser.role;
  const userId = currentUser.id;
  const userName = currentUser.fullName.toLowerCase().trim();

  const isAdmin = role === 'TENANT_ADMIN';
  const isHeadOfFaculty = role === 'HEAD_OF_FACULTY';
  const isHeadOfSchool = role === 'HEAD_OF_SCHOOL';
  const isHod = role === 'HOD';
  const isCoordinator = role === 'COURSE_COORDINATOR';
  const isFaculty = role === 'COURSE_FACULTY';
  const isStudent = role === 'STUDENT';

  // 1. Determine specifically led entities (Supports multi-entity governance, e.g. heading 2+ faculties)
  const ledFaculties = allFaculties.filter(
    (f) => f.headUserId === userId || (f.headUserName && f.headUserName.toLowerCase().trim() === userName)
  );
  if (ledFaculties.length === 0 && isHeadOfFaculty && allFaculties.length > 0) {
    ledFaculties.push(allFaculties[0]);
  }
  const ledFaculty = ledFaculties[0] || null;

  const ledSchools = allSchools.filter(
    (s) => s.headUserId === userId || (s.headUserName && s.headUserName.toLowerCase().trim() === userName)
  );
  if (ledSchools.length === 0 && isHeadOfSchool && allSchools.length > 0) {
    ledSchools.push(allSchools[0]);
  }
  const ledSchool = ledSchools[0] || null;

  const ledDepartments = allDepartments.filter(
    (d) => d.headUserId === userId || (d.headUserName && d.headUserName.toLowerCase().trim() === userName)
  );
  if (ledDepartments.length === 0 && isHod && allDepartments.length > 0) {
    ledDepartments.push(allDepartments[0]);
  }
  const ledDepartment = ledDepartments[0] || null;

  const coordinatedCourses = allCourses.filter(
    (c) =>
      c.coordinatorId === userId ||
      c.coordinator?.toLowerCase().trim() === userName ||
      (isCoordinator && allCourses.length > 0 && !c.coordinatorId)
  );

  const mappedSections = allSections.filter(
    (s) =>
      s.facultyId === userId ||
      s.facultyName?.toLowerCase().trim() === userName ||
      (isFaculty && allSections.length > 0 && !s.facultyId)
  );

  // 2. Scoped Visibility
  let visibleFaculties: AcademicFaculty[] = allFaculties;
  let visibleSchools: AcademicSchool[] = allSchools;
  let visibleDepartments: AcademicDepartment[] = allDepartments;
  let visiblePrograms: AcademicProgram[] = allPrograms;
  let visibleCourses: CourseRecord[] = allCourses;
  let visibleSections: CourseSection[] = allSections;

  if (isAdmin) {
    // Admin has global visibility across all entities
    visibleFaculties = allFaculties;
    visibleSchools = allSchools;
    visibleDepartments = allDepartments;
    visiblePrograms = allPrograms;
    visibleCourses = allCourses;
    visibleSections = allSections;
  } else if (isHeadOfFaculty && ledFaculties.length > 0) {
    // Head of Faculty: Everything connected and present under ANY of their governed Faculties
    const ledFacultyIds = new Set(ledFaculties.map((f) => f.id));
    visibleFaculties = allFaculties.filter((f) => ledFacultyIds.has(f.id));
    visibleSchools = allSchools.filter((s) => s.facultyId && ledFacultyIds.has(s.facultyId));
    const schoolIds = new Set(visibleSchools.map((s) => s.id));
    visibleDepartments = allDepartments.filter((d) => schoolIds.has(d.schoolId));
    const deptIds = new Set(visibleDepartments.map((d) => d.id));
    visiblePrograms = allPrograms.filter((p) => deptIds.has(p.departmentId));
    const progIds = new Set(visiblePrograms.map((p) => p.id));
    visibleCourses = allCourses.filter((c) => !c.programId || progIds.has(c.programId));
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
  } else if (isHeadOfSchool && ledSchools.length > 0) {
    // Head of School: Everything connected and present under ANY of their governed Schools
    const ledSchoolIds = new Set(ledSchools.map((s) => s.id));
    const parentFacultyIds = new Set(ledSchools.map((s) => s.facultyId).filter(Boolean));
    visibleFaculties = allFaculties.filter((f) => parentFacultyIds.has(f.id));
    visibleSchools = allSchools.filter((s) => ledSchoolIds.has(s.id));
    visibleDepartments = allDepartments.filter((d) => ledSchoolIds.has(d.schoolId));
    const deptIds = new Set(visibleDepartments.map((d) => d.id));
    visiblePrograms = allPrograms.filter((p) => deptIds.has(p.departmentId));
    const progIds = new Set(visiblePrograms.map((p) => p.id));
    visibleCourses = allCourses.filter((c) => !c.programId || progIds.has(c.programId));
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
  } else if (isHod && ledDepartments.length > 0) {
    // Head of Department: Everything connected and present under ANY of their governed Departments
    const ledDeptIds = new Set(ledDepartments.map((d) => d.id));
    const parentSchoolIds = new Set(ledDepartments.map((d) => d.schoolId).filter(Boolean));
    const parentSchools = allSchools.filter((s) => parentSchoolIds.has(s.id));
    const parentFacultyIds = new Set(parentSchools.map((s) => s.facultyId).filter(Boolean));

    visibleFaculties = allFaculties.filter((f) => parentFacultyIds.has(f.id));
    visibleSchools = allSchools.filter((s) => parentSchoolIds.has(s.id));
    visibleDepartments = allDepartments.filter((d) => ledDeptIds.has(d.id));
    visiblePrograms = allPrograms.filter((p) => ledDeptIds.has(p.departmentId));
    const progIds = new Set(visiblePrograms.map((p) => p.id));
    visibleCourses = allCourses.filter((c) => !c.programId || progIds.has(c.programId));
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
  } else if (isCoordinator) {
    // Course Coordinator: Everything related to his coordinated Course(s)
    visibleCourses = coordinatedCourses.length > 0 ? coordinatedCourses : allCourses;
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
    const progIds = new Set(visibleCourses.map((c) => c.programId).filter(Boolean));
    visiblePrograms = allPrograms.filter((p) => progIds.has(p.id));
    const deptIds = new Set(visiblePrograms.map((p) => p.departmentId));
    visibleDepartments = allDepartments.filter((d) => deptIds.has(d.id));
    const schoolIds = new Set(visibleDepartments.map((d) => d.schoolId));
    visibleSchools = allSchools.filter((s) => schoolIds.has(s.id));
    visibleFaculties = allFaculties;
  } else if (isFaculty) {
    // Section Faculty: Strictly mapped to his section
    visibleSections = mappedSections.length > 0 ? mappedSections : allSections;
    const courseIds = new Set(visibleSections.map((s) => s.courseId));
    visibleCourses = allCourses.filter((c) => courseIds.has(c.id));
    const progIds = new Set(visibleCourses.map((c) => c.programId).filter(Boolean));
    visiblePrograms = allPrograms.filter((p) => progIds.has(p.id));
    const deptIds = new Set(visiblePrograms.map((p) => p.departmentId));
    visibleDepartments = allDepartments.filter((d) => deptIds.has(d.id));
    const schoolIds = new Set(visibleDepartments.map((d) => d.schoolId));
    visibleSchools = allSchools.filter((s) => schoolIds.has(s.id));
    visibleFaculties = allFaculties;
  }

  // 3. Action Capabilities
  const canCreateFaculty = isAdmin;
  const canEditFaculty = isAdmin;
  const canDeleteFaculty = isAdmin;
  const canAssignFacultyHead = isAdmin;

  const canCreateSchool = isAdmin || isHeadOfFaculty;
  const canEditSchool = isAdmin || isHeadOfFaculty;
  const canDeleteSchool = isAdmin || isHeadOfFaculty;
  const canAssignSchoolHead = isAdmin || isHeadOfFaculty;

  const canCreateDepartment = isAdmin || isHeadOfFaculty || isHeadOfSchool;
  const canEditDepartment = isAdmin || isHeadOfFaculty || isHeadOfSchool;
  const canDeleteDepartment = isAdmin || isHeadOfFaculty || isHeadOfSchool;
  const canAssignDepartmentHead = isAdmin || isHeadOfFaculty || isHeadOfSchool;

  const canCreateProgram = isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod;
  const canDeleteProgram = isAdmin || isHeadOfFaculty || isHeadOfSchool;

  const canCreateCourse = isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod;
  const canDeleteCourse = isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod;

  const canDeleteUser = isAdmin;
  const canEditUserRole = isAdmin;
  const canManageEmailGateway = isAdmin;

  // "The Faculty who is a course coordinator for a course can be everything related to the Course."
  const canManageCourse = (targetCourseId?: string | null): boolean => {
    if (isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod) return true;
    if (isCoordinator) {
      if (!targetCourseId) return true;
      return coordinatedCourses.some((c) => c.id === targetCourseId);
    }
    return false;
  };

  // "A faculty who is just mapped to a section of the course can just enter the scores within the timelines"
  const canEditMarksForSection = (targetSectionId?: string | null, isWindowLocked = false): boolean => {
    if (isAdmin || isHod) return true; // Admins and HODs have emergency mark entry & unlock capabilities
    if (isCoordinator) {
      // Coordinator can oversee/enter if window is open
      return !isWindowLocked;
    }
    if (isFaculty) {
      // Section faculty can ONLY enter scores within open timelines AND only for his mapped section!
      if (isWindowLocked) return false;
      if (!targetSectionId) return mappedSections.length > 0;
      return mappedSections.some((s) => s.id === targetSectionId);
    }
    return false;
  };

  const canUnlockOrExtendDeadline = isAdmin || isHod || isCoordinator;
  const canRequestDeadlineExtension = isFaculty || isCoordinator;
  const canApproveDeadlineExtension = isCoordinator || isHod || isHeadOfSchool || isHeadOfFaculty || isAdmin;

  // "and can only see the outcome reports of his section which is mapped to him."
  const canViewReportsForSection = (targetSectionId?: string | null): boolean => {
    if (isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod || isCoordinator) return true;
    if (isFaculty) {
      if (!targetSectionId) return true;
      return mappedSections.some((s) => s.id === targetSectionId);
    }
    return false;
  };

  return {
    isAdmin,
    isHeadOfFaculty,
    isHeadOfSchool,
    isHod,
    isCoordinator,
    isFaculty,
    isStudent,
    ledFaculty,
    ledFaculties,
    ledSchool,
    ledSchools,
    ledDepartment,
    ledDepartments,
    coordinatedCourses,
    mappedSections,
    visibleFaculties,
    visibleSchools,
    visibleDepartments,
    visiblePrograms,
    visibleCourses,
    visibleSections,
    canCreateFaculty,
    canEditFaculty,
    canDeleteFaculty,
    canAssignFacultyHead,
    canCreateSchool,
    canEditSchool,
    canDeleteSchool,
    canAssignSchoolHead,
    canCreateDepartment,
    canEditDepartment,
    canDeleteDepartment,
    canAssignDepartmentHead,
    canCreateProgram,
    canDeleteProgram,
    canCreateCourse,
    canDeleteCourse,
    canManageCourse,
    canEditMarksForSection,
    canUnlockOrExtendDeadline,
    canRequestDeadlineExtension,
    canApproveDeadlineExtension,
    canViewReportsForSection,
    canCreateUser: isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod,
    canDeleteUser,
    canEditUserRole,
    canManageEmailGateway,
    canApproveUser: isAdmin,
    assignableRoles: getAssignableRoles(currentUser.role),
    allowedMenuItems: getVisibleMenuItemsForRole(currentUser.role),
  };
}
