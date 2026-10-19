import {
  CourseOutcomeItem,
  ProgramOutcomeItem,
  QuestionItem,
  StudentEnrollment,
  MarkEntryRecord,
} from '@/types/erp';
import {
  AttainmentThresholdRule,
  QuestionAttainmentResult,
  CoDirectAttainmentResult,
  CoIndirectAttainmentResult,
  OverallCoAttainmentResult,
  PoAttainmentResult,
  FullObeAttainmentCalculationReport,
} from '@/types/obe';

export interface AttainmentEngineConfig {
  targetCutoffPct: number;       // Default: 60%
  directWeight: number;          // Default: 0.80 (80%)
  indirectWeight: number;        // Default: 0.20 (20%)
  defaultTargetLevel: number;    // Default: 2.5 on a 3.0 scale
  thresholdRules?: AttainmentThresholdRule[];
}

export const DEFAULT_ATTAINMENT_RULES: AttainmentThresholdRule[] = [
  { level: 3, minPercentage: 70 }, // >= 70% students -> Level 3
  { level: 2, minPercentage: 60 }, // 60% - 69.99% -> Level 2
  { level: 1, minPercentage: 50 }, // 50% - 59.99% -> Level 1
  { level: 0, minPercentage: 0 },  // < 50% -> Level 0
];

/**
 * Robust OBE Attainment Engine adhering to ABET, NBA, and NAAC requirements.
 * Handles absentees, malpractice penalties, exemptions, and zero-division guards.
 */
export class ObeAttainmentCalculator {
  private config: Required<AttainmentEngineConfig>;

  constructor(config?: Partial<AttainmentEngineConfig>) {
    this.config = {
      targetCutoffPct: config?.targetCutoffPct ?? 60.0,
      directWeight: config?.directWeight ?? 0.80,
      indirectWeight: config?.indirectWeight ?? 0.20,
      defaultTargetLevel: config?.defaultTargetLevel ?? 2.5,
      thresholdRules: config?.thresholdRules ?? DEFAULT_ATTAINMENT_RULES,
    };
  }

  /**
   * Helper: Converts an attainment percentage to a 3-point OBE rubric scale
   */
  public convertPercentageToLevel(percentage: number): number {
    const sortedRules = [...this.config.thresholdRules].sort(
      (a, b) => b.minPercentage - a.minPercentage
    );

    for (const rule of sortedRules) {
      if (percentage >= rule.minPercentage) {
        return rule.level;
      }
    }
    return 0;
  }

  /**
   * 1. QUESTION-LEVEL ATTAINMENT
   * Evaluates how many students met or exceeded the threshold score for each question.
   */
  public calculateQuestionAttainments(
    questions: QuestionItem[],
    enrollments: StudentEnrollment[],
    markEntries: MarkEntryRecord[]
  ): QuestionAttainmentResult[] {
    const results: QuestionAttainmentResult[] = [];
    const activeEnrollments = enrollments.filter((e) => e.enrollmentStatus === 'ACTIVE');

    // Index marks by questionId -> enrollmentId
    const markMap = new Map<string, Map<string, MarkEntryRecord>>();
    for (const entry of markEntries) {
      if (!markMap.has(entry.questionId)) {
        markMap.set(entry.questionId, new Map());
      }
      markMap.get(entry.questionId)!.set(entry.enrollmentId, entry);
    }

    for (const question of questions) {
      const qCutoffPct = question.targetThresholdPct || this.config.targetCutoffPct;
      const thresholdScore = (qCutoffPct / 100) * question.maxMarks;
      const qMarks = markMap.get(question.id) || new Map<string, MarkEntryRecord>();

      let assessedCount = 0;
      let absenteesCount = 0;
      let malpracticeCount = 0;
      let exemptedCount = 0;
      let studentsAttained = 0;

      for (const student of activeEnrollments) {
        const markRecord = qMarks.get(student.id);

        if (!markRecord || markRecord.statusCode === 'ABSENT') {
          absenteesCount++;
          // ABSENT is excluded from assessed denominator in standard NBA guidelines
          continue;
        }

        if (markRecord.statusCode === 'EXEMPTED') {
          exemptedCount++;
          // Medically or administratively exempted: excluded from numerator & denominator
          continue;
        }

        if (markRecord.statusCode === 'MALPRACTICE') {
          malpracticeCount++;
          assessedCount++;
          // Score is 0, student is counted in assessed denominator (failed threshold)
          continue;
        }

        // Normal PRESENT evaluation
        assessedCount++;
        const score = markRecord.marksObtained ?? 0;
        if (score >= thresholdScore) {
          studentsAttained++;
        }
      }

      // Zero-division guard
      const attainmentPercentage =
        assessedCount > 0 ? (studentsAttained / assessedCount) * 100 : 0;

      results.push({
        questionId: question.id,
        questionNumber: question.questionNumber,
        courseOutcomeId: question.courseOutcomeId,
        maxMarks: question.maxMarks,
        targetThresholdPct: qCutoffPct,
        thresholdScore: Number(thresholdScore.toFixed(2)),
        totalEnrolled: activeEnrollments.length,
        totalAssessed: assessedCount,
        totalAbsentees: absenteesCount,
        totalMalpractice: malpracticeCount,
        totalExempted: exemptedCount,
        studentsAttained,
        attainmentPercentage: Number(attainmentPercentage.toFixed(2)),
      });
    }

    return results;
  }

  /**
   * 2. COURSE OUTCOME (CO) DIRECT ATTAINMENT
   * Aggregates question-level attainment results per Course Outcome.
   */
  public calculateCoDirectAttainment(
    courseOutcomes: CourseOutcomeItem[],
    questionAttainments: QuestionAttainmentResult[]
  ): CoDirectAttainmentResult[] {
    const results: CoDirectAttainmentResult[] = [];

    // Group question attainments by Course Outcome
    const coQuestionMap = new Map<string, QuestionAttainmentResult[]>();
    for (const qAtt of questionAttainments) {
      if (!coQuestionMap.has(qAtt.courseOutcomeId)) {
        coQuestionMap.set(qAtt.courseOutcomeId, []);
      }
      coQuestionMap.get(qAtt.courseOutcomeId)!.push(qAtt);
    }

    for (const co of courseOutcomes) {
      const qList = coQuestionMap.get(co.id) || [];
      const questionsCount = qList.length;

      let avgPct = 0;
      if (questionsCount > 0) {
        const totalPct = qList.reduce((acc, q) => acc + q.attainmentPercentage, 0);
        avgPct = totalPct / questionsCount;
      }

      const level = this.convertPercentageToLevel(avgPct);

      results.push({
        courseOutcomeId: co.id,
        courseOutcomeCode: co.code,
        bloomsLevel: co.bloomsLevel,
        assessedQuestionsCount: questionsCount,
        averageStudentAttainmentPct: Number(avgPct.toFixed(2)),
        attainmentLevel: level,
      });
    }

    return results;
  }

  /**
   * 3. COURSE OUTCOME (CO) INDIRECT ATTAINMENT
   * Aggregates student exit survey Likert ratings (scale 1 - 5) and normalizes to 0 - 3 scale.
   */
  public calculateCoIndirectAttainment(
    courseOutcomes: CourseOutcomeItem[],
    surveyResponses: Array<{ courseOutcomeId: string; likertScore: number }>
  ): CoIndirectAttainmentResult[] {
    const results: CoIndirectAttainmentResult[] = [];

    const coResponseMap = new Map<string, number[]>();
    for (const resp of surveyResponses) {
      if (!coResponseMap.has(resp.courseOutcomeId)) {
        coResponseMap.set(resp.courseOutcomeId, []);
      }
      coResponseMap.get(resp.courseOutcomeId)!.push(resp.likertScore);
    }

    for (const co of courseOutcomes) {
      const scores = coResponseMap.get(co.id) || [];
      const count = scores.length;
      let avgLikert = 0;

      if (count > 0) {
        const sum = scores.reduce((acc, val) => acc + val, 0);
        avgLikert = sum / count;
      }

      // Convert 1 - 5 Likert to 0 - 3 scale: ((avgLikert - 1) / 4) * 3
      // When avgLikert = 5 -> 3.0; when avgLikert = 1 -> 0.0
      let normalizedLevel = 0;
      if (avgLikert > 1) {
        normalizedLevel = ((avgLikert - 1) / 4) * 3;
      } else if (avgLikert === 1) {
        normalizedLevel = 0;
      }

      results.push({
        courseOutcomeId: co.id,
        courseOutcomeCode: co.code,
        responsesCount: count,
        averageLikertScore: Number(avgLikert.toFixed(2)),
        attainmentLevel: Number(normalizedLevel.toFixed(2)),
      });
    }

    return results;
  }

  /**
   * 4. OVERALL COURSE OUTCOME ATTAINMENT
   * Combines Direct and Indirect attainment: (w_d * Direct) + (w_i * Indirect)
   */
  public calculateOverallCoAttainment(
    courseOutcomes: CourseOutcomeItem[],
    directResults: CoDirectAttainmentResult[],
    indirectResults: CoIndirectAttainmentResult[],
    targetLevel = this.config.defaultTargetLevel
  ): OverallCoAttainmentResult[] {
    const directMap = new Map(directResults.map((d) => [d.courseOutcomeId, d]));
    const indirectMap = new Map(indirectResults.map((i) => [i.courseOutcomeId, i]));

    return courseOutcomes.map((co) => {
      const direct = directMap.get(co.id)?.attainmentLevel ?? 0;
      const indirect = indirectMap.get(co.id)?.attainmentLevel ?? 0;

      const overallScore =
        this.config.directWeight * direct + this.config.indirectWeight * indirect;

      const variance = overallScore - targetLevel;
      const isAttained = overallScore >= targetLevel;

      return {
        courseOutcomeId: co.id,
        courseOutcomeCode: co.code,
        statement: co.statement,
        bloomsLevel: co.bloomsLevel,
        directScore: Number(direct.toFixed(2)),
        indirectScore: Number(indirect.toFixed(2)),
        overallScore: Number(overallScore.toFixed(2)),
        targetLevel,
        isAttained,
        variance: Number(variance.toFixed(2)),
      };
    });
  }

  /**
   * 5. PROGRAM OUTCOME (PO) & PROGRAM SPECIFIC OUTCOME (PSO) ATTAINMENT MATRIX
   * Translates CO attainments into PO/PSO attainments via the Articulation Matrix:
   *
   * PO_j = (Sum_{i} (CO_i * MappingLevel_{i, j})) / (Sum_{i} MappingLevel_{i, j})
   */
  public calculatePoAttainment(
    programOutcomes: ProgramOutcomeItem[],
    overallCoResults: OverallCoAttainmentResult[],
    coPoMappings: Array<{
      courseOutcomeId: string;
      programOutcomeId: string;
      mappingLevel: number;
    }>
  ): PoAttainmentResult[] {
    const coScoreMap = new Map(overallCoResults.map((c) => [c.courseOutcomeId, c.overallScore]));

    // Group mappings by Program Outcome ID
    const poMappingMap = new Map<
      string,
      Array<{ courseOutcomeId: string; mappingLevel: number }>
    >();

    for (const mapping of coPoMappings) {
      if (mapping.mappingLevel <= 0) continue; // Ignore 0/unmapped entries
      if (!poMappingMap.has(mapping.programOutcomeId)) {
        poMappingMap.set(mapping.programOutcomeId, []);
      }
      poMappingMap.get(mapping.programOutcomeId)!.push({
        courseOutcomeId: mapping.courseOutcomeId,
        mappingLevel: mapping.mappingLevel,
      });
    }

    return programOutcomes.map((po) => {
      const mappings = poMappingMap.get(po.id) || [];
      const mappedCoCount = mappings.length;

      let totalWeight = 0;
      let weightedScoreSum = 0;

      for (const m of mappings) {
        const coScore = coScoreMap.get(m.courseOutcomeId) ?? 0;
        weightedScoreSum += coScore * m.mappingLevel;
        totalWeight += m.mappingLevel;
      }

      // Zero-division guard: unmapped POs have totalWeight = 0
      const attainedLevel = totalWeight > 0 ? weightedScoreSum / totalWeight : 0;
      const targetLevel = po.targetLevel || this.config.defaultTargetLevel;
      const attainmentPercentage =
        targetLevel > 0 ? (attainedLevel / targetLevel) * 100 : 0;

      return {
        programOutcomeId: po.id,
        code: po.code,
        title: po.title,
        type: po.type,
        mappedCoCount,
        totalWeight,
        weightedScoreSum: Number(weightedScoreSum.toFixed(2)),
        attainedLevel: Number(attainedLevel.toFixed(2)),
        targetLevel,
        attainmentPercentage: Number(attainmentPercentage.toFixed(2)),
        isAttained: attainedLevel >= targetLevel && totalWeight > 0,
      };
    });
  }

  /**
   * 6. FULL OBE AUDIT & ACCREDITATION REPORT
   * Executes the entire attainment pipeline and produces an ABET/NBA compliant summary.
   */
  public generateFullReport(params: {
    courseId: string;
    courseCode: string;
    courseTitle: string;
    sectionName: string;
    academicYear: string;
    courseOutcomes: CourseOutcomeItem[];
    programOutcomes: ProgramOutcomeItem[];
    questions: QuestionItem[];
    enrollments: StudentEnrollment[];
    markEntries: MarkEntryRecord[];
    coPoMappings: Array<{
      courseOutcomeId: string;
      programOutcomeId: string;
      mappingLevel: number;
    }>;
    surveyResponses: Array<{ courseOutcomeId: string; likertScore: number }>;
  }): FullObeAttainmentCalculationReport {
    const questionAttainments = this.calculateQuestionAttainments(
      params.questions,
      params.enrollments,
      params.markEntries
    );

    const coDirectAttainments = this.calculateCoDirectAttainment(
      params.courseOutcomes,
      questionAttainments
    );

    const coIndirectAttainments = this.calculateCoIndirectAttainment(
      params.courseOutcomes,
      params.surveyResponses
    );

    const overallCoAttainments = this.calculateOverallCoAttainment(
      params.courseOutcomes,
      coDirectAttainments,
      coIndirectAttainments
    );

    const poAttainments = this.calculatePoAttainment(
      params.programOutcomes,
      overallCoAttainments,
      params.coPoMappings
    );

    const cosAttainedCount = overallCoAttainments.filter((c) => c.isAttained).length;
    const posAttainedCount = poAttainments.filter((p) => p.isAttained).length;

    const overallDirectAvg =
      coDirectAttainments.length > 0
        ? coDirectAttainments.reduce((acc, c) => acc + c.attainmentLevel, 0) /
          coDirectAttainments.length
        : 0;

    const overallIndirectAvg =
      coIndirectAttainments.length > 0
        ? coIndirectAttainments.reduce((acc, c) => acc + c.attainmentLevel, 0) /
          coIndirectAttainments.length
        : 0;

    const overallCourseAttainment =
      overallCoAttainments.length > 0
        ? overallCoAttainments.reduce((acc, c) => acc + c.overallScore, 0) /
          overallCoAttainments.length
        : 0;

    return {
      courseId: params.courseId,
      courseCode: params.courseCode,
      courseTitle: params.courseTitle,
      sectionName: params.sectionName,
      academicYear: params.academicYear,
      evaluatedAt: new Date().toISOString(),
      configuration: {
        targetCutoffPct: this.config.targetCutoffPct,
        directWeight: this.config.directWeight,
        indirectWeight: this.config.indirectWeight,
        thresholdRules: this.config.thresholdRules,
      },
      summary: {
        totalStudents: params.enrollments.filter((e) => e.enrollmentStatus === 'ACTIVE').length,
        totalQuestionsEvaluated: params.questions.length,
        cosAttainedCount,
        cosTotalCount: params.courseOutcomes.length,
        posAttainedCount,
        posTotalCount: params.programOutcomes.length,
        overallDirectAverage: Number(overallDirectAvg.toFixed(2)),
        overallIndirectAverage: Number(overallIndirectAvg.toFixed(2)),
        overallCourseAttainment: Number(overallCourseAttainment.toFixed(2)),
      },
      questionAttainments,
      coDirectAttainments,
      coIndirectAttainments,
      overallCoAttainments,
      poAttainments,
    };
  }
}
