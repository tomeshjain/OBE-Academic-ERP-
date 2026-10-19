import {
  AssessmentWindowRecord,
  AssessmentWindowStatus,
  MarkEntryStatusCode,
  UserRole,
} from '@/types/erp';

export interface FreezeGuardEvaluation {
  allowed: boolean;
  code:
    | 'ALLOWED'
    | 'WINDOW_EXPIRED'
    | 'WINDOW_FROZEN'
    | 'WINDOW_SUBMITTED'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'INVALID_STATE_TRANSITION'
    | 'OUT_OF_BOUNDS'
    | 'STATUS_CODE_MISMATCH';
  message: string;
}

export interface StateTransitionRequest {
  currentStatus: AssessmentWindowStatus;
  targetStatus: AssessmentWindowStatus;
  userRole: UserRole;
  reason?: string;
  emergencyDeadline?: string;
}

export class FreezeGuardEngine {
  /**
   * Evaluates if a user with a given role can create, update, or delete mark entries in this window.
   */
  public static canEditMarks(
    window: AssessmentWindowRecord,
    userRole: UserRole,
    now: Date = new Date()
  ): FreezeGuardEvaluation {
    // 1. Role verification: Students cannot edit marks
    if (userRole === 'STUDENT') {
      return {
        allowed: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Students have read-only access to academic mark entries.',
      };
    }

    // 2. Check for frozen state
    if (window.status === 'FROZEN') {
      // Even admins cannot edit marks directly in FROZEN state; they must perform an explicit UNLOCK first
      return {
        allowed: false,
        code: 'WINDOW_FROZEN',
        message:
          'Assessment window is FROZEN. Marks are permanently locked for accreditation auditing. Request administrative unlock to modify.',
      };
    }

    // 3. Check for SUBMITTED state
    if (window.status === 'SUBMITTED') {
      if (userRole === 'COURSE_FACULTY') {
        return {
          allowed: false,
          code: 'WINDOW_SUBMITTED',
          message:
            'Assessment marks have been SUBMITTED for departmental verification. Course faculty cannot alter marks pending review.',
        };
      }
    }

    // 4. Deadline verification
    if (window.status === 'UNLOCKED_BY_ADMIN') {
      // Must check emergency extension deadline
      if (window.emergencyCloseDate) {
        const emergencyDeadline = new Date(window.emergencyCloseDate);
        if (now > emergencyDeadline) {
          return {
            allowed: false,
            code: 'WINDOW_EXPIRED',
            message: `Emergency administrative override deadline expired at ${emergencyDeadline.toLocaleString()}.`,
          };
        }
      }
    } else {
      // Standard regular deadline check
      const closeDeadline = new Date(window.closeDateTime);
      if (now > closeDeadline && userRole === 'COURSE_FACULTY') {
        return {
          allowed: false,
          code: 'WINDOW_EXPIRED',
          message: `The regular submission window closed on ${closeDeadline.toLocaleString()}. Contact your HOD or Dean for an extension.`,
        };
      }
    }

    return {
      allowed: true,
      code: 'ALLOWED',
      message: 'Mark editing permitted within active assessment window.',
    };
  }

  /**
   * Validates state machine transitions based on current status and role permissions.
   */
  public static validateStateTransition(
    req: StateTransitionRequest
  ): FreezeGuardEvaluation {
    const { currentStatus, targetStatus, userRole, reason } = req;

    if (currentStatus === targetStatus) {
      return {
        allowed: true,
        code: 'ALLOWED',
        message: 'Status remains unchanged.',
      };
    }

    // 1. Faculty Submitting Marks: DRAFT -> SUBMITTED or UNLOCKED_BY_ADMIN -> SUBMITTED
    if (targetStatus === 'SUBMITTED') {
      if (currentStatus !== 'DRAFT' && currentStatus !== 'UNLOCKED_BY_ADMIN') {
        return {
          allowed: false,
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot submit assessment window from status "${currentStatus}".`,
        };
      }
      return {
        allowed: true,
        code: 'ALLOWED',
        message: 'Marks submitted successfully for departmental audit.',
      };
    }

    // 2. Freezing Marks: SUBMITTED -> FROZEN (or direct DRAFT -> FROZEN by Admin)
    if (targetStatus === 'FROZEN') {
      const allowedRoles: UserRole[] = [
        'SUPER_ADMIN',
        'TENANT_ADMIN',
        'DEAN',
        'HOD',
      ];
      if (!allowedRoles.includes(userRole)) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_PERMISSIONS',
          message:
            'Only HOD, Dean, or Institutional Administrators can freeze assessment windows.',
        };
      }
      return {
        allowed: true,
        code: 'ALLOWED',
        message: 'Assessment window frozen. OBE attainment snapshots generated.',
      };
    }

    // 3. Emergency Administrative Unlock: FROZEN -> UNLOCKED_BY_ADMIN
    if (targetStatus === 'UNLOCKED_BY_ADMIN') {
      const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'TENANT_ADMIN'];
      if (!allowedRoles.includes(userRole)) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_PERMISSIONS',
          message:
            'Only Super Admins or Tenant Admins possess the authority to unlock frozen assessment records.',
        };
      }
      if (!reason || reason.trim().length < 10) {
        return {
          allowed: false,
          code: 'INVALID_STATE_TRANSITION',
          message:
            'Accreditation audit standards require a detailed explanation (minimum 10 characters) to execute an administrative unlock.',
        };
      }
      return {
        allowed: true,
        code: 'ALLOWED',
        message: 'Assessment window temporarily unlocked with audit logging.',
      };
    }

    // 4. Revert to DRAFT: SUBMITTED -> DRAFT (e.g. HOD rejects marks for correction)
    if (targetStatus === 'DRAFT') {
      const allowedRoles: UserRole[] = [
        'SUPER_ADMIN',
        'TENANT_ADMIN',
        'DEAN',
        'HOD',
        'COURSE_COORDINATOR',
      ];
      if (!allowedRoles.includes(userRole)) {
        return {
          allowed: false,
          code: 'INSUFFICIENT_PERMISSIONS',
          message:
            'Only HODs or Course Coordinators can reject submitted marks back to DRAFT.',
        };
      }
      return {
        allowed: true,
        code: 'ALLOWED',
        message: 'Assessment window returned to DRAFT for faculty adjustments.',
      };
    }

    return {
      allowed: false,
      code: 'INVALID_STATE_TRANSITION',
      message: `Invalid transition requested from "${currentStatus}" to "${targetStatus}".`,
    };
  }

  /**
   * Validates individual question mark inputs.
   */
  public static validateMarkInput(
    marksObtained: number | null,
    maxMarks: number,
    statusCode: MarkEntryStatusCode
  ): FreezeGuardEvaluation {
    if (statusCode === 'ABSENT' || statusCode === 'EXEMPTED') {
      if (marksObtained !== null && marksObtained !== undefined) {
        return {
          allowed: false,
          code: 'STATUS_CODE_MISMATCH',
          message: `Marks obtained must be null for ${statusCode} status.`,
        };
      }
      return { allowed: true, code: 'ALLOWED', message: 'Valid non-eval status.' };
    }

    if (statusCode === 'MALPRACTICE') {
      if (marksObtained !== 0) {
        return {
          allowed: false,
          code: 'STATUS_CODE_MISMATCH',
          message: 'Marks for MALPRACTICE must be explicitly recorded as 0.',
        };
      }
      return { allowed: true, code: 'ALLOWED', message: 'Malpractice penalty recorded.' };
    }

    // PRESENT
    if (marksObtained === null || marksObtained === undefined || isNaN(marksObtained)) {
      return {
        allowed: false,
        code: 'OUT_OF_BOUNDS',
        message: 'Numeric score is required for PRESENT students.',
      };
    }

    if (marksObtained < 0) {
      return {
        allowed: false,
        code: 'OUT_OF_BOUNDS',
        message: 'Marks cannot be negative.',
      };
    }

    if (marksObtained > maxMarks) {
      return {
        allowed: false,
        code: 'OUT_OF_BOUNDS',
        message: `Entered score (${marksObtained}) exceeds the question maximum (${maxMarks}).`,
      };
    }

    return {
      allowed: true,
      code: 'ALLOWED',
      message: 'Valid mark entry.',
    };
  }
}
