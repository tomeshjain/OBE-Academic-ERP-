import * as XLSX from 'xlsx';
import {
  StudentEnrollment,
  QuestionItem,
  MarkEntryRecord,
  UserAccount,
  UserRole,
  MarkEntryStatusCode,
  CourseOutcomeItem,
  BloomsTaxonomyLevel,
} from '@/types/erp';

// ============================================================================
// 1. STUDENT ROSTER EXCEL UTILITIES
// ============================================================================

export function downloadStudentRosterTemplate() {
  const sampleData = [
    {
      RollNumber: '2026-CSE-001',
      StudentName: 'Aarav Sharma',
      Email: 'aarav.sharma@university.edu',
      Status: 'ACTIVE',
    },
    {
      RollNumber: '2026-CSE-002',
      StudentName: 'Ananya Deshmukh',
      Email: 'ananya.d@university.edu',
      Status: 'ACTIVE',
    },
    {
      RollNumber: '2026-CSE-003',
      StudentName: 'Dhruv Verma',
      Email: 'dhruv.v@university.edu',
      Status: 'ACTIVE',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student Roster');
  XLSX.writeFile(wb, 'student_roster_template.xlsx');
}

export function exportStudentsToExcel(students: StudentEnrollment[]) {
  const data = students.map((s, idx) => ({
    'Sl. No': idx + 1,
    'Roll Number': s.rollNumber,
    'Student Name': s.studentName,
    'Enrollment Status': s.enrollmentStatus,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Enrolled Students');
  XLSX.writeFile(wb, `student_roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseStudentsFromExcel(
  file: File
): Promise<Array<{ rollNumber: string; studentName: string }>> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const results: Array<{ rollNumber: string; studentName: string }> = [];

  rows.forEach((row) => {
    // Check multiple case variants: RollNumber, rollNumber, Roll Number, roll_number, etc.
    const roll =
      row['RollNumber'] ||
      row['Roll Number'] ||
      row['rollNumber'] ||
      row['roll_number'] ||
      row['RollNo'] ||
      row['ID'];
    const name =
      row['StudentName'] ||
      row['Student Name'] ||
      row['studentName'] ||
      row['Name'] ||
      row['FullName'];

    if (roll && name) {
      results.push({
        rollNumber: String(roll).trim(),
        studentName: String(name).trim(),
      });
    }
  });

  return results;
}

// ============================================================================
// 2. MARK ENTRY MATRIX EXCEL UTILITIES
// ============================================================================

export function downloadMarkEntryTemplate(
  students: StudentEnrollment[],
  questions: QuestionItem[],
  assessmentName: string = 'Assessment Marks'
) {
  // If no students yet, provide 3 dummy rows as an example
  const targetStudents =
    students.length > 0
      ? students
      : [
          { rollNumber: '2026-CSE-001', studentName: 'Aarav Sharma' },
          { rollNumber: '2026-CSE-002', studentName: 'Ananya Deshmukh' },
        ];

  const rows = targetStudents.map((s) => {
    const rowObj: Record<string, string | number> = {
      'Roll Number': s.rollNumber,
      'Student Name': s.studentName,
    };
    questions.forEach((q) => {
      rowObj[`${q.questionNumber} (Max ${q.maxMarks})`] = '';
    });
    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mark Sheet');
  XLSX.writeFile(
    wb,
    `${assessmentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_template.xlsx`
  );
}

export function exportCompletedMarksToExcel(
  students: StudentEnrollment[],
  questions: QuestionItem[],
  marks: MarkEntryRecord[],
  assessmentName: string = 'Assessment Marks'
) {
  const markMap = new Map<string, MarkEntryRecord>();
  marks.forEach((m) => {
    markMap.set(`${m.enrollmentId}_${m.questionId}`, m);
  });

  const totalMaxMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0);

  const rows = students.map((s, idx) => {
    const rowObj: Record<string, string | number> = {
      'Sl. No': idx + 1,
      'Roll Number': s.rollNumber,
      'Student Name': s.studentName,
    };

    let totalScore = 0;
    let isAbsent = false;
    let isMalpractice = false;

    questions.forEach((q) => {
      const entry = markMap.get(`${s.id}_${q.id}`);
      const key = `${q.questionNumber} [Max: ${q.maxMarks}]`;

      if (!entry || entry.statusCode === 'ABSENT') {
        rowObj[key] = 'ABSENT';
        isAbsent = true;
      } else if (entry.statusCode === 'MALPRACTICE') {
        rowObj[key] = 'MALPRACTICE (0)';
        isMalpractice = true;
      } else if (entry.statusCode === 'EXEMPTED') {
        rowObj[key] = 'EXEMPTED';
      } else {
        const val = entry.marksObtained ?? 0;
        rowObj[key] = val;
        totalScore += val;
      }
    });

    rowObj[`Total Score (${totalMaxMarks}M)`] = isMalpractice
      ? 0
      : isAbsent && totalScore === 0
      ? 'ABSENT'
      : totalScore;
    rowObj['Percentage (%)'] = totalMaxMarks > 0 ? ((totalScore / totalMaxMarks) * 100).toFixed(1) : 0;

    return rowObj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Marks Matrix');
  XLSX.writeFile(
    wb,
    `${assessmentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.xlsx`
  );
}

export async function parseMarksFromExcel(
  file: File,
  questions: QuestionItem[],
  students: StudentEnrollment[],
  windowId: string
): Promise<MarkEntryRecord[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  // Map student roll number -> student id
  const studentMap = new Map<string, string>();
  students.forEach((s) => {
    studentMap.set(s.rollNumber.trim().toUpperCase(), s.id);
  });

  const parsedEntries: MarkEntryRecord[] = [];

  rows.forEach((row) => {
    const roll =
      row['Roll Number'] ||
      row['RollNumber'] ||
      row['rollNumber'] ||
      row['RollNo'] ||
      row['ID'];
    if (!roll) return;

    const studentId = studentMap.get(String(roll).trim().toUpperCase());
    if (!studentId) return;

    // Check each question column
    questions.forEach((q) => {
      // Find matching column key in row (matching Q1.a, Q1, etc.)
      const matchedKey = Object.keys(row).find(
        (k) =>
          k.toLowerCase().startsWith(q.questionNumber.toLowerCase()) ||
          k.toLowerCase().includes(q.questionNumber.toLowerCase())
      );

      if (matchedKey) {
        const rawVal = row[matchedKey];
        let statusCode: MarkEntryStatusCode = 'PRESENT';
        let marksObtained: number | null = null;

        if (typeof rawVal === 'string') {
          const upper = rawVal.trim().toUpperCase();
          if (upper.includes('AB') || upper.includes('ABSENT')) {
            statusCode = 'ABSENT';
            marksObtained = null;
          } else if (upper.includes('MAL') || upper.includes('MP')) {
            statusCode = 'MALPRACTICE';
            marksObtained = 0;
          } else if (upper.includes('EX') || upper.includes('EXEMPT')) {
            statusCode = 'EXEMPTED';
            marksObtained = null;
          } else {
            const num = parseFloat(rawVal);
            if (!isNaN(num)) {
              marksObtained = Math.min(q.maxMarks, Math.max(0, num));
            }
          }
        } else if (typeof rawVal === 'number') {
          marksObtained = Math.min(q.maxMarks, Math.max(0, rawVal));
        }

        parsedEntries.push({
          id: `m-imp-${Date.now()}-${Math.random()}`,
          assessmentWindowId: windowId,
          enrollmentId: studentId,
          questionId: q.id,
          statusCode,
          marksObtained,
        });
      }
    });
  });

  return parsedEntries;
}

// ============================================================================
// 3. USER ACCOUNTS EXCEL UTILITIES
// ============================================================================

export function downloadUserAccountsTemplate() {
  const sampleData = [
    {
      FullName: 'Dr. Evelyn Vance',
      Email: 'evelyn.vance@university.edu',
      Role: 'HOD',
      Department: 'Department of Computer Science & Engineering',
      MfaEnabled: 'YES',
    },
    {
      FullName: 'Prof. Marcus Vance',
      Email: 'marcus.vance@university.edu',
      Role: 'COURSE_COORDINATOR',
      Department: 'Department of Computer Science & Engineering',
      MfaEnabled: 'YES',
    },
    {
      FullName: 'Dr. Sarah Connor',
      Email: 'sarah.c@university.edu',
      Role: 'COURSE_FACULTY',
      Department: 'Department of Computer Science & Engineering',
      MfaEnabled: 'NO',
    },
    {
      FullName: 'Aarav Sharma',
      Email: 'aarav.sharma@university.edu',
      Role: 'STUDENT',
      Department: 'Department of Computer Science & Engineering',
      MfaEnabled: 'NO',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'User Accounts');
  XLSX.writeFile(wb, 'user_accounts_template.xlsx');
}

export function exportUsersToExcel(users: UserAccount[]) {
  const data = users.map((u, idx) => ({
    'Sl. No': idx + 1,
    'Full Name': u.fullName,
    'Email Address': u.email,
    Role: u.role,
    Department: u.department || 'N/A',
    'MFA Enabled': u.isMfaEnabled ? 'YES' : 'NO',
    Status: u.status,
    'Created Date': new Date(u.createdAt).toLocaleDateString(),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Platform Users');
  XLSX.writeFile(wb, `platform_users_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseUsersFromExcel(file: File): Promise<UserAccount[]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const results: UserAccount[] = [];

  rows.forEach((row, idx) => {
    const fullName =
      row['FullName'] ||
      row['Full Name'] ||
      row['Name'] ||
      row['name'] ||
      row['studentName'];
    const email = row['Email'] || row['Email Address'] || row['email'];
    const rawRole = String(row['Role'] || row['role'] || 'COURSE_FACULTY').toUpperCase();
    const department = row['Department'] || row['department'] || undefined;
    const rawMfa = String(row['MfaEnabled'] || row['MFA'] || '').toUpperCase();

    const validRoles: UserRole[] = [
      'SUPER_ADMIN',
      'TENANT_ADMIN',
      'DEAN',
      'HOD',
      'COURSE_COORDINATOR',
      'COURSE_FACULTY',
      'STUDENT',
    ];

    let role: UserRole = 'COURSE_FACULTY';
    if (validRoles.includes(rawRole as UserRole)) {
      role = rawRole as UserRole;
    }

    if (fullName && email) {
      results.push({
        id: `u-imp-${Date.now()}-${idx}`,
        fullName: String(fullName).trim(),
        email: String(email).trim(),
        role,
        department: department ? String(department).trim() : undefined,
        isMfaEnabled: rawMfa.includes('Y') || rawMfa.includes('TRUE'),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
    }
  });

  return results;
}

// ============================================================================
// 4. COURSE OUTCOMES EXCEL UTILITIES
// ============================================================================

export function downloadCourseOutcomesTemplate() {
  const sampleData = [
    {
      Code: 'CO1',
      Statement: 'Design and analyze relational database schemas conforming to 3NF and BCNF normal forms.',
      BloomsLevel: 'APPLY',
    },
    {
      Code: 'CO2',
      Statement: 'Construct complex SQL queries with indexing strategies and transaction ACID properties.',
      BloomsLevel: 'ANALYZE',
    },
    {
      Code: 'CO3',
      Statement: 'Evaluate concurrency control algorithms and deadlock prevention techniques.',
      BloomsLevel: 'EVALUATE',
    },
    {
      Code: 'CO4',
      Statement: 'Formulate scalable NoSQL architectures and distributed partitioning schemes.',
      BloomsLevel: 'CREATE',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course Outcomes');
  XLSX.writeFile(wb, 'course_outcomes_template.xlsx');
}

export function exportCourseOutcomesToExcel(cos: CourseOutcomeItem[]) {
  const data = cos.map((co, idx) => ({
    'Sl. No': idx + 1,
    'CO Code': co.code,
    'Outcome Statement': co.statement,
    "Bloom's Taxonomy Level": co.bloomsLevel,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course Outcomes');
  XLSX.writeFile(wb, `course_outcomes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseCourseOutcomesFromExcel(
  file: File,
  courseId: string
): Promise<Array<Omit<CourseOutcomeItem, 'id'>>> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const validBlooms: BloomsTaxonomyLevel[] = [
    'REMEMBER',
    'UNDERSTAND',
    'APPLY',
    'ANALYZE',
    'EVALUATE',
    'CREATE',
  ];

  const results: Array<Omit<CourseOutcomeItem, 'id'>> = [];

  rows.forEach((row, idx) => {
    const code = row['Code'] || row['CO Code'] || row['code'] || `CO${idx + 1}`;
    const statement = row['Statement'] || row['Outcome Statement'] || row['statement'] || row['Description'];
    const rawBloom = String(row['BloomsLevel'] || row["Bloom's Taxonomy Level"] || row['Bloom'] || 'APPLY').toUpperCase();

    let bloomsLevel: BloomsTaxonomyLevel = 'APPLY';
    if (validBlooms.includes(rawBloom as BloomsTaxonomyLevel)) {
      bloomsLevel = rawBloom as BloomsTaxonomyLevel;
    }

    if (code && statement) {
      results.push({
        courseId,
        code: String(code).trim().toUpperCase(),
        statement: String(statement).trim(),
        bloomsLevel,
      });
    }
  });

  return results;
}

// ============================================================================
// 5. EXAM QUESTION BLUEPRINT EXCEL UTILITIES
// ============================================================================

export function downloadQuestionsTemplate(cos: CourseOutcomeItem[]) {
  const coExample = cos[0]?.code || 'CO1';
  const sampleData = [
    {
      QuestionNumber: 'Q1.a',
      Content: 'Explain the principles of BCNF normal form with an illustrative decomposition example.',
      MaxMarks: 5,
      MappedCO: coExample,
      BloomsLevel: 'UNDERSTAND',
    },
    {
      QuestionNumber: 'Q1.b',
      Content: 'Construct the relational algebra expression and optimize the corresponding query tree.',
      MaxMarks: 5,
      MappedCO: cos[1]?.code || coExample,
      BloomsLevel: 'APPLY',
    },
    {
      QuestionNumber: 'Q2.a',
      Content: 'Analyze two-phase locking protocols under high concurrent transaction load.',
      MaxMarks: 10,
      MappedCO: cos[2]?.code || coExample,
      BloomsLevel: 'ANALYZE',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions Blueprint');
  XLSX.writeFile(wb, 'question_blueprint_template.xlsx');
}

export function exportQuestionsToExcel(questions: QuestionItem[], cos: CourseOutcomeItem[]) {
  const coMap = new Map<string, string>();
  cos.forEach((co) => coMap.set(co.id, co.code));

  const data = questions.map((q, idx) => ({
    'Sl. No': idx + 1,
    'Question Number': q.questionNumber,
    'Question Text': q.content,
    'Max Marks': q.maxMarks,
    'Mapped Course Outcome': coMap.get(q.courseOutcomeId) || 'CO1',
    "Bloom's Taxonomy Level": q.bloomsLevel,
    'Target Mastery (%)': q.targetThresholdPct,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Exam Blueprint');
  XLSX.writeFile(wb, `exam_questions_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseQuestionsFromExcel(
  file: File,
  cos: CourseOutcomeItem[],
  questionPaperId: string = 'qp-1'
): Promise<Array<Omit<QuestionItem, 'id'>>> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  const coCodeToId = new Map<string, string>();
  cos.forEach((co) => {
    coCodeToId.set(co.code.trim().toUpperCase(), co.id);
  });

  const validBlooms: BloomsTaxonomyLevel[] = [
    'REMEMBER',
    'UNDERSTAND',
    'APPLY',
    'ANALYZE',
    'EVALUATE',
    'CREATE',
  ];

  const results: Array<Omit<QuestionItem, 'id'>> = [];

  rows.forEach((row, idx) => {
    const qNum =
      row['QuestionNumber'] ||
      row['Question Number'] ||
      row['QNum'] ||
      `Q${idx + 1}`;
    const content =
      row['Content'] ||
      row['Question Text'] ||
      row['Question'] ||
      row['Description'] ||
      `Question ${qNum}`;
    const maxMarksRaw = row['MaxMarks'] || row['Max Marks'] || row['Marks'] || 5;
    const mappedCoCode = String(
      row['MappedCO'] || row['Mapped Course Outcome'] || row['CO'] || 'CO1'
    ).trim().toUpperCase();
    const rawBloom = String(
      row['BloomsLevel'] || row["Bloom's Taxonomy Level"] || row['Bloom'] || 'APPLY'
    ).toUpperCase();

    const maxMarks = Math.max(1, parseFloat(maxMarksRaw) || 5);
    const courseOutcomeId = coCodeToId.get(mappedCoCode) || cos[0]?.id || 'co-default';

    let bloomsLevel: BloomsTaxonomyLevel = 'APPLY';
    if (validBlooms.includes(rawBloom as BloomsTaxonomyLevel)) {
      bloomsLevel = rawBloom as BloomsTaxonomyLevel;
    }

    results.push({
      questionPaperId,
      questionNumber: String(qNum).trim(),
      content: String(content).trim(),
      maxMarks,
      courseOutcomeId,
      bloomsLevel,
      targetThresholdPct: 60,
      displayOrder: idx + 1,
    });
  });

  return results;
}

