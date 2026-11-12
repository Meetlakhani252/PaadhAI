export type MaterialType = "video" | "notes" | "cheatsheet" | "link";

export type StudyMaterial = {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  url: string;
  subjectName: string;
  topicName?: string;
  authorOrChannel?: string;
  durationOrPages?: string;
  isCustom?: boolean;
};

export const DEFAULT_MATERIALS: StudyMaterial[] = [
  // Data Structures
  {
    id: "ds-yt-1",
    title: "Data Structures & Algorithms Course for Beginners",
    description: "Complete DSA roadmap covering Arrays, Linked Lists, Trees, Graphs, and Dynamic Programming.",
    type: "video",
    url: "https://www.youtube.com/watch?v=RBSGKlAnoiM",
    subjectName: "Data Structures",
    topicName: "All Topics",
    authorOrChannel: "freeCodeCamp.org",
    durationOrPages: "5h 15m",
  },
  {
    id: "ds-yt-2",
    title: "Binary Tree & Traversals Visualized",
    description: "In-depth visual walkthrough of preorder, inorder, postorder, and level-order traversals.",
    type: "video",
    url: "https://www.youtube.com/watch?v=b_N4M49-3bA",
    subjectName: "Data Structures",
    topicName: "Trees and graphs",
    authorOrChannel: "NeetCode",
    durationOrPages: "32m",
  },
  {
    id: "ds-notes-1",
    title: "DSA Comprehensive Revision Notes",
    description: "High-yield summaries of operations, time & space complexity tables for all major structures.",
    type: "notes",
    url: "https://github.com/trekhleb/javascript-algorithms",
    subjectName: "Data Structures",
    topicName: "Complexity Analysis",
    authorOrChannel: "Open Source Notes",
    durationOrPages: "45 pages",
  },
  {
    id: "ds-tool-1",
    title: "VisuAlgo: Visualizing Data Structures and Algorithms",
    description: "Interactive animated step-by-step visualizations for sorting, trees, hash tables, and graphs.",
    type: "link",
    url: "https://visualgo.net/en",
    subjectName: "Data Structures",
    topicName: "Visualizer",
    authorOrChannel: "National University of Singapore",
  },
  {
    id: "ds-cheat-1",
    title: "Big-O Algorithm Complexity Cheatsheet",
    description: "One-page quick reference chart for sorting, searching, and data structure operations.",
    type: "cheatsheet",
    url: "https://www.bigocheatsheet.com",
    subjectName: "Data Structures",
    topicName: "Arrays and linked lists",
    durationOrPages: "1 page",
  },

  // Database Systems
  {
    id: "db-yt-1",
    title: "Database Design and SQL Complete Course",
    description: "Relational database models, 1NF to BCNF normalization, indexing, and SQL queries.",
    type: "video",
    url: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
    subjectName: "Database Systems",
    topicName: "SQL and normalization",
    authorOrChannel: "freeCodeCamp.org",
    durationOrPages: "4h 20m",
  },
  {
    id: "db-notes-1",
    title: "Stanford DB Course Lecture Notes & Slides",
    description: "Formal theory on transactions, ACID properties, serializability, and concurrency control.",
    type: "notes",
    url: "https://web.stanford.edu/class/cs145/",
    subjectName: "Database Systems",
    topicName: "Transactions and recovery",
    authorOrChannel: "Stanford University",
    durationOrPages: "32 pages",
  },
  {
    id: "db-cheat-1",
    title: "SQL Queries & Joins Syntax Cheatsheet",
    description: "Quick visual guide for INNER JOIN, LEFT JOIN, Aggregations, GROUP BY, and Subqueries.",
    type: "cheatsheet",
    url: "https://sqlcheatsheet.com",
    subjectName: "Database Systems",
    topicName: "SQL and normalization",
    durationOrPages: "2 pages",
  },

  // Operating Systems
  {
    id: "os-yt-1",
    title: "Operating Systems Lecture Series",
    description: "Process synchronization, semaphores, deadlocks, paging, and virtual memory.",
    type: "video",
    url: "https://www.youtube.com/watch?v=2i2N_Qo_HQM",
    subjectName: "Operating Systems",
    topicName: "Processes and threads",
    authorOrChannel: "NPTEL / Gate Smashers",
    durationOrPages: "Full Playlist",
  },
  {
    id: "os-notes-1",
    title: "Operating Systems Three Easy Pieces (OSTEP)",
    description: "Free online textbook covering Virtualization, Concurrency, and Persistence.",
    type: "notes",
    url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    subjectName: "Operating Systems",
    topicName: "Memory management",
    authorOrChannel: "Remzi H. Arpaci-Dusseau",
    durationOrPages: "Book chapters",
  },
  {
    id: "os-cheat-1",
    title: "OS Scheduling Algorithms Cheatsheet",
    description: "Comparison of FCFS, SJF, Round Robin, Priority Scheduling, and Banker's Algorithm.",
    type: "cheatsheet",
    url: "https://en.wikipedia.org/wiki/Scheduling_(computing)",
    subjectName: "Operating Systems",
    topicName: "Processes and threads",
    durationOrPages: "Summary",
  },

  // Computer Networks
  {
    id: "cn-yt-1",
    title: "Computer Networking Full Course - OSI Model to TCP/IP",
    description: "In-depth exploration of OSI 7 layers, packet routing, DNS, HTTP, and handshakes.",
    type: "video",
    url: "https://www.youtube.com/watch?v=IPvYjXCsTg8",
    subjectName: "Computer Networks",
    topicName: "Network layers",
    authorOrChannel: "NetworkChuck",
    durationOrPages: "2h 30m",
  },
  {
    id: "cn-cheat-1",
    title: "TCP/IP Protocol Suite & Port Numbers Cheatsheet",
    description: "Standard port references (22, 53, 80, 443, etc.) and packet header anatomy.",
    type: "cheatsheet",
    url: "https://packetlife.net/library/cheat-sheets/",
    subjectName: "Computer Networks",
    topicName: "Transport protocols",
    durationOrPages: "1 page",
  },
];

