// ============================================================================
// Outcome-Based Education (OBE) Attainment Types
// ============================================================================

export interface AttainmentThresholdRule {
  level: number;       // e.g. 3, 2, 1, 0
  minPercentage: number; // e.g. 70, 60, 50, 0
}

export interface QuestionAttainmentResult {
  questionId: string;
  questionNumber: string;
  courseOutcomeId: string;
  maxMarks: number;
  targetThresholdPct: number;
  thresholdScore: number;
  totalEnrolled: number;
  totalAssessed: number;      // excludes EXEMPTED and ABSENT
  totalAbsentees: number;
  totalMalpractice: number;
  totalExempted: number;
  studentsAttained: number;   // score >= thresholdScore
  attainmentPercentage: number;
}

export interface CoDirectAttainmentResult {
  courseOutcomeId: string;
  courseOutcomeCode: string;
  bloomsLevel: string;
  assessedQuestionsCount: number;
  averageStudentAttainmentPct: number;
  attainmentLevel: number;    // 0 to 3 scale
}

export interface CoIndirectAttainmentResult {
  courseOutcomeId: string;
  courseOutcomeCode: string;
  responsesCount: number;
  averageLikertScore: number; // e.g. 4.2 out of 5
  attainmentLevel: number;    // converted to 0 - 3 scale: (avg - 1) / 4 * 3
}

export interface OverallCoAttainmentResult {
  courseOutcomeId: string;
  courseOutcomeCode: string;
  statement: string;
  bloomsLevel: string;
  directScore: number;        // scale 0 to 3
  indirectScore: number;      // scale 0 to 3
  overallScore: number;       // (w_d * direct) + (w_i * indirect)
  targetLevel: number;        // typically 2.5
  isAttained: boolean;
  variance: number;           // overallScore - targetLevel
}

export interface PoAttainmentResult {
  programOutcomeId: string;
  code: string;               // PO1..PO12, PSO1..PSO3
  title: string;
  type: 'PO' | 'PSO';
  mappedCoCount: number;
  totalWeight: number;        // Sum of mapping levels
  weightedScoreSum: number;   // Sum of (CO_score * mappingLevel)
  attainedLevel: number;      // weightedScoreSum / totalWeight (0 to 3 scale)
  targetLevel: number;        // e.g. 2.5
  attainmentPercentage: number; // (attainedLevel / targetLevel) * 100
  isAttained: boolean;
}

export interface FullObeAttainmentCalculationReport {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sectionName: string;
  academicYear: string;
  evaluatedAt: string;
  configuration: {
    targetCutoffPct: number;
    directWeight: number;
    indirectWeight: number;
    thresholdRules: AttainmentThresholdRule[];
  };
  summary: {
    totalStudents: number;
    totalQuestionsEvaluated: number;
    cosAttainedCount: number;
    cosTotalCount: number;
    posAttainedCount: number;
    posTotalCount: number;
    overallDirectAverage: number;
    overallIndirectAverage: number;
    overallCourseAttainment: number;
  };
  questionAttainments: QuestionAttainmentResult[];
  coDirectAttainments: CoDirectAttainmentResult[];
  coIndirectAttainments: CoIndirectAttainmentResult[];
  overallCoAttainments: OverallCoAttainmentResult[];
  poAttainments: PoAttainmentResult[];
}
