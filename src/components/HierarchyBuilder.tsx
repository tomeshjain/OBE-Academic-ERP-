'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Building2,
  GraduationCap,
  FolderTree,
  BookOpen,
  Users,
  ChevronRight,
  ChevronDown,
  Upload,
  Plus,
} from 'lucide-react';

export const HierarchyBuilder: React.FC<{ onOpenAdminHub?: () => void }> = ({
  onOpenAdminHub,
}) => {
  const { tenant, faculties, schools, departments, programs, courses } = useApp();

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'tenant-root': true,
    'fac-0': true,
    'dept-0': true,
    'prog-0': true,
  });

  const [selectedNode, setSelectedNode] = useState<{
    type: string;
    title: string;
    code: string;
    meta: Record<string, string | number>;
  }>({
    type: 'Institution (Tenant)',
    title: tenant?.name || 'Academic Institution',
    code: tenant?.code || 'INST',
    meta: {
      Subdomain: tenant?.subdomain || 'institution.obeplatform.io',
      MFAEnforced: tenant?.mfaEnforced ? 'Yes (Enforced)' : 'No',
      FacultiesCount: faculties.length,
      DepartmentsCount: departments.length,
      ProgramsCount: programs.length,
      CoursesCount: courses.length,
    },
  });

  const toggle = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-3 py-1 rounded-full border border-teal-800">
                Institutional Hierarchy Engine (Module A)
              </span>
              <span className="text-xs text-slate-400">Multi-Tenant Scoped</span>
            </div>
            <h2 className="text-xl font-black text-white mt-2">
              Academic Hierarchy & Institutional Tree Builder
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hierarchical mapping: {tenant?.name || 'Institution'} &rarr; Faculty &rarr; School &rarr; Department &rarr; Degree Program &rarr; Course.
            </p>
          </div>

          {onOpenAdminHub && (
            <button
              onClick={onOpenAdminHub}
              className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Manage Entities in Admin Hub</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tree View on Left */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Organizational Tree View</span>
            <span className="text-[11px] text-indigo-400 font-normal">Click node to inspect metadata</span>
          </div>

          <div className="space-y-2 text-xs select-none">
            {/* TENANT ROOT */}
            <div className="border border-slate-800 rounded-xl p-2.5 bg-slate-950/60">
              <div
                className="flex items-center gap-2 cursor-pointer font-bold text-white hover:text-indigo-300"
                onClick={() => {
                  setSelectedNode({
                    type: 'Institution (Tenant)',
                    title: tenant?.name || 'Academic Institution',
                    code: tenant?.code || 'INST',
                    meta: {
                      Subdomain: tenant?.subdomain || 'institution.obeplatform.io',
                      MFAEnforced: tenant?.mfaEnforced ? 'Yes (Enforced)' : 'No',
                      FacultiesCount: faculties.length,
                      DepartmentsCount: departments.length,
                      ProgramsCount: programs.length,
                      CoursesCount: courses.length,
                    },
                  });
                  toggle('tenant-root');
                }}
              >
                {expandedNodes['tenant-root'] ? (
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>{tenant?.name || 'Institution Root'}</span>
                <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {tenant?.code || 'INST'}
                </span>
              </div>

              {expandedNodes['tenant-root'] && (
                <div className="pl-6 pt-3 space-y-2 border-l border-slate-800/80 ml-2 mt-2">
                  {faculties.length === 0 ? (
                    <div className="text-slate-500 text-xs italic">No faculties added yet.</div>
                  ) : (
                    faculties.map((fac, fIdx) => (
                      <div key={fac.id} className="border border-slate-800/80 rounded-xl p-2.5 bg-slate-900/40">
                        <div
                          className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200 hover:text-indigo-300"
                          onClick={() => {
                            setSelectedNode({
                              type: 'Faculty',
                              title: fac.name,
                              code: fac.code,
                              meta: {
                                FacultyName: fac.name,
                                Code: fac.code,
                              },
                            });
                            toggle(`fac-${fIdx}`);
                          }}
                        >
                          {expandedNodes[`fac-${fIdx}`] ? (
                            <ChevronDown className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                          <GraduationCap className="w-4 h-4 text-teal-400" />
                          <span>{fac.name}</span>
                          <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            {fac.code}
                          </span>
                        </div>

                        {expandedNodes[`fac-${fIdx}`] && (
                          <div className="pl-6 pt-3 space-y-2 border-l border-slate-800 ml-2 mt-2">
                            {departments.length === 0 ? (
                              <div className="text-slate-500 text-xs italic">No departments added yet.</div>
                            ) : (
                              departments.map((dept, dIdx) => (
                                <div
                                  key={dept.id}
                                  className="border border-indigo-700/60 rounded-xl p-2.5 bg-indigo-950/20 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNode({
                                      type: 'Department',
                                      title: dept.name,
                                      code: dept.code,
                                      meta: {
                                        DeptName: dept.name,
                                        Code: dept.code,
                                        ProgramsOffered: programs.length,
                                      },
                                    });
                                    toggle(`dept-${dIdx}`);
                                  }}
                                >
                                  <div className="flex items-center gap-2 font-bold text-indigo-200">
                                    {expandedNodes[`dept-${dIdx}`] ? (
                                      <ChevronDown className="w-4 h-4 text-indigo-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-500" />
                                    )}
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    <span>{dept.name}</span>
                                    <span className="ml-auto text-[10px] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded font-mono">
                                      {dept.code}
                                    </span>
                                  </div>

                                  {expandedNodes[`dept-${dIdx}`] && (
                                    <div className="pl-6 pt-3 space-y-2 border-l border-indigo-900/60 ml-2 mt-2">
                                      {programs.map((prog, pIdx) => (
                                        <div
                                          key={prog.id}
                                          className="border border-slate-800 rounded-xl p-2 bg-slate-900/60 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedNode({
                                              type: 'Degree Program',
                                              title: prog.name,
                                              code: prog.code,
                                              meta: {
                                                DegreeType: prog.degreeType,
                                                Duration: '4 Years (8 Semesters)',
                                                TotalTerms: prog.totalTerms,
                                              },
                                            });
                                            toggle(`prog-${pIdx}`);
                                          }}
                                        >
                                          <div className="flex items-center gap-2 font-medium text-slate-200">
                                            {expandedNodes[`prog-${pIdx}`] ? (
                                              <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                                            <span>{prog.name}</span>
                                          </div>

                                          {expandedNodes[`prog-${pIdx}`] && (
                                            <div className="pl-6 pt-2 space-y-1.5 border-l border-slate-800 ml-2 mt-1">
                                              {courses.map((course) => (
                                                <div
                                                  key={course.id}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedNode({
                                                      type: 'Course Offering',
                                                      title: `${course.code}: ${course.title}`,
                                                      code: course.code,
                                                      meta: {
                                                        Credits: course.credits,
                                                        Term: course.term,
                                                        Coordinator: course.coordinator || 'Unassigned',
                                                      },
                                                    });
                                                  }}
                                                  className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between hover:border-indigo-600 transition-colors"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span className="font-semibold text-slate-100">
                                                      {course.code}: {course.title}
                                                    </span>
                                                  </div>
                                                  <span className="text-[10px] text-emerald-400 font-mono">
                                                    {course.credits} Credits
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Entity Metadata Inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800">
              {selectedNode.type}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">{selectedNode.code}</span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">{selectedNode.title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              Active node in institutional hierarchy. Configuration dictates access scopes and OBE attainment aggregation paths.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            {Object.entries(selectedNode.meta).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs"
              >
                <span className="text-slate-400 font-medium">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-slate-200 font-bold font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
