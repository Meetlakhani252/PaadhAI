export type SubjectResource = {
  title: string;
  detail: string;
};

export type CatalogSubject = {
  id: string;
  name: string;
  code: string;
  topics: string[];
  syllabus: SubjectResource[];
  samplePapers: SubjectResource[];
  previousYearPapers: SubjectResource[];
};

function resources(subject: string, code: string, topics: string[]): CatalogSubject {
  return {
    id: code.toLowerCase(),
    name: subject,
    code,
    topics,
    syllabus: [
      { title: `${code} course outline`, detail: "Units, learning outcomes, and exam coverage" },
      { title: `${subject} revision checklist`, detail: `${topics.length} core topics to review` },
    ],
    samplePapers: [
      { title: `${code} model paper · Set A`, detail: "3 hours · 70 marks · Full syllabus" },
      { title: `${code} practice paper · Set B`, detail: "2 hours · 50 marks · Practice set" },
    ],
    previousYearPapers: [
      { title: `${code} end-semester examination`, detail: "2025 · May session · 70 marks" },
      { title: `${code} end-semester examination`, detail: "2024 · December session · 70 marks" },
    ],
  };
}

export const SUBJECT_CATALOG: CatalogSubject[] = [
  resources("Data Structures", "CS201", ["Arrays and linked lists", "Stacks and queues", "Trees and graphs"]),
  resources("Database Systems", "CS202", ["Relational models", "SQL and normalization", "Transactions and recovery"]),
  resources("Operating Systems", "CS203", ["Processes and threads", "Memory management", "File systems"]),
  resources("Computer Networks", "CS204", ["Network layers", "Routing and switching", "Transport protocols"]),
  resources("Object-Oriented Programming", "CS205", ["Classes and objects", "Inheritance and polymorphism", "Design patterns"]),
  resources("Discrete Mathematics", "MA201", ["Logic and proofs", "Sets and relations", "Graph theory"]),
  resources("Engineering Mathematics II", "MA202", ["Differential equations", "Laplace transforms", "Probability and statistics"]),
  resources("Digital Logic Design", "EC201", ["Boolean algebra", "Combinational circuits", "Sequential circuits"]),
  resources("Theory of Computation", "CS301", ["Finite automata", "Context-free grammars", "Turing machines"]),
  resources("Software Engineering", "CS302", ["Requirements and design", "Testing strategies", "Project management"]),
  resources("Artificial Intelligence", "CS303", ["Search algorithms", "Knowledge representation", "Machine learning basics"]),
  resources("Compiler Design", "CS304", ["Lexical analysis", "Parsing and syntax trees", "Code generation"]),
];

