import { isPublicSiteOnly } from "@/lib/runtime-flags";

export const siteConfig = {
  name: "DevCanDoIt",
  owner: "Devin Otto",
  title: "AI Systems Consultant and Full-Stack Builder",
  email: "devinotto26@gmail.com",
  linkedinUrl: "https://www.linkedin.com/in/devinjotto/",
  githubUrl: "https://github.com/Devin-Otto",
  tiktokUrl: "https://www.tiktok.com/@beats.ai",
  instagramUrl: "https://www.instagram.com/beats.ai",
  youtubeUrl: "https://www.youtube.com/@beats.ai",
  resumePath: "/resume/Devin_Otto_Resume.pdf",
  videosPath: "/videos",
  leadFinderPath: "/leads",
  adminPath: "/admin",
  publicSiteOnly: isPublicSiteOnly,
  location: "Torrance, California",
  region: "Southern California",
  intro:
    "I build AI-powered internal tools and workflow systems that help teams replace messy handoffs, spreadsheets, and inbox triage with software they can actually run.",
  summary:
    "DevCanDoIt is the public-facing home for Devin Otto's portfolio, consulting offers, and selected systems for teams that need AI where it helps, clean interfaces, and dependable full-stack execution.",
  siteUrl: (() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (configured) {
      return configured;
    }

    if (process.env.NODE_ENV === "production") {
      console.warn("NEXT_PUBLIC_SITE_URL is not set. Falling back to the local dev URL.");
    }
    return "http://localhost:7261";
  })(),
  contactTag: process.env.CONTACT_TAG || "DEV_CANDO_IT_LEAD",
  primaryStack: ["React", "TypeScript", "Next.js", "Flask", "Gunicorn", "Node", "npm"],
  valuePillars: [
    "Internal tools for real business workflows",
    "Fast prototypes that still feel production-aware",
    "Operational thinking for retail, service, and internal tools"
  ]
} as const;

export const heroStats = [
  {
    label: "What I build",
    value: "Internal tools, workflow systems, and AI-assisted operations"
  },
  {
    label: "Best fit",
    value: "Teams replacing spreadsheets, email triage, and verbal handoffs"
  },
  {
    label: "How I work",
    value: "Quick discovery, sharp proof, practical implementation"
  }
];

export const services = [
  {
    title: "Agentic AI consulting",
    summary:
      "Map where AI agents can save time, where human review still matters, and what the safest rollout path looks like.",
    bullets: [
      "Workflow audits and opportunity mapping",
      "Tool selection for LLMs, retrieval, and agents",
      "Prompt, orchestration, and evaluation design"
    ]
  },
  {
    title: "Custom web apps",
    summary:
      "Design and build interfaces that make the underlying system usable by real people on real devices.",
    bullets: [
      "React and TypeScript frontends",
      "Flask and Node service integrations",
      "Role-based dashboards, intake flows, and internal ops tools"
    ]
  },
  {
    title: "Automation systems",
    summary:
      "Connect forms, inboxes, spreadsheets, APIs, and AI layers into one process your team can rely on.",
    bullets: [
      "Lead intake and qualification",
      "Inventory and operations workflows",
      "Internal copilots and task routing"
    ]
  }
];

export const industries = [
  {
    name: "Retail and storefront operations",
    fit: "Inventory visibility, SKU organization, reorder logic, and staff-friendly workflows.",
    why: "Best when staff need one source of truth for counts, receiving, and reorder visibility."
  },
  {
    name: "Service businesses",
    fit: "Quote, schedule, follow-up, and status tracking systems that cut down on dropped conversations.",
    why: "Best when response speed matters more than adding more headcount."
  },
  {
    name: "Founders and lean teams",
    fit: "MVPs, internal admin tools, and AI-assisted systems that help a small team move like a bigger one.",
    why: "Best when you need one partner who can think product, interface, and implementation."
  }
];

export const proofPoints = [
  {
    title: "Operational instinct",
    body:
      "I look for the friction people stop noticing: broken inventory counts, intake that disappears in the inbox, and repetitive questions that deserve a system instead of more manual effort."
  },
  {
    title: "Builder-to-strategy bridge",
    body:
      "You do not need separate people for the pitch deck, interface concept, and implementation logic. I can frame the opportunity, design the workflow, and build the thing."
  },
  {
    title: "Beyond source code",
    body:
      "The site is built to show the business case, workflow shape, and implementation details so prospects can evaluate more than a code repository."
  }
];

export const portfolioFilters = [
  "All",
  "Agentic AI",
  "Operations",
  "Web Apps",
  "Flask",
  "React/TS"
] as const;

export const projects = [
  {
    slug: "inventory-command-center",
    title: "Inventory Command Center",
    category: ["Operations", "Web Apps", "React/TS"],
    status: "Selected build",
    audience: "Retail stores, pop-ups, and local shops",
    summary:
      "A simple inventory system concept for stores that have product on shelves but not enough visibility in the back office.",
    problem:
      "Manual stock tracking creates waste, slow restocks, and awkward customer conversations when staff are guessing.",
    solution:
      "Build a dashboard for counts, low-stock alerts, purchase history, and quick receiving flows that work on phones and tablets.",
    impact:
      "Designed to cut down on guesswork, speed up receiving, and give staff a single place to see what is low, what arrived, and what needs attention.",
    stack: ["React", "TypeScript", "Inventory logic", "Admin dashboard"],
    cta: "Ask for a walkthrough"
  },
  {
    slug: "agentic-intake-triage",
    title: "Agentic Intake and Triage",
    category: ["Agentic AI", "Web Apps", "Flask"],
    status: "Consulting offer",
    audience: "Service teams, agencies, and lean operations groups",
    summary:
      "An AI-assisted intake layer that reads requests, extracts intent, routes next steps, and keeps humans in control.",
    problem:
      "Leads and requests often sit in inboxes too long because every message starts from a blank slate.",
    solution:
      "Use an agentic workflow to classify requests, draft responses, gather missing context, and create a clean queue for follow-through.",
    impact:
      "Designed to reduce blank-page triage and move requests into a structured queue faster while keeping human review in the loop.",
    stack: ["Flask", "Gunicorn", "LLM orchestration", "Human review checkpoints"],
    cta: "Scope this system"
  },
  {
    slug: "ops-copilot",
    title: "Internal Ops Copilot",
    category: ["Agentic AI", "Operations", "React/TS"],
    status: "Prototype path",
    audience: "Teams with SOPs, docs, and repeat internal questions",
    summary:
      "A lightweight internal assistant for answering process questions and guiding staff through repeat tasks.",
    problem:
      "Knowledge lives across documents, chat, and tribal memory, which makes onboarding slower than it should be.",
    solution:
      "Combine retrieval, prompts, and a focused interface so staff can ask for next steps, policy answers, and process guidance.",
    impact:
      "Built to shorten onboarding, lower repeated internal questions, and make process answers easier to find at the moment people need them.",
    stack: ["React", "TypeScript", "RAG patterns", "Workflow guidance UI"],
    cta: "Plan a prototype"
  }
];

export const appProjects = [
  {
    slug: "tileos",
    title: "TileOS",
    category: "Platform / Portfolio OS",
    summary:
      "A public-facing portfolio operating system where visitors can generate live app drafts, preview them in glass windows, and watch curated tiles graduate into the shared showcase.",
    goal:
      "Turn the portfolio into a live software environment instead of a static gallery, while keeping public drafts private until they are intentionally published.",
    stack: ["Node", "Preact", "Gemini", "File-backed persistence", "Sandboxed runtimes"],
    status: "Live public system",
    nextStep:
      "Keep improving generation quality, publish workflow polish, and the bridge between public visitor drafts and the curated showcase.",
    liveHref: "https://tileos.devcandoit.com"
  },
  {
    slug: "life-command-center",
    title: "Life Command Center",
    category: "Personal Analytics / Dashboard",
    summary: "A unified dashboard for tracking job search, health, routines, and relationship goals.",
    goal: "Turn scattered life metrics into one actionable decision interface.",
    stack: ["React", "Charts", "Firebase", "APIs"],
    status: "Strong concept",
    nextStep: "Convert into a clean demo dashboard with sample data."
  },
  {
    slug: "government-contracting-platform",
    title: "Government Contracting Platform",
    category: "GovTech / Contracting Platform",
    summary: "A platform that helps small businesses discover government contracting opportunities, organize requirements, and move from lead to submission.",
    goal: "Simplify opportunity matching, proposal tracking, and the steps needed to pursue contract work.",
    stack: ["React", "Next.js", "Retrieval", "Document parsing"],
    status: "Concept",
    nextStep: "Create a clickable prototype and one end-to-end contract pursuit flow."
  },
  {
    slug: "telemidi-connect",
    title: "TeleMIDI Connect",
    category: "Music Tech / Realtime Collaboration",
    summary: "A browser-based TeleMIDI beta for host-created sessions, remote control, WebMIDI output, keyboard scan, and live piano feedback.",
    goal: "Let remote players collaborate musically through a public-safe browser flow while the MIDI hardware stays on the host machine.",
    stack: ["Firebase", "WebMIDI", "React", "Realtime collaboration"],
    status: "Public beta",
    nextStep: "Refine session UX, add stronger observability, and expand mapped controls beyond the core host-and-remote path.",
    liveHref: "/telemidi-connect"
  },
  {
    slug: "trading-platform",
    title: "Trading Platform / Custom Charting System",
    category: "FinTech / Visualization",
    summary: "A custom live trading environment with crypto connectivity, responsive charting, and analysis tools.",
    goal: "Build a faster, more flexible alternative to standard charting platforms.",
    stack: ["React", "Charting", "WebGL", "APIs"],
    status: "Product vision",
    nextStep: "Build a minimal live chart demo with one distinctive tool."
  },
  {
    slug: "golden-spiral-trading-system",
    title: "Golden Spiral Harmonic Confluence Trading System",
    category: "Strategy System / Quant UX",
    summary: "A trading framework built around golden-ratio and fractal concepts, with chart-driven interaction.",
    goal: "Turn a custom market theory into a usable trading interface.",
    stack: ["Flask", "Python", "Charting", "Market data"],
    status: "Interface direction",
    nextStep: "Present it as a research-style product case study."
  },
  {
    slug: "solana-meme-coin-bot",
    title: "Solana Meme-Coin Automated Trading Bot",
    category: "Crypto Automation",
    summary: "An automated system for trading Solana meme coins using wallet integration and social-signal inputs.",
    goal: "Create a configurable, repeatable trading workflow.",
    stack: ["Python", "Node", "Wallet APIs", "Price feeds"],
    status: "Requirements defined",
    nextStep: "Frame as automation architecture, not profit claims."
  },
  {
    slug: "golden-ratio-music-hub",
    title: "Golden Ratio Music Hub",
    category: "Music AI / Composition Tool",
    summary: "A music-generation hub for chords, progressions, feel selection, and golden-ratio timing structures.",
    goal: "Help generate musically cohesive ideas using your theory framework.",
    stack: ["Web app", "Audio logic", "MIDI", "Theory engine"],
    status: "Core vision",
    nextStep: "Build the web MVP with progression generator and preview output."
  },
  {
    slug: "golden-grid-calculator",
    title: "Golden Grid Calculator",
    category: "Audio Utility / Max for Live",
    summary: "A precision timing calculator for golden-ratio-based rhythmic and tonal relationships.",
    goal: "Provide exact timing, delay, modulation, and pitch-reference utilities.",
    stack: ["Max for Live", "Ableton", "Calculation logic"],
    status: "Well specified",
    nextStep: "Create a demo device UI and short explainer video."
  },
  {
    slug: "python-audio-processing-gui",
    title: "Python Audio Processing GUI App",
    category: "Audio Software / DSP Interface",
    summary: "A live audio app with pitch, formant, envelope, echo, ADSR, and visualization controls.",
    goal: "Build a modular realtime vocal/audio transformation tool.",
    stack: ["Python", "PyQt", "Audio libraries", "Visualization"],
    status: "Architecture defined",
    nextStep: "Finish a stable prototype and capture a walkthrough."
  },
  {
    slug: "livestream-gaze-tracker",
    title: "Video Vision Tracker",
    category: "Computer Vision / Video Analysis",
    summary: "A video-based vision tracking tool that estimates whether a host is looking at a selected region.",
    goal: "Track visual attention toward a selected on-screen area from recorded or live video.",
    stack: ["Python", "PyQt", "OpenCV", "Video analysis"],
    status: "Detailed requirements",
    nextStep: "Turn into a concise case study with before/after frames."
  },
  {
    slug: "ottoottollc-tiktok-analytics",
    title: "OttoOttoLLC TikTok Discovery / Analytics Platform",
    category: "Creator Economy / Analytics",
    summary: "A platform to help creators be discovered, ranked, and analyzed.",
    goal: "Build a creator-facing ecosystem around discoverability and analytics.",
    stack: ["Web app", "Analytics backend", "Creator profiles"],
    status: "Vision established",
    nextStep: "Narrow to a searchable creator page plus one ranking feature."
  },
  {
    slug: "favor-trading-app",
    title: "Favor-Trading App",
    category: "Marketplace / Social Platform",
    summary: "A platform for exchanging favors, with user profiles, reviews, and completion counts.",
    goal: "Create trust and visibility around small-scale service exchange.",
    stack: ["Flask", "Auth", "Profiles", "Reviews"],
    status: "Core features defined",
    nextStep: "Build a small but complete end-to-end demo."
  },
  {
    slug: "microplastics-blood-cleaning",
    title: "Microplastics Blood-Cleaning System",
    category: "BiocleanTech / Medical Device Concept",
    summary: "A system using acoustophoresis to isolate microplastics from blood plasma in a dialysis-like loop.",
    goal: "Explore a novel therapeutic or filtration concept with major health relevance.",
    stack: ["Research brief", "System diagrams", "Simulation"],
    status: "Technical framing",
    nextStep: "Create a research brief with diagrams and assumptions."
  },
  {
    slug: "car-t-assembly-line",
    title: "Autologous CAR-T Assembly Line Company Concept",
    category: "Biotech / Venture Concept",
    summary: "A company concept for streamlining individualized CAR-T therapy using preserved stem cells and profiling.",
    goal: "Create a scalable, personalized cell-therapy pipeline.",
    stack: ["Venture deck", "Operations model", "Scientific workflows"],
    status: "Vision established",
    nextStep: "Build a founder-style thesis deck."
  },
  {
    slug: "conscious-chatbot",
    title: "Conscious Chatbot / Phi-Weighted Memory-Attention System",
    category: "AI Research / Agent Design",
    summary: "An agent architecture where attention and memory commitment are governed by a tunable cost-benefit rule.",
    goal: "Create more intentional, value-weighted learning and memory behavior in AI systems.",
    stack: ["Python", "Agent loops", "Memory scoring", "Visualization"],
    status: "High-level design",
    nextStep: "Write a formal architecture spec and prototype the loop."
  },
  {
    slug: "llm-training-visualizer",
    title: "LLM Training + Learning Visualizer Concept",
    category: "AI Tooling / MLOps",
    summary: "A system for training or distilling models from graded outputs, with a visualizer for learning progress.",
    goal: "Build a repeatable loop for evaluation-driven model improvement.",
    stack: ["Python", "Model pipelines", "Scoring framework", "Dashboard"],
    status: "Concept established",
    nextStep: "Turn the spec into a simplified proof of concept."
  },
  {
    slug: "vehicle-noise-canceling",
    title: "Vehicle Noise-Canceling Product",
    category: "Consumer Hardware Concept",
    summary: "A minimally invasive vehicle noise-canceling product with Spotify integration and easy installation.",
    goal: "Reduce vehicle noise without requiring a full custom-shop install.",
    stack: ["Product concept", "Industrial design", "App integration"],
    status: "Early concept",
    nextStep: "Create one page of requirements and hardware assumptions."
  },
  {
    slug: "plant-lifecycle-album",
    title: "Plant Lifecycle Concept Album",
    category: "Music / Worldbuilding",
    summary: "A concept album following the lifecycle of a plant from seed to seed using a bassy, holy, jazzy sound.",
    goal: "Merge narrative structure, production identity, and theory-driven design.",
    stack: ["Ableton", "Serum", "FabFilter", "Track mapping"],
    status: "Creative direction",
    nextStep: "Map the tracklist and finish one flagship single."
  },
  {
    slug: "interactive-game-world",
    title: "OurWorld Long Distance Dating App",
    category: "Interactive Design / Dating App",
    summary: "A long-distance dating app concept with shared spaces, rituals, and expressive connection features.",
    goal: "Create a meaningful long-distance relationship experience with a polished app feel.",
    stack: ["React", "Interactive UI", "Product design"],
    status: "Motifs established",
    nextStep: "Build one vertical-slice scene."
  },
  {
    slug: "job-search-automation",
    title: "Job Search Automation / Filtering System",
    category: "Productivity / Automation",
    summary: "A structured system for collecting remote roles, filtering for fit, and supporting autonomous search.",
    goal: "Turn job hunting into a repeatable, data-driven process.",
    stack: ["Search APIs", "Databases", "Filtering logic", "Scoring"],
    status: "Requirements discussed",
    nextStep: "Build a lightweight scoring dashboard."
  }
] as const;

export const consultingOffers = [
  {
    title: "AI Opportunity Sprint",
    length: "1 week",
    price: "Custom quote",
    summary:
      "A focused discovery sprint to identify where AI or automation can actually move the needle.",
    deliverables: [
      "Current-state workflow map",
      "Automation opportunities ranked by effort and value",
      "Recommended implementation path"
    ]
  },
  {
    title: "Prototype Build Partner",
    length: "2 to 4 weeks",
    price: "Custom quote",
    summary:
      "Turn a promising workflow into a polished prototype or internal tool your team can test.",
    deliverables: [
      "Working product slice",
      "Core UI and system wiring",
      "Feedback and next-step roadmap"
    ]
  },
  {
    title: "Fractional AI Systems Support",
    length: "Ongoing",
    price: "Monthly retainer",
    summary:
      "Keep improving prompts, workflows, interfaces, and operational systems as your business learns what works.",
    deliverables: [
      "Iteration across the stack",
      "System refinements and guardrails",
      "Advisory support for new use cases"
    ]
  }
];

export const pricingPlans = [
  {
    title: "Discovery Sprint",
    price: "Contact",
    priceDescription: "Custom quote",
    description:
      "A focused starting point for teams that need a clean read on workflow friction, AI fit, and the fastest path to proof.",
    features: [
      "Workflow audit and opportunity map",
      "Recommended product direction",
      "Clear next-step implementation outline",
    ],
    buttonText: "Start a conversation",
    imageSrc:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=320&auto=format&fit=crop",
    imageAlt: "Laptop on a desk with a clean workspace",
  },
  {
    title: "Prototype Build",
    price: "Contact",
    priceDescription: "Custom quote",
    description:
      "A hands-on build package for turning a promising system into a working interface or internal tool.",
    features: [
      "React / Next.js build",
      "Backend wiring and state management",
      "Feedback loop and iteration plan",
    ],
    buttonText: "Request a build",
    imageSrc:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=320&auto=format&fit=crop",
    imageAlt: "Developer working on a laptop near a monitor",
  },
  {
    title: "Ongoing Support",
    price: "Contact",
    priceDescription: "Retainer or hourly",
    description:
      "For teams that want an implementation partner to keep improving workflows, automations, and interfaces over time.",
    features: [
      "Iterative system improvements",
      "Operational support and guardrails",
      "New workflow rollout help",
    ],
    buttonText: "Plan support",
    imageSrc:
      "https://images.unsplash.com/photo-1527689368864-3a821dbccc34?q=80&w=320&auto=format&fit=crop",
    imageAlt: "Creative team planning around a table",
  },
] as const;

export const videoShowcase = [
  {
    slug: "skanka-full-res",
    title: "Skanka Full Res",
    summary: "My first ever stable diffusion synced music video, built as a full motion piece.",
    src: "/api/videos/skanka-full-res",
    fileName: "skanka full res.mov"
  },
  {
    slug: "download",
    title: "Download",
    summary: "A compact motion sample with a clean, direct visual rhythm.",
    src: "/api/videos/download",
    fileName: "download.mp4"
  },
  {
    slug: "bloopin",
    title: "Bloopin",
    summary: "A funky stable diffusion music video with a playful visual rhythm.",
    src: "/api/videos/bloopin",
    fileName: "Bloopin - Stable Diffusion (funky music video).mp4"
  },
  {
    slug: "daft-punk-infinity-repeating",
    title: "Daft Punk Infinity Repeating",
    summary: "An AI beats edit with a cinematic, high-contrast feel.",
    src: "/api/videos/daft-punk-infinity-repeating",
    fileName: "Daft Punk Infinity Repeating Music video ai beats.mp4"
  },
  {
    slug: "spotify-clip",
    title: "Spotify Clip",
    summary: "A short promotional edit with audio-forward pacing and clear framing.",
    src: "/api/videos/spotify-clip",
    fileName: "Spotify Clip .mp4"
  },
  {
    slug: "rezz-final-4k",
    title: "Rezz Final 4K",
    summary: "A higher-impact motion piece with darker contrast and more atmosphere.",
    src: "/api/videos/rezz-final-4k",
    fileName: "Rezz Final 4K.m4v"
  },
  {
    slug: "the-audacity",
    title: "The Audacity",
    summary: "A polished reel segment that reads well as a browser carousel hero.",
    src: "/api/videos/the-audacity",
    fileName: "The Audacity.m4v"
  },
  {
    slug: "369-collab",
    title: "369 Collab",
    summary: "A larger-form collab clip with a wider motion feel.",
    src: "/api/videos/369-collab",
    fileName: "369 Collab 1080 mp4.mp4"
  },
  {
    slug: "jix-fight-or-flight",
    title: "JIX Fight or Flight",
    summary: "A shorter social cut from the JIX set.",
    src: "/api/videos/jix-fight-or-flight",
    fileName: "JIX - Fight or Flight (insta).mov"
  },
  {
    slug: "jix-hunting-gathering",
    title: "JIX Hunting & Gathering",
    summary: "A social edit with a more kinetic pacing pattern.",
    src: "/api/videos/jix-hunting-gathering",
    fileName: "JIX - Hunting & Gathering (instagram).mp4"
  },
  {
    slug: "jix-swamp-tune",
    title: "JIX Swamp Tune",
    summary: "A moody Instagram cut from the JIX motion set.",
    src: "/api/videos/jix-swamp-tune",
    fileName: "JIX - Swamp Tune (Insta).mp4"
  },
  {
    slug: "jix-warthogs-den",
    title: "JIX The Warthog's Den",
    summary: "A darker social clip with a punchier visual cadence.",
    src: "/api/videos/jix-warthogs-den",
    fileName: "JIX - The Warthog's Den (Insta).mp4"
  },
  {
    slug: "the-reng-luck",
    title: "The Reng Luck",
    summary: "A narrative music-video cut with a polished finish.",
    src: "/api/videos/the-reng-luck",
    fileName: "The Reng - Luck (instagram)  (1).mp4"
  },
  {
    slug: "apo8-gcg5",
    title: "Apo8 Gcg5",
    summary: "A raw motion test file kept in the showcase for completeness.",
    src: "/api/videos/apo8-gcg5",
    fileName: "_apo8_gcg5.mov"
  },
  {
    slug: "collab-1-rough",
    title: "Collab 1 Rough",
    summary: "An earlier rough-cut collab video included in the archive.",
    src: "/api/videos/collab-1-rough",
    fileName: "collab 1 rough .m4v"
  },
  {
    slug: "goop-rough",
    title: "Goop Rough",
    summary: "A work-in-progress clip with timing notes still attached in the file name.",
    src: "/api/videos/goop-rough",
    fileName: "goop rough needs timing edits.mp4"
  },
  {
    slug: "jayawarp",
    title: "Jayawarp",
    summary: "A full HD motion piece with a strong stage-like presentation.",
    src: "/api/videos/jayawarp",
    fileName: "jayawarp 1920x1080.mp4"
  },
  {
    slug: "russ",
    title: "Russ",
    summary: "A compact motion clip kept in the full showcase carousel.",
    src: "/api/videos/russ",
    fileName: "russ.m4v"
  },
  {
    slug: "stable-diffusion-meme-video",
    title: "Stable Diffusion Meme Video",
    summary: "A playful stable diffusion clip with a meme-forward tone.",
    src: "/api/videos/stable-diffusion-meme-video",
    fileName: "stable diffusion meme video.mp4"
  }
] as const;

export const faqs = [
  {
    question: "What kinds of companies are the best fit?",
    answer:
      "Businesses with operational friction are the best fit: messy intake, confusing inventory, too many manual steps, or a team that knows a system should exist but has not had time to build it."
  },
  {
    question: "Do you only do AI work?",
    answer:
      "No. The strongest projects usually mix AI with solid product thinking, clean UX, and dependable full-stack implementation."
  },
  {
    question: "Can this also help with job applications?",
    answer:
      "Yes. The site is intentionally structured to show business framing, product instinct, and technical execution beyond a GitHub profile."
  }
];
