'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  StudentEnrollment,
  QuestionItem,
  MarkEntryRecord,
  QuestionPaperSection,
} from '@/types/erp';
import {
  FullObeAttainmentCalculationReport,
  OverallCoAttainmentResult,
  PoAttainmentResult,
} from '@/types/obe';

// ============================================================================
// HELPER: Print Ground-Up Vector PDF via Isolated Blob
// ============================================================================

export function printPdfDocument(doc: jsPDF): void {
  if (typeof window === 'undefined') return;

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        // Fallback: open in new tab if iframe print is blocked
        window.open(blobUrl, '_blank');
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        } catch (_) {}
      }, 60000);
    }, 250);
  };
}

// ============================================================================
// 1. GROUND-UP VECTOR PDF: OFFICIAL MARKS AWARD SHEET
// ============================================================================

export interface GenerateMarksAwardSheetOptions {
  tenantName?: string;
  courseCode: string;
  courseTitle: string;
  academicYear?: string;
  sectionName: string;
  facultyName?: string;
  windowName: string;
  maxMarks: number;
  students: StudentEnrollment[];
  questions: QuestionItem[];
  marks: MarkEntryRecord[];
  action: 'download' | 'print';
}

export function generateMarksAwardSheetPdf(opts: GenerateMarksAwardSheetOptions): jsPDF {
  const {
    tenantName = 'CENTRAL UNIVERSITY OF TECHNOLOGY',
    courseCode,
    courseTitle,
    academicYear = '2026-2027',
    sectionName,
    facultyName = 'Course Faculty',
    windowName,
    maxMarks,
    students,
    questions,
    marks,
    action,
  } = opts;

  // Use landscape if more than 6 questions to keep comfortable spacing
  const isLandscape = questions.length > 5;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Institutional Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(tenantName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    'Autonomous Institution • Accredited by NAAC with Grade A++ • NBA Tier-1 Accreditations',
    pageWidth / 2,
    19,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    'OFFICIAL CONTINUOUS INTERNAL EVALUATION / SEMESTER EXAM MARK AWARD SHEET',
    pageWidth / 2,
    25,
    { align: 'center' }
  );

  // Metadata Grid
  const metadataHead = [['Course', 'Section & Evaluator', 'Assessment Window', 'Academic Session']];
  const metadataBody = [
    [
      `${courseCode} - ${courseTitle}`,
      `${sectionName} (${facultyName})`,
      `${windowName} (Max: ${maxMarks}M)`,
      `Academic Year ${academicYear}`,
    ],
  ];

  autoTable(doc, {
    startY: 28,
    head: metadataHead,
    body: metadataBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    margin: { left: 12, right: 12 },
  });

  // Build Questions Map
  const markMap = new Map<string, MarkEntryRecord>();
  marks.forEach((m) => {
    markMap.set(`${m.enrollmentId}_${m.questionId}`, m);
  });

  // Table Headers
  const tableHead = [
    ['#', 'Roll Number', 'Student Name', ...questions.map((q) => `${q.questionNumber}\n[${q.maxMarks}M]`), 'Total\n[' + maxMarks + 'M]', '%', 'Status'],
  ];

  // Table Rows & Stats
  let totalScoreSum = 0;
  let appearedCount = 0;
  let absentCount = 0;
  let malpracticeCount = 0;

  const tableRows = students.map((stu, idx) => {
    let studentTotal = 0;
    let isStudentAbsent = false;
    let isStudentMalpractice = false;

    const qScores = questions.map((q) => {
      const rec = markMap.get(`${stu.id}_${q.id}`);
      if (!rec || rec.statusCode === 'ABSENT') {
        isStudentAbsent = true;
        return 'AB';
      }
      if (rec.statusCode === 'MALPRACTICE') {
        isStudentMalpractice = true;
        return 'MP';
      }
      if (rec.statusCode === 'EXEMPTED') {
        return 'EX';
      }
      const val = rec.marksObtained ?? 0;
      studentTotal += val;
      return val.toString();
    });

    let statusText = 'PRESENT';
    if (isStudentMalpractice) {
      statusText = 'MALPRACTICE';
      studentTotal = 0;
      malpracticeCount++;
    } else if (isStudentAbsent && studentTotal === 0) {
      statusText = 'ABSENT';
      absentCount++;
    } else {
      appearedCount++;
      totalScoreSum += studentTotal;
    }

    const pct = maxMarks > 0 ? ((studentTotal / maxMarks) * 100).toFixed(1) + '%' : '0%';

    return [
      (idx + 1).toString(),
      stu.rollNumber,
      stu.studentName,
      ...qScores,
      studentTotal.toFixed(1),
      pct,
      statusText,
    ];
  });

  // Generate Marks Matrix AutoTable
  const prevY = (doc as any).lastAutoTable?.finalY || 42;
  autoTable(doc, {
    startY: prevY + 3,
    head: tableHead,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'left', cellWidth: isLandscape ? 45 : 40 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'AB' || val === 'ABSENT') {
          data.cell.styles.textColor = [225, 29, 72]; // rose-600
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'PRESENT') {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
        } else if (val === 'MP' || val === 'MALPRACTICE') {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 12, right: 12 },
  });

  // Class Summary Statistics
  const classAvg = appearedCount > 0 ? (totalScoreSum / appearedCount).toFixed(2) : '0.00';
  const classAvgPct = appearedCount > 0 && maxMarks > 0 ? ((totalScoreSum / appearedCount / maxMarks) * 100).toFixed(1) + '%' : '0.0%';

  const statsY = (doc as any).lastAutoTable?.finalY + 4;
  
  // Check if we need a new page for signatures
  if (statsY > pageHeight - 35) {
    doc.addPage();
  }

  const currentY = (doc as any).lastAutoTable?.finalY > pageHeight - 35 ? 15 : statsY;

  // Summary box
  autoTable(doc, {
    startY: currentY,
    head: [['Total Enrolled', 'Appeared', 'Absent', 'Malpractice', 'Class Average Score', 'Class Average %']],
    body: [[
      students.length.toString(),
      appearedCount.toString(),
      absentCount.toString(),
      malpracticeCount.toString(),
      `${classAvg} / ${maxMarks}M`,
      classAvgPct,
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      fontStyle: 'bold',
    },
    margin: { left: 12, right: 12 },
  });

  // Official Sign-Off Block
  const sigY = (doc as any).lastAutoTable?.finalY + 12;
  const colW = (pageWidth - 24) / 4;

  const roles = [
    { title: 'Course Instructor / Evaluator', name: facultyName },
    { title: 'Course Coordinator', name: 'Authorized Signatory' },
    { title: 'Head of Department (HOD)', name: 'Department Chair' },
    { title: 'Controller of Examinations', name: 'COE Seal & Sign' },
  ];

  doc.setFontSize(8);
  roles.forEach((r, idx) => {
    const x = 12 + idx * colW;
    // Signature line
    doc.setDrawColor(203, 213, 225);
    doc.line(x + 2, sigY + 10, x + colW - 6, sigY + 10);
    // Role title
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(r.title, x + (colW - 4) / 2, sigY + 14, { align: 'center' });
    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(r.name, x + (colW - 4) / 2, sigY + 18, { align: 'center' });
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Official Institutional Record • ${courseCode} • Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanFileName = `Marks_Award_Sheet_${courseCode}_${windowName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  if (action === 'download') {
    doc.save(cleanFileName);
  } else {
    printPdfDocument(doc);
  }

  return doc;
}

// ============================================================================
// 2. GROUND-UP VECTOR PDF: OBE ATTAINMENT DOSSIER & ACCREDITATION REPORT
// ============================================================================

export interface GenerateObeAttainmentDossierOptions {
  tenantName?: string;
  courseCode: string;
  courseTitle: string;
  programName?: string;
  sectionName?: string;
  academicYear?: string;
  report: FullObeAttainmentCalculationReport;
  printOptions?: {
    showSignatures?: boolean;
    showGapAnalysis?: boolean;
    showCqiPlan?: boolean;
    showCoPoMatrix?: boolean;
    showQuestionBreakdown?: boolean;
    showInstituteHeader?: boolean;
  };
  action: 'download' | 'print';
}

export function generateObeAttainmentDossierPdf(opts: GenerateObeAttainmentDossierOptions): jsPDF {
  const {
    tenantName = 'CENTRAL UNIVERSITY OF TECHNOLOGY',
    courseCode,
    courseTitle,
    programName = 'Undergraduate Engineering Program',
    sectionName = 'Course-wide Aggregate',
    academicYear = '2026-2027',
    report,
    printOptions = {
      showSignatures: true,
      showGapAnalysis: true,
      showCqiPlan: true,
      showCoPoMatrix: true,
      showQuestionBreakdown: true,
      showInstituteHeader: true,
    },
    action,
  } = opts;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // PAGE 1: HEADER & COURSE OUTCOMES ATTAINMENT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tenantName.toUpperCase(), pageWidth / 2, 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Accreditation Standards: NBA Tier-I (Criterion 3) • NAAC Criterion 2.6.2 • ABET EAC/CAC Ready',
    pageWidth / 2,
    19,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `OUTCOME-BASED EDUCATION (OBE) COURSE ATTAINMENT DOSSIER`,
    pageWidth / 2,
    25,
    { align: 'center' }
  );

  // Metadata Table
  autoTable(doc, {
    startY: 28,
    head: [['Course & Code', 'Academic Program', 'Cohort / Academic Session', 'Evaluation Scope']],
    body: [
      [
        `${courseCode} - ${courseTitle}`,
        programName,
        `Batch 2026 (AY ${academicYear})`,
        sectionName,
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontStyle: 'bold',
    },
    margin: { left: 12, right: 12 },
  });

  // Section 1: CO Attainment Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(67, 56, 202); // indigo-700
  const titleY = (doc as any).lastAutoTable?.finalY + 6;
  doc.text('1. Course Outcome (CO) Direct & Indirect Attainment Analysis', 12, titleY);

  const coHead = [
    ['CO Code', 'Bloom Level', 'Statement', 'Direct Score', 'Survey Score', 'Final Attained (0-3)', 'Target Level', 'Status'],
  ];

  const coBody = report.overallCoAttainments.map((co: OverallCoAttainmentResult) => [
    co.courseOutcomeCode,
    co.bloomsLevel,
    co.statement,
    co.directScore.toFixed(2),
    co.indirectScore.toFixed(2),
    co.overallScore.toFixed(2),
    co.targetLevel.toFixed(2),
    co.isAttained ? 'ACHIEVED' : 'GAP',
  ]);

  autoTable(doc, {
    startY: titleY + 2,
    head: coHead,
    body: coBody,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
      1: { halign: 'center', cellWidth: 20 },
      2: { cellWidth: 62 },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { fontStyle: 'bold', halign: 'center' },
      6: { halign: 'center' },
      7: { fontStyle: 'bold', halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'ACHIEVED') {
          data.cell.styles.textColor = [5, 150, 105];
        } else {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
    margin: { left: 12, right: 12 },
  });

  // Section 2: Program Outcomes (PO/PSO) Mapping Table
  if (printOptions.showCoPoMatrix && report.poAttainments.length > 0) {
    const poTitleY = (doc as any).lastAutoTable?.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(67, 56, 202);
    doc.text('2. Program Outcome (PO & PSO) Contribution Matrix', 12, poTitleY);

    const poHead = [['PO/PSO Code', 'Outcome Title / Definition', 'Target (0-3.0)', 'Attained Level', 'Gap', 'Compliance Result']];
    const poBody = report.poAttainments.map((po: PoAttainmentResult) => {
      const gap = Math.max(0, po.targetLevel - po.attainedLevel);
      return [
        po.code,
        po.title,
        po.targetLevel.toFixed(2),
        po.attainedLevel.toFixed(2),
        gap.toFixed(2),
        po.isAttained ? 'SATISFIED' : 'NEEDS ACTION',
      ];
    });

    autoTable(doc, {
      startY: poTitleY + 2,
      head: poHead,
      body: poBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [241, 245, 249],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
        1: { cellWidth: 72 },
        2: { halign: 'center' },
        3: { fontStyle: 'bold', halign: 'center' },
        4: { halign: 'center' },
        5: { fontStyle: 'bold', halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'SATISFIED') {
            data.cell.styles.textColor = [5, 150, 105];
          } else {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      },
      margin: { left: 12, right: 12 },
    });
  }

  // Section 3: CQI Action Plan (Continuous Quality Improvement)
  if (printOptions.showCqiPlan) {
    const prevY = (doc as any).lastAutoTable?.finalY || 40;
    if (prevY > pageHeight - 50) {
      doc.addPage();
    }

    const cqiY = ((doc as any).lastAutoTable?.finalY > pageHeight - 50 ? 15 : (doc as any).lastAutoTable?.finalY) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(67, 56, 202);
    doc.text('3. Continuous Quality Improvement (CQI) Action Plan', 12, cqiY);

    const cqiHead = [['CO Code', 'Attainment Status', 'Identified Deficit / Root Cause', 'Corrective Remedial Action', 'Target Cadence']];
    const cqiBody = report.overallCoAttainments.map((co: OverallCoAttainmentResult) => {
      const gap = co.variance < 0 ? Math.abs(co.variance).toFixed(2) : '0.00';
      return [
        co.courseOutcomeCode,
        co.isAttained ? 'Target Satisfied' : `Deficit Gap (-${gap})`,
        co.isAttained
          ? 'Met internal & external performance cutoff benchmarks.'
          : 'Deficit observed in higher-order taxonomy cognitive evaluation questions.',
        co.isAttained
          ? 'Continue current pedagogical methodology with peer learning case studies.'
          : 'Conduct 2 remedial tutorial workshops and assign structured problem solving modules.',
        'Next Term',
      ];
    });

    autoTable(doc, {
      startY: cqiY + 2,
      head: cqiHead,
      body: cqiBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [203, 213, 225],
        lineWidth: 0.15,
        textColor: [15, 23, 42],
      },
      headStyles: {
        fillColor: [241, 245, 249],
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
        1: { cellWidth: 32 },
        2: { cellWidth: 50 },
        3: { cellWidth: 58 },
        4: { halign: 'center', cellWidth: 22 },
      },
      margin: { left: 12, right: 12 },
    });
  }

  // Section 4: Official Signatures Block
  if (printOptions.showSignatures) {
    const prevY = (doc as any).lastAutoTable?.finalY || 40;
    if (prevY > pageHeight - 40) {
      doc.addPage();
    }

    const sigY = ((doc as any).lastAutoTable?.finalY > pageHeight - 40 ? 15 : (doc as any).lastAutoTable?.finalY) + 14;
    const colW = (pageWidth - 24) / 4;

    const committee = [
      { title: 'Course Instructor', name: 'Faculty Lead' },
      { title: 'Course Coordinator', name: 'Curriculum Chair' },
      { title: 'DAC Convener / HOD', name: 'Academic Department Head' },
      { title: 'Dean Academic Affairs', name: 'Institutional Endorsement' },
    ];

    committee.forEach((c, idx) => {
      const x = 12 + idx * colW;
      doc.setDrawColor(203, 213, 225);
      doc.line(x + 2, sigY + 10, x + colW - 6, sigY + 10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(c.title, x + (colW - 4) / 2, sigY + 14, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.name, x + (colW - 4) / 2, sigY + 18, { align: 'center' });
    });
  }

  // Header & Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Accreditation Dossier • ${courseCode} • Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanFileName = `OBE_Attainment_Dossier_${courseCode}_${academicYear}.pdf`;

  if (action === 'download') {
    doc.save(cleanFileName);
  } else {
    printPdfDocument(doc);
  }

  return doc;
}

// ============================================================================
// 3. GROUND-UP VECTOR PDF: OFFICIAL EXAMINATION QUESTION PAPER
// ============================================================================

export interface GenerateQuestionPaperOptions {
  tenantName?: string;
  courseCode: string;
  courseTitle: string;
  paperTitle: string;
  academicYear?: string;
  totalMarks: number;
  duration?: string;
  sections: QuestionPaperSection[];
  questions: QuestionItem[];
  courseOutcomes?: { id: string; code: string }[];
  printOptions?: {
    showSignatures?: boolean;
    showCoBlooms?: boolean;
    showInstructions?: boolean;
    showInstituteHeader?: boolean;
    showMarks?: boolean;
  };
  action: 'download' | 'print';
}

export function generateQuestionPaperPdf(opts: GenerateQuestionPaperOptions): jsPDF {
  const {
    tenantName = 'CENTRAL UNIVERSITY OF TECHNOLOGY',
    courseCode,
    courseTitle,
    paperTitle,
    academicYear = '2026-2027',
    totalMarks,
    duration = '3 Hours',
    sections,
    questions,
    courseOutcomes = [],
    printOptions = {
      showSignatures: true,
      showCoBlooms: true,
      showInstructions: true,
      showInstituteHeader: true,
      showMarks: true,
    },
    action,
  } = opts;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 14;

  // 1. Institutional Header
  if (printOptions.showInstituteHeader !== false) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(tenantName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'FACULTY OF ENGINEERING & TECHNOLOGY • AUTONOMOUS INSTITUTION ACCREDITED BY NAAC / NBA',
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `${paperTitle.toUpperCase()} • ACADEMIC YEAR ${academicYear}`,
      pageWidth / 2,
      currentY,
      { align: 'center' }
    );
    currentY += 4;

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 5;
  }

  // 2. Metadata Box Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: 'plain',
    head: [],
    body: [
      [
        { content: 'COURSE CODE:', styles: { fontStyle: 'bold', fontSize: 8, textColor: [71, 85, 105] } },
        { content: courseCode, styles: { fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] } },
        { content: 'MAXIMUM MARKS:', styles: { fontStyle: 'bold', fontSize: 8, textColor: [71, 85, 105] } },
        { content: `${totalMarks} Marks`, styles: { fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] } },
      ],
      [
        { content: 'COURSE TITLE:', styles: { fontStyle: 'bold', fontSize: 8, textColor: [71, 85, 105] } },
        { content: courseTitle, styles: { fontStyle: 'bold', fontSize: 8.5, textColor: [15, 23, 42] } },
        { content: 'DURATION:', styles: { fontStyle: 'bold', fontSize: 8, textColor: [71, 85, 105] } },
        { content: duration, styles: { fontStyle: 'bold', fontSize: 8.5, textColor: [15, 23, 42] } },
      ],
    ],
    styles: {
      cellPadding: 2,
      valign: 'middle',
    },
    tableLineColor: [203, 213, 225],
    tableLineWidth: 0.3,
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 3. Candidate Instructions Box
  if (printOptions.showInstructions !== false) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: 'plain',
      body: [
        [
          {
            content:
              'GENERAL INSTRUCTIONS TO CANDIDATES:\n' +
              '1. Read each question carefully and strictly answer according to the respective section guidelines.\n' +
              '2. Where internal choice is indicated with [— OR —], answer either Option A or Option B.\n' +
              '3. Mathematical equations, symbols, and formulas follow standard scientific conventions.\n' +
              '4. Assume suitable missing data if any, and clearly state assumptions explicitly.',
            styles: {
              fontSize: 7.5,
              textColor: [71, 85, 105],
              fontStyle: 'italic',
              cellPadding: 2.5,
              fillColor: [248, 250, 252],
            },
          },
        ],
      ],
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });
    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // Helper to resolve Course Outcome Code
  const getCoCode = (coId: string) => {
    const matched = courseOutcomes.find((c) => c.id === coId);
    return matched?.code || 'CO';
  };

  // 4. Render Sections and Question Tables
  const sortedSections = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const sec of sortedSections) {
    const secQuestions = questions
      .filter((q) => q.sectionId === sec.id)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    if (secQuestions.length === 0) continue;

    const choiceInstruction =
      sec.choiceRule === 'ALL'
        ? '(Answer ALL questions in this section)'
        : `(Answer ANY ${sec.questionsToAnswer || 1} of ${sec.totalQuestions || secQuestions.length} questions)`;

    const secHeaderText = `${sec.sectionName.toUpperCase()} — ${choiceInstruction}${
      sec.instructions ? ` • ${sec.instructions}` : ''
    }`;

    const tableRows: any[] = [];

    secQuestions.forEach((q, idx) => {
      const prevQ = idx > 0 ? secQuestions[idx - 1] : null;
      const isChoiceSecond =
        q.isOption &&
        prevQ &&
        prevQ.isOption &&
        (prevQ.optionGroup === q.optionGroup ||
          q.optionLabel?.toLowerCase().includes('b') ||
          prevQ.optionLabel?.toLowerCase().includes('a'));

      if (isChoiceSecond) {
        tableRows.push([
          {
            content: '— OR — (ALTERNATIVE QUESTION CHOICE)',
            colSpan: 4,
            styles: {
              halign: 'center',
              fontStyle: 'bold',
              fillColor: [241, 245, 249],
              textColor: [71, 85, 105],
              fontSize: 8,
              cellPadding: 2,
            },
          },
        ]);
      }

      const cleanContent = (q.content || '[Question statement pending entry]')
        .replace(/\$\$(.*?)\$\$/g, '$1')
        .replace(/\$(.*?)\$/g, '$1')
        .replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '$1/$2')
        .replace(/\\sqrt\{(.*?)\}/g, 'sqrt($1)')
        .replace(/\\cdot/g, '•')
        .replace(/\\times/g, '×')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\pm/g, '±')
        .replace(/\\infty/g, '∞')
        .replace(/\\pi/g, 'π')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\theta/g, 'θ')
        .replace(/\\Sigma/g, 'Σ')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      const qNumText = q.partLabel ? `${q.questionNumber} (${q.partLabel})` : `${q.questionNumber}.`;
      const coBloomsText = `[${getCoCode(q.courseOutcomeId)}, ${q.bloomsLevel}]`;
      const marksText = `[${q.maxMarks}M]`;

      const rowCells: any[] = [
        {
          content: qNumText,
          styles: { fontStyle: 'bold', halign: 'center', fontSize: 8.5, textColor: [15, 23, 42] },
        },
        {
          content: cleanContent,
          styles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: 2.5 },
        },
      ];

      if (printOptions.showCoBlooms !== false) {
        rowCells.push({
          content: coBloomsText,
          styles: { halign: 'center', fontSize: 7.5, textColor: [100, 116, 139] },
        });
      }

      if (printOptions.showMarks !== false) {
        rowCells.push({
          content: marksText,
          styles: { fontStyle: 'bold', halign: 'right', fontSize: 8.5, textColor: [15, 23, 42] },
        });
      }

      tableRows.push(rowCells);
    });

    const headers: any[] = [
      { content: 'Q.No', styles: { halign: 'center', cellWidth: 14 } },
      { content: 'Question Statement & Analytical Problem', styles: { halign: 'left' } },
    ];

    if (printOptions.showCoBlooms !== false) {
      headers.push({ content: 'CO & Bloom', styles: { halign: 'center' as const, cellWidth: 26 } });
    }

    if (printOptions.showMarks !== false) {
      headers.push({ content: 'Marks', styles: { halign: 'right' as const, cellWidth: 16 } });
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      head: [
        [
          {
            content: secHeaderText,
            colSpan: headers.length,
            styles: {
              fillColor: [30, 41, 59],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: 2.5,
            },
          },
        ],
        headers,
      ],
      body: tableRows,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: {
        fontSize: 8.5,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [254, 254, 254],
      },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.2,
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // 5. Official Signatures Block
  if (printOptions.showSignatures !== false) {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY += 6;
    }

    const colWidth = (pageWidth - 28) / 3;
    const signatures = [
      { role: 'Course Instructor', label: 'Verified by Course Instructor' },
      { role: 'Course Coordinator', label: 'Approved by Course Coordinator' },
      { role: 'Head of Department', label: 'Approved by Head of Department' },
    ];

    signatures.forEach((sig, index) => {
      const x = 14 + index * colWidth;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(x + 4, currentY + 10, x + colWidth - 8, currentY + 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(sig.role, x + (colWidth - 4) / 2, currentY + 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sig.label, x + (colWidth - 4) / 2, currentY + 18, { align: 'center' });
    });
  }

  // 6. Running Page Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Official Examination Blueprint • ${courseCode} (${courseTitle}) • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const cleanFileName = `Examination_Paper_${courseCode}_${paperTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  if (action === 'download') {
    doc.save(cleanFileName);
  } else {
    printPdfDocument(doc);
  }

  return doc;
}

// Fallback functions for backward compatibility if needed
export function printElement(elementId: string, pageTitle: string = 'Document'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }
  window.print();
}

export async function downloadPdfFromElement(
  elementId: string,
  fileName: string = 'document.pdf',
  onProgress?: (isGenerating: boolean) => void
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;
  // Browser print fallback
  window.print();
}
