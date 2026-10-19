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
        'regulations',
        'programs-outcomes',
        'terms',
        'courses',
        'scoring-components',
        'assessment-papers',
        'mark-entry',
        'co-reports',
      ];
    case 'HEAD_OF_FACULTY':
      return [
        'org-structure',
        'programs-outcomes',
        'terms',
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

  // Primary Entities Led by this User
  ledFaculty: AcademicFaculty | null;
  ledSchool: AcademicSchool | null;
  ledDepartment: AcademicDepartment | null;
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
  canViewReportsForSection: (sectionId?: string | null) => boolean;

  // User Management & Approval Permissions
  canCreateUser: boolean;
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
      ledSchool: null,
      ledDepartment: null,
      coordinatedCourses: [],
      mappedSections: [],
      visibleFaculties: [],
      visibleSchools: [],
      visibleDepartments: [],
      visiblePrograms: [],
      visibleCourses: [],
      visibleSections: [],
      canCreateFaculty: false,
      canCreateSchool: false,
      canCreateDepartment: false,
      canCreateProgram: false,
      canCreateCourse: false,
      canManageCourse: () => false,
      canEditMarksForSection: () => false,
      canUnlockOrExtendDeadline: false,
      canViewReportsForSection: () => false,
      canCreateUser: false,
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

  // 1. Determine specifically led entities
  const ledFaculty =
    allFaculties.find((f) => f.headUserId === userId || f.headUserName?.toLowerCase().trim() === userName) ||
    (isHeadOfFaculty ? allFaculties[0] || null : null);

  const ledSchool =
    allSchools.find((s) => s.headUserId === userId || s.headUserName?.toLowerCase().trim() === userName) ||
    (isHeadOfSchool ? allSchools[0] || null : null);

  const ledDepartment =
    allDepartments.find((d) => d.headUserId === userId || d.headUserName?.toLowerCase().trim() === userName) ||
    (isHod ? allDepartments[0] || null : null);

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
  } else if (isHeadOfFaculty && ledFaculty) {
    // Head of Faculty: Everything connected and present under his Faculty
    visibleFaculties = allFaculties.filter((f) => f.id === ledFaculty.id);
    visibleSchools = allSchools.filter((s) => s.facultyId === ledFaculty.id);
    const schoolIds = new Set(visibleSchools.map((s) => s.id));
    visibleDepartments = allDepartments.filter((d) => schoolIds.has(d.schoolId));
    const deptIds = new Set(visibleDepartments.map((d) => d.id));
    visiblePrograms = allPrograms.filter((p) => deptIds.has(p.departmentId));
    const progIds = new Set(visiblePrograms.map((p) => p.id));
    visibleCourses = allCourses.filter((c) => !c.programId || progIds.has(c.programId));
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
  } else if (isHeadOfSchool && ledSchool) {
    // Head of School: Everything connected and present under his School
    visibleFaculties = allFaculties.filter((f) => f.id === ledSchool.facultyId);
    visibleSchools = allSchools.filter((s) => s.id === ledSchool.id);
    visibleDepartments = allDepartments.filter((d) => d.schoolId === ledSchool.id);
    const deptIds = new Set(visibleDepartments.map((d) => d.id));
    visiblePrograms = allPrograms.filter((p) => deptIds.has(p.departmentId));
    const progIds = new Set(visiblePrograms.map((p) => p.id));
    visibleCourses = allCourses.filter((c) => !c.programId || progIds.has(c.programId));
    const courseIds = new Set(visibleCourses.map((c) => c.id));
    visibleSections = allSections.filter((sec) => courseIds.has(sec.courseId));
  } else if (isHod && ledDepartment) {
    // Head of Department: Everything connected and present under his Department
    const parentSchool = allSchools.find((s) => s.id === ledDepartment.schoolId);
    visibleFaculties = allFaculties.filter((f) => f.id === parentSchool?.facultyId);
    visibleSchools = allSchools.filter((s) => s.id === ledDepartment.schoolId);
    visibleDepartments = allDepartments.filter((d) => d.id === ledDepartment.id);
    visiblePrograms = allPrograms.filter((p) => p.departmentId === ledDepartment.id);
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
  // "A Head of Faculty cannot create a New Faculty. He will be able to create schools in the Faculty for which he is the head."
  const canCreateFaculty = isAdmin;
  const canCreateSchool = isAdmin || isHeadOfFaculty;
  const canCreateDepartment = isAdmin || isHeadOfFaculty || isHeadOfSchool;
  const canCreateProgram = isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod;
  const canCreateCourse = isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod;

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

  const canUnlockOrExtendDeadline = isAdmin || isHod;

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
    ledSchool,
    ledDepartment,
    coordinatedCourses,
    mappedSections,
    visibleFaculties,
    visibleSchools,
    visibleDepartments,
    visiblePrograms,
    visibleCourses,
    visibleSections,
    canCreateFaculty,
    canCreateSchool,
    canCreateDepartment,
    canCreateProgram,
    canCreateCourse,
    canManageCourse,
    canEditMarksForSection,
    canUnlockOrExtendDeadline,
    canViewReportsForSection,
    canCreateUser: isAdmin || isHeadOfFaculty || isHeadOfSchool || isHod,
    canApproveUser: isAdmin,
    assignableRoles: getAssignableRoles(currentUser.role),
    allowedMenuItems: getVisibleMenuItemsForRole(currentUser.role),
  };
}
