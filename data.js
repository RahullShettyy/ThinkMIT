/**
 * THINK MIT — data.js
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for every piece of text, date, list, link and media
 * URL shown on the website, plus registration rules.
 *
 * HOW IT WORKS (see PRD.md §6):
 *  - The website renders ONLY from this object (merged with admin overrides
 *    stored in the database). Never hard-code event text in components.
 *  - Edit a value here -> save -> the site updates (instantly in dev; on the
 *    next deploy in production).
 *  - Edit a value in the Admin panel -> it is stored in the DB and overrides
 *    the value here immediately, with no redeploy. "Reset to default" in the
 *    admin panel removes the override and falls back to this file.
 *  - Any "TBA" / null value is a placeholder the organiser must fill in.
 *
 * RULES FOR EDITING
 *  - Keep the top-level keys and nesting. You can freely change values and
 *    add/remove items inside arrays.
 *  - Dates are ISO strings: "2026-12-05T17:00:00+05:30" or null.
 */

const siteData = {
  /* ───────────────────────────── 1. BRAND / SEO ───────────────────────────── */
  site: {
    name: "THINK MIT",
    tagline: "THINK MIT Your Idea. Our Campus.",
    subTagline: "From Pitch to Implementation.",
    heroHeadline: ["Your Idea.", "Our Campus."], // each item = one line of the big H1
    description:
      "THINK MIT is a college-level innovation pitchfest where students identify campus problems and pitch practical solutions — with a pathway to mentorship, incubation, and campus implementation.",
    collegeShortName: "MITM",
    organisedBy: [
      "Department of CSE-Artificial Intelligence (AIDEON Club) — Host",
      "Institution's Innovation Council (IIC), MITM",
      "Entrepreneurship and Development Cell (EDC), MITM",
      "Center for Innovation and Entrepreneurship (CIE)",
    ],
    inAssociationWith: "Department of Computer Science and Engineering – Artificial Intelligence (CSE–AI)",
    logoUrl: "/logos/mit-mysore-logo.jpg",
    faviconEmoji: "💡",
    seoTitle: "THINK MIT — Your Idea. Our Campus.",
  },

  /* ─────────────────────────────── 2. NAVIGATION ──────────────────────────── */
  nav: {
    links: [
      { label: "About", href: "/#about" },
      { label: "Journey", href: "/#journey" },
      { label: "Domains", href: "/#domains" },
      { label: "Guidelines", href: "/#guidelines" },
      { label: "Contact", href: "/#contact" },
    ],
    ctaLabel: "Register Team",
    ctaHref: "/register",
    mobileExtraLabel: "Register your team",
  },

  /* ───────────────────────────── 3. REGISTRATION RULES ─────────────────────── */
  registration: {
    isOpen: true, // master switch. false => form hidden, closedMessage shown
    opensOn: null, // ISO date or null
    deadline: null, // ISO date or null. After this, registration closes automatically
    closedMessage: "Registrations are closed. Thank you for your interest in THINK MIT!",
    notYetOpenMessage: "Registrations will open soon. Stay tuned!",
    teamSize: 3, // fixed by the event design; do not change without a DB migration
    maxTeams: null, // null = unlimited
    regIdPrefix: "TMIT", // generates TMIT-0001, TMIT-0002 ...
    successTitle: "You're in! Registration received.",
    successMessage:
      "Your team and idea have been submitted. Screening results will be announced later. Keep your Registration ID safe.",
    whatsappGroupUrl:
      "https://chat.whatsapp.com/JrRCX2alfSp5WqYGNBgxuD?s=cl&p=a&iam=2",
    consentText:
      "I confirm that all details are accurate, the idea is original, and all three team members agree to follow the event guidelines.",
    validation: {
      // Change these without touching code. Applied on client AND server.
      usnRegex: "^[A-Za-z0-9]{10}$", // 10 alphanumeric chars (VTU style). Tighten later if needed
      phoneRegex: "^[6-9][0-9]{9}$", // Indian 10-digit mobile
      emailDomainAllowList: [], // e.g. ["mitmysore.in"] ; empty = any email
      teamNameMin: 3,
      teamNameMax: 40,
    },
    // Limits for the idea text areas (characters)
    ideaLimits: {
      titleMax: 80,
      problemMax: 800,
      solutionMax: 1200,
      uniquenessMax: 600,
      impactMax: 800,
    },
  },

  /* ─────────────────────── 4. FORM LABELS (what students see) ───────────────── */
  form: {
    steps: [
      { key: "team", title: "Team & Domain" },
      { key: "members", title: "Team Members" },
      { key: "idea", title: "Your Idea" },
      { key: "review", title: "Review & Submit" },
    ],
    team: {
      teamName: { label: "Team Name", placeholder: "e.g. Campus Innovators", required: true },
      track: {
        label: "Domain of Interest",
        help: "Choose the domain your idea addresses. Exactly 5 domains are available.",
        required: true,
      },
    },
    // Applies to Member 1 (Team Leader), Member 2 and Member 3
    member: {
      name: { label: "Full Name", placeholder: "As per college records", required: true },
      usn: { label: "USN", placeholder: "e.g. 4MH23CS001", required: true },
      email: { label: "Email ID", placeholder: "name@example.com", required: true },
      phone: { label: "Contact Number", placeholder: "10-digit mobile number", required: true },
      role: {
        label: "Presentation Role",
        help: "Each member presents one distinct category: Business, Innovation, or Technical.",
        required: true,
      },
      // Extra fields not in the original list but useful for checking eligibility.
      // Set enabled:false to hide them (they are then stored as empty).
      programme: { enabled: true, label: "Programme", required: true },
      year: { enabled: true, label: "Year / Semester", placeholder: "e.g. 3rd Year", required: true },
      department: { enabled: true, label: "Department", placeholder: "e.g. CSE-AI", required: true },
    },
    memberTitles: ["Team Leader (Member 1)", "Member 2", "Member 3"],
    programmeOptions: ["UG – 1st Year", "UG – 2nd Year", "UG – 3rd Year", "UG – 4th Year", "MBA", "MCA", "M.Tech"],
    idea: {
      title: { label: "Idea Title", placeholder: "A short, catchy name for your idea", required: true },
      problem: {
        label: "Problem Statement",
        placeholder: "What campus problem are you solving? Who faces it?",
        required: true,
      },
      solution: {
        label: "Proposed Solution",
        placeholder: "How will your idea solve it?",
        required: true,
      },
      uniqueness: {
        label: "Innovation & Uniqueness",
        placeholder: "What makes your idea different?",
        required: true,
      },
      impact: {
        label: "Expected Impact & Implementation",
        placeholder: "Who benefits, and how could it be implemented on campus?",
        required: true,
      },
      referenceLink: {
        label: "Supporting Link (optional)",
        placeholder: "Google Drive / Figma / YouTube link, if any",
        required: false,
      },
    },
  },

  /* ─────────────────────────── 5. THREE ROLES / STREAMS ─────────────────────── */
  // key is stored in the DB; label/description are display-only and editable.
  roles: [
    {
      key: "business",
      label: "Business Lead",
      defaultMemberPosition: 1,
      summary: "The need, budget, feasibility and plan to implement the idea on campus.",
      responsibilities: [
        "Explains the campus need, budget, and implementation feasibility",
        "Presents the plan to implement and sustain the solution on campus",
      ],
      training: null,
    },
    {
      key: "innovation",
      label: "Innovation Lead",
      defaultMemberPosition: 2,
      summary: "What is new in the idea and the difference it makes to existing products/solutions in the real world.",
      responsibilities: [
        "Presents the core problem and explains what makes the solution unique",
        "Defends the uniqueness and advantages over existing alternatives",
      ],
      training: null,
    },
    {
      key: "technical",
      label: "Technical Lead",
      defaultMemberPosition: 3,
      summary: "How to build or make a solution functional through technology.",
      responsibilities: [
        "Explains how to build and make the solution functional through technology",
        "Covers technical architecture, requirements, and functional execution",
      ],
      training: null,
    },
  ],

  /* ─────────────────────────────── 6. FIVE DOMAINS ──────────────────────────── */
  tracks: [
    {
      key: "waste-to-wealth",
      name: "1. Waste to Wealth",
      description: "Managing and reusing campus waste to keep the campus clean and cut costs.",
      focus: "Food, e-waste, medical, chemical, paper and plastic waste.",
      room: null,
    },
    {
      key: "smart-campus",
      name: "2. Smart Campus",
      description: "Digital and smart solutions for everyday campus services.",
      focus: "Queues, attendance, complaints, timetables and bus information.",
      room: null,
    },
    {
      key: "future-tech",
      name: "3. Future Tech",
      description: "Frontier technology: AI, IoT, drones, robotics, space technology and security.",
      focus: "AI, IoT, drones, robotics, space technology and security solutions for the campus and beyond.",
      room: null,
    },
    {
      key: "green-energy-water",
      name: "4. Green Energy and Water",
      description: "Saving and generating energy and water for a sustainable campus.",
      focus: "Solar power, energy usage and leak monitoring, and rainwater harvesting.",
      room: null,
    },
    {
      key: "care-and-safety",
      name: "5. Care and Safety",
      description: "Safety, health, hygiene and inclusion across campus.",
      focus: "Lab and fire safety, first aid, emergency alerts, hygiene and inclusion.",
      room: null,
    },
  ],
  tracksIntro:
    "Each domain is one track. Every idea must be useful to the MITM campus, easily scalable within it, and mainly limited to the upgrowth of MITM.",

  /* ───────────────────────────────── 7. HERO ───────────────────────────────── */
  hero: {
    subtitle: "Pitch a campus problem. Build the solution. Bring real campus innovation to life.",
    primaryCta: { label: "Register Your Team", href: "/register" },
    secondaryCta: { label: "Read Guidelines", href: "/#guidelines" },
    // Glass "studio" panel (decorative live demo of a pitch)
    panel: {
      chatTitle: "Campus Pitch Preview",
      messages: [
        { type: "bubble", text: "Our canteen has huge queues during breaks. Can we fix that?" },
        {
          type: "ai",
          text:
            "Great problem to pick. Define who is affected, how your solution works, and what it would take to implement it on campus.",
        },
        { type: "bubble", text: "A pre-order app with timed pickup slots." },
        {
          type: "ai",
          text:
            "Strong start. Your Business, Innovation and Technical leads each shape one part of the pitch — that's how THINK MIT turns ideas into impact.",
        },
      ],
      blueprintLabel: "YOUR IDEA",
      blueprintTitle: "Smart Canteen Queue",
      sliderLabel: "Feasibility",
      sliderValue: 84, // percent
      rightTitle: "Pitch Preview",
      rightImageAlt: "A student presenting an idea",
    },
  },

  /* ───────────────────────────── 8. ABOUT (bento cards) ─────────────────────── */
  about: {
    eyebrow: "About THINK MIT",
    headingLine1: "Campus Problems Solved by",
    headingLine2: "Students, Built for MITM",
    lead:
      "THINK MIT is a campus innovation challenge for the students of MITM. Students propose solutions to real problems in and around the MITM campus. The best ideas are pitched before a jury and rewarded through implementation.",
    vision:
      "To create a platform where students don't just think of solutions but get an opportunity to transform their ideas into reality within their own campus.",
    objectives: [
      "Find ideas that are easy to scale within the campus and facilitate a better environment in MITM.",
      "Promote innovation, practical problem-solving, entrepreneurship, and interdisciplinary teamwork.",
      "Identify promising student projects for institutional adoption, piloting, mentorship, and CIE incubation.",
    ],
    cards: {
      big: {
        title: "Your Idea.",
        titleSoft: "Our Campus.",
        desc: "Spot a real problem on campus, pitch your solution, and see it come to life.",
        footnote: "Host: CSE-AI (AIDEON Club) · Supporting: IIC · EDC · CIE",
        ctaLabel: "Register now",
      },
      eligibility: {
        title: "Who Can Participate",
        text: "Students of 1st, 2nd, 3rd and 4th year UG programmes, plus MBA, MCA, and M.Tech, at MITM. Interdisciplinary teams across departments and years are allowed. Teams of exactly three.",
      },
      training: {
        title: "Five Parallel Tracks",
        text: "50 shortlisted teams pitch across 5 venues before expert juries on Day 1.",
        count: 5, // big number in the gauge
        countSuffix: " Tracks",
        endsLeft: "50 Teams",
        endsRight: "5 Venues",
      },
      roles: {
        title: "Three Roles, One Team",
        text: "Business, Innovation and Technical leads — each presenting one category of the pitch.",
      },
      funding: {
        title: "Mentorship & Implementation",
        text: "Mentorship from IIC, EDC and CIE with pathway to pilot winning solutions on campus.",
        chip: "Implementation pathway",
      },
    },
  },

  /* ───────────────────────────── 9. JOURNEY (timeline) ──────────────────────── */
  journey: {
    eyebrow: "The Journey",
    headingLine1: "From Idea Submission to",
    headingLine2: "Campus Implementation",
    lead: "Five clear stages take your idea from submission to real-world implementation at MITM.",
    stages: [
      { n: 1, title: "Registration & Idea Submission", text: "Register your team of three and submit your campus problem statement and idea.", date: null },
      { n: 2, title: "Screening & Shortlisting", text: "10 teams selected per domain — 50 teams (about 150 students) qualify for the Pitchfest.", date: null },
      { n: 3, title: "Day 1: Pitchfest (08-12-2026)", text: "Five tracks run in parallel at five venues. 10 min pitch + 3 min Q&A before a 3-member jury.", date: "2026-12-08T09:00:00+05:30" },
      { n: 4, title: "Day 2: Valedictory (09-12-2026)", text: "Top 10 finalists, prize distribution, winning certificates, mementos and special guests.", date: "2026-12-09T10:00:00+05:30" },
      { n: 5, title: "Implementation & Incubation", text: "Mentorship from IIC and EDC with incubation guidance from CIE to pilot solutions on campus.", date: null },
    ],
    centerImageAlt: "Students collaborating on campus innovation",
    funding: {
      heading: "What happens after selection?",
      subheading: "Your Idea. Our Support. Real Impact.",
      note: "Implementation and campus adoption are subject to institutional review and approval.",
      steps: [
        { title: "Mentorship & Guidance", text: "Hands-on mentorship from IIC, EDC and faculty experts to refine the solution." },
        { title: "Incubation Support", text: "Incubation guidance from the Center for Innovation and Entrepreneurship (CIE) to develop startup basics." },
        { title: "Campus Pilot", text: "Opportunity to pilot, test and adopt the solution directly within the MITM campus environment." },
        { title: "Institutional Adoption", text: "Opportunities for institutional deployment and measurable improvements across campus facilities." },
      ],
    },
  },

  /* ───────────────────────────────── 10. PROMO VIDEO ─────────────────────────── */
  promoVideo: {
    enabled: true, // false hides the whole section
    eyebrow: "Watch",
    heading: "THINK MIT in 60 seconds",
    caption: "Everything you need to know about the event.",
    comingSoonText: "Promo video coming soon",
    // HOW TO ADD THE VIDEO LATER (any one):
    //  1) Admin panel -> Promo Video -> upload an .mp4 / .webm  (stored in DB storage, URL filled automatically)
    //  2) Admin panel -> paste a YouTube / Vimeo / direct .mp4 link
    //  3) Edit here: set type + url
    type: "none", // "none" | "file" | "youtube" | "vimeo"
    url: "", // direct .mp4/.webm URL, or full YouTube/Vimeo link
    poster: "", // optional thumbnail image URL
  },

  /* ─────────────────────────────── 11. GUIDELINES ───────────────────────────── */
  // Rendered as an accordion on the home page. Section numbers are auto-generated from order.
  // "embed" inserts a ready-made block: "roles" | "tracks" | "evaluation" | "funding" | "contact"
  guidelines: {
    eyebrow: "Guidelines",
    heading: "Everything you need to know",
    lead: "Official rules, schedule, tracks, team structure, evaluation criteria, and event details.",
    sections: [
      {
        key: "about",
        title: "About the Event & Organizing Bodies",
        subtitle: "Host department, supporting units and event aim",
        blocks: [
          {
            heading: "Organizing Bodies",
            items: [
              "Host Department: Department of CSE-Artificial Intelligence (AIDEON Club)",
              "Supporting Unit: Institution's Innovation Council (IIC), MITM",
              "Supporting Unit: Entrepreneurship and Development Cell (EDC), MITM",
              "Supporting Unit: Center for Innovation and Entrepreneurship (CIE)",
            ],
          },
          {
            heading: "About the Event",
            items: [
              "THINK MIT is a campus innovation challenge for the students of MITM.",
              "Students propose solutions to real problems in and around the MITM campus.",
              "The best ideas are pitched before a jury and rewarded through implementation.",
              "The aim is to find ideas that are easy to scale within the campus and facilitate a better environment in MITM Campus.",
            ],
          },
        ],
      },
      {
        key: "dates",
        title: "Event Dates & Schedule",
        subtitle: "Day 1 Pitchfest (08-12-2026) and Day 2 Valedictory (09-12-2026)",
        blocks: [
          {
            heading: "Day 1: Pitchfest — 08-12-2026 (Tuesday)",
            items: [
              "Timing: 9:00 AM to 4:00 PM",
              "Format: Offline pitching across 5 parallel track venues, evaluation, and final Q&A.",
              "Track Rounds: 10 teams per track across five venues. Duration: 10 min presentation + 3 min Q&A per team.",
              "Refreshments: Tea and biscuits will be provided for all participants.",
            ],
          },
          {
            heading: "Day 2: Valedictory Event — 09-12-2026 (Wednesday)",
            items: [
              "Valedictory Ceremony: Prize distribution, special guests, mementos, winning certificates, prize money, and post-event benefits.",
              "Timing: To be fixed.",
            ],
          },
        ],
      },
      {
        key: "domains",
        title: "Five Domains (Tracks)",
        subtitle: "Every idea must be useful to the MITM campus and easily scalable",
        embed: "tracks",
        blocks: [
          {
            heading: "Domain Focus & Requirements",
            items: [
              "Each domain operates as one track during the Day 1 Pitchfest.",
              "Every idea must be useful to the MITM campus, easily scalable within it, and mainly limited to the upgrowth of MITM.",
              "10 teams are selected per track, giving 50 teams (about 150 students) taking part in the offline Pitchfest.",
              "Top 2 teams from each track qualify for the finals, giving 10 teams in total.",
            ],
          },
        ],
      },
      {
        key: "team",
        title: "Team Structure & Presentation Roles",
        subtitle: "Three members presenting Business, Technical, and Innovation",
        embed: "roles",
        blocks: [
          {
            heading: "Presentation Categories",
            items: [
              "Business Lead: The need, budget, feasibility and plan to implement the idea on campus.",
              "Technical Lead: How to build or make a solution functional through technology.",
              "Innovation Lead: What is new in the idea and the difference it makes to existing products/solutions in the real world.",
              "All three members must actively take part and present their designated category.",
            ],
          },
        ],
      },
      {
        key: "participation",
        title: "Participation & Eligibility",
        subtitle: "Eligibility requirements and idea submission rules",
        blocks: [
          {
            heading: "Eligibility",
            items: [
              "Students currently studying in 1st, 2nd, 3rd, and 4th year of undergraduate (UG) programmes at MITM are eligible.",
              "Students pursuing MBA, MCA, and M.Tech programmes are also eligible.",
              "Participation must be in teams of exactly three members.",
              "Interdisciplinary and cross-department teams across all UG, MBA, MCA, and M.Tech programmes are allowed and strongly encouraged.",
            ],
          },
          {
            heading: "Idea Submission Rules",
            items: [
              "Ideas should address a genuine problem within or around the MITM campus.",
              "Solutions should be innovative, practical, low-cost, and focused on campus upgrowth.",
              "Plagiarism and copied ideas are strictly prohibited. Original thinking is required.",
              "Each team may submit only one idea.",
              "Be prepared to explain and defend your submitted idea during the Day 1 Pitchfest.",
            ],
          },
        ],
      },
      {
        key: "selection",
        title: "Selection Process & Evaluation Parameters",
        subtitle: "Judging criteria, jury panel and scoring",
        embed: "evaluation",
        blocks: [
          {
            heading: "Selection Workflow",
            items: [
              "Registration and Screening: 10 teams are selected for each track (50 teams / ~150 students total).",
              "Track Round (08-12-2026): Five tracks run in parallel at five venues. Each track has 10 teams and a jury of 3 members.",
              "Pitch Duration: 10 minutes per team, 3 minutes for Q&A.",
              "Finalists: The best 2 teams from each track qualify, giving 10 finalist teams in total.",
              "Top 3 Teams: Winner (1st), Runner-up (2nd), and Second Runner-up (3rd).",
              "Jury Panel: Headed by IIC Head Prof. Kishan G S. Three members for each track, 15 jury members in total.",
            ],
          },
          {
            heading: "Evaluation Parameters",
            items: [
              "Relevance and Problem Validation (addressing real MITM campus challenges)",
              "Feasibility and Technical Viability",
              "Impact and Campus Benefits",
              "Implementation Plan and Costing",
              "Presentation Quality and Q&A Defense",
            ],
          },
        ],
      },
      {
        key: "venues",
        title: "Venues, Prizes & Proposed Benefits",
        subtitle: "Five event venues on 08-12-2026 and awards",
        blocks: [
          {
            heading: "Five Venues (08-12-2026)",
            items: [
              "Samalochana Hall: Track [to be allotted] (Jury: 3 members)",
              "Parihara Hall: Track [to be allotted] (Jury: 3 members)",
              "Anveshana Hall: Track [to be allotted] (Jury: 3 members)",
              "Venue 4: [to be confirmed] (Jury: 3 members)",
              "Venue 5: [to be confirmed] (Jury: 3 members)",
            ],
          },
          {
            heading: "Prizes & Recognition",
            items: [
              "Prize Money (to be finalized): Winner ₹[ ], Runner-up ₹[ ], Second Runner-up ₹[ ]",
              "Winning certificates and mementos presented on Day 2 Valedictory.",
              "Encouragement to take up the project as an official mini/major academic project.",
            ],
          },
          {
            heading: "Other Proposed Benefits",
            items: [
              "Mentorship from IIC (Institution's Innovation Council) and EDC (Entrepreneurship and Development Cell).",
              "Incubation guidance from CIE (Center for Innovation and Entrepreneurship) to grow ideas into startups.",
              "Support to take winning ideas forward for adoption and implementation on the MITM campus, subject to approval.",
            ],
          },
        ],
      },
      {
        key: "benefits",
        title: "Expected Benefits to MITM",
        subtitle: "Institutional impact, campus savings and student development",
        blocks: [
          {
            heading: "Value to Campus & Students",
            items: [
              "Practical, low-cost ideas to improve waste handling, campus services, technology, energy and water use, and safety.",
              "Real problem-solving experience, pitching skills for about 150 students, with certificates and encouragement for mini/major projects on the same topic.",
              "Student projects that the college can adopt, pilot on campus and showcase.",
              "Possible savings on power, water and waste handling, and a safer, smoother campus.",
              "A stronger innovation and entrepreneurship culture, supporting the initiatives of IIC, EDC and CIE.",
              "Mentoring, startup-basics sessions and incubation guidance for the best teams to grow their ideas into startups.",
              "Connections with alumni, local entrepreneurs and incubators for young innovators.",
              "Better visibility for the college and its departments.",
            ],
          },
        ],
      },
      {
        key: "contact",
        title: "Contact & Support",
        subtitle: "Event coordinators and faculty leadership",
        embed: "contact",
        blocks: [],
      },
    ],
  },

  /* ────────────────────────────── 12. EVALUATION CRITERIA ───────────────────── */
  evaluation: {
    intro: "Teams are assessed on relevance to campus needs, feasibility, potential impact and implementation considerations.",
    criteria: [
      { name: "Relevance & Problem Validation", description: "Addressing genuine MITM campus needs and depth of problem validation" },
      { name: "Feasibility", description: "Practical possibility of technical and operational execution" },
      { name: "Impact", description: "Potential benefits, savings, or safety improvements for the MITM campus" },
      { name: "Implementation Plan", description: "Clear budget, realistic rollout strategy, and campus adoption plan" },
      { name: "Presentation & Q&A Defense", description: "Clarity, teamwork across 3 roles, and confidence under jury questioning" },
    ],
  },

  /* ──────────────────────────── 13. SELECTED TEAMS ANNOUNCEMENT ─────────────── */
  // Admin flips "published" to true to show the selected teams publicly. Hidden until then.
  announcements: {
    published: false,
    eyebrow: "Announcement",
    heading: "Selected Teams",
    intro: "Congratulations to the teams shortlisted for the THINK MIT Pitchfest!",
    showIdeaTitle: true,
    showTrack: true,
  },

  /* ─────────────────────────────────── 14. CONTACT ──────────────────────────── */
  contact: {
    eyebrow: "Contact Us",
    heading: "Questions? Reach out.",
    intro: "For support, queries and event coordination, feel free to reach out to us.",
    people: [
      { role: "HOD", name: "Dr. Hemanth S. R.", designation: "HOD, Department of CSE-AI" },
      { role: "SWO", name: "Prof. Kishan G S", designation: "SWO MITM" },
    ],
    coordinators: [
      { name: "Shreya M", role: "Event Coordinator", phone: "9480168828" },
      { name: "S. Aishwarya", role: "Event Coordinator", phone: "7795454354" },
    ],
    email: null, // e.g. "thinkmit@college.edu"; null hides it
    department: "Department of CSE-AI",
  },

  /* ─────────────────────────────────── 15. CTA BAND ─────────────────────────── */
  cta: {
    headingLine1: "Pitch",
    headingLine2: "Your Idea",
    text: "Form a team of three, submit your campus idea, and take it from pitch to implementation.",
    buttonLabel: "Register Your Team",
    buttonHref: "/register",
  },

  /* ─────────────────────────────────── 16. FOOTER ───────────────────────────── */
  footer: {
    aboutText: "THINK MIT is an IIC and EDC initiative with the Department of CSE–AI.",
    columns: [
      {
        title: "Event",
        links: [
          { label: "About", href: "/#about" },
          { label: "Journey", href: "/#journey" },
          { label: "Domains", href: "/#domains" },
          { label: "Guidelines", href: "/#guidelines" },
          { label: "Register", href: "/register" },
        ],
      },
      {
        title: "Organisers",
        links: [
          { label: "CSE–AI (AIDEON)", href: "https://www.linkedin.com/company/cse-ai-mitm/posts/?viewAsMember=true" },
          { label: "IIC MITM", href: "#" },
          { label: "EDC MITM", href: "#" },
          { label: "CIE", href: "#" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Contact", href: "/#contact" },
          { label: "Guidelines", href: "/#guidelines" },
        ],
      },
    ],
    socials: { facebook: "", x: "", youtube: "", instagram: "" }, // empty = icon hidden
    legalLeft: "Privacy notice",
    legalCenter: "© THINK MIT 2026",
    legalRight: "Usage policy",
  },

  /* ──────────────────────────────── 17. MEDIA ASSETS ────────────────────────── */
  // Defaults below are the design template's CloudFront placeholders. REPLACE with
  // your own event images/videos (paste URLs or upload via Admin -> Media).
  media: {
    heroVideo: null,
    heroPoster: "/images/maharaja-institute-campus-panorama.png",
    heroPanelImage: "/logos/funding-implementation-logo.jpg",
    aboutVideo: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261022_054543_65a4e3d3-ce77-45a9-8917-60ce35999ea7.mp4",
    aboutPoster: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093819_8ee49f04-c4b4-4be9-9788-e5f7030697ce.png",
    promoPoster: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093819_8ee49f04-c4b4-4be9-9788-e5f7030697ce.png",
    aboutBigCard: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093820_27269365-10b0-493c-aaeb-f491968d728e.png",
    aboutCollageA: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093821_f31363e6-8c86-4044-ae68-234c89bfd631.png",
    aboutCollageB: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093820_271e56c9-4dd2-4893-ac2d-2ef620eb354e.png",
    aboutFundingImage: "/logos/funding-implementation-logo.jpg",
    journeyCenterImage: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093819_09809dd7-6a23-494d-ba2d-1b3181a9dee0.png",
    journeySideImages: [
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093820_27269365-10b0-493c-aaeb-f491968d728e.png",
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093821_f31363e6-8c86-4044-ae68-234c89bfd631.png",
      "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261021_093820_271e56c9-4dd2-4893-ac2d-2ef620eb354e.png",
    ],
    ctaVideo: null,
    ctaPoster: "/images/maharaja-institute-campus-panorama.png",
  },
};

export default siteData;
