export const projects = [
  {
    slug: "starx-live",
    name: "StarX Live — Official Website",
    short: "StarX Live",
    category: "Interactive Website / Entertainment",
    kind: "Websites",
    url: "https://starx-live-official.vercel.app/",
    image: "/media/starx.webp",
    mobile: "/media/starx-mobile.webp",
    color: "#9c233b",
    headline: "A live identity. A considered digital stage.",
    summary:
      "An entertainment website connecting artists, performances and enquiries.",
    story:
      "A rich collection of band content is organized around clear navigation. Artist profiles, performance media and contact pathways offer several useful ways to explore.",
    features: [
      "Artist profiles and crew information",
      "Performance and media sections",
      "Events and contact navigation",
    ],
    note: "Public pages inspected. Booking fulfilment was not tested. The live crew page identifies Sanjay as Digital Media & Creative Director, managing the website and digital presence.",
    published: true,
    order: 1,
  },
  {
    slug: "ticketx",
    name: "TicketX",
    short: "TicketX",
    category: "Booking Platform / Web Application",
    kind: "Applications",
    url: "https://ticket-x-theta.vercel.app/",
    image: "/media/ticketx.webp",
    mobile: "/media/ticketx-mobile.webp",
    color: "#b23e32",
    headline: "From discovery to the next show.",
    summary:
      "Cinema and event discovery organized around locations, listings and showtimes.",
    story:
      "Movie listings, theatre directories, language browsing and event discovery connect to showtime and account entry points in a single public interface.",
    features: [
      "Movie and language discovery",
      "Theatre and event listings",
      "Showtime links and account entry",
    ],
    note: "Public interfaces inspected. Payment, seat fulfilment and authenticated booking records were not tested.",
    published: true,
    order: 2,
  },
  {
    slug: "starx-connect",
    name: "StarX Connect — Digital Card",
    short: "StarX Connect",
    category: "Digital Business Card / Smart Links",
    kind: "Digital experiences",
    url: "https://connect-starx.vercel.app/",
    image: "/media/connect.webp",
    mobile: "/media/connect-mobile.webp",
    color: "#315768",
    headline: "One link. Every important connection.",
    summary:
      "A compact branded contact experience for official channels and direct actions.",
    story:
      "The digital card collects the official website and social channels alongside call, email, WhatsApp, location and save-contact controls. Its focused presentation demonstrates the value of one shareable destination.",
    features: [
      "Official social and website links",
      "Call, email and contact-saving controls",
      "Page-sharing and QR-code controls",
    ],
    note: "Visible controls inspected. External messages were not sent.",
    published: true,
    order: 3,
  },
  {
    slug: "audiox",
    name: "AudioX",
    short: "AudioX",
    category: "Web Application / Media Utility",
    kind: "Applications",
    url: "https://audiox-by-spideyy.vercel.app/",
    image: "/media/audiox.webp",
    mobile: "/media/audiox-mobile.webp",
    color: "#505184",
    headline: "Utility, with a clear point of focus.",
    summary:
      "An audio utility interface with focused input and dedicated queue and download areas.",
    story:
      "AudioX presents a media URL analysis workflow for content the visitor owns or is permitted to download. Its primary action is separated from queue, download and settings navigation.",
    features: [
      "Media URL input and Analyze action",
      "Queue and Downloads navigation",
      "Settings and readiness status",
    ],
    note: "Interface inspected. Conversion and completed downloads were not tested.",
    published: true,
    order: 4,
  },
  {
    slug: "yuva-shakti",
    name: "Yuva Shakti Youth Satulur — Lucky Draw",
    short: "Yuva Shakti",
    category: "Community Event / Interactive Website",
    kind: "Digital experiences",
    url: "https://yuva-shakti-youth-satulur-lucky-dra.vercel.app/",
    image: "/media/yuva.webp",
    mobile: "/media/yuva-mobile.webp",
    color: "#956d2d",
    headline: "A community event, clearly connected.",
    summary:
      "Event information, participant details and coupon-verification entry points.",
    story:
      "The public experience brings event information, a quantity selector, participant form, pass preview and coupon lookup into a guided page. This case study focuses on interface design and information architecture.",
    features: [
      "Event and prize information",
      "Quantity selection and pass preview",
      "Coupon verification and support entry points",
    ],
    note: "Public interface inspected only. Purchases, payment verification and draw outcomes were not tested or endorsed.",
    published: true,
    order: 5,
  },
];
export const services = [
  {
    name: "Business websites",
    description:
      "A credible digital home built around your offer, your audience and a clear next step.",
    items: "Content structure, responsive development, enquiry pathways",
  },
  {
    name: "E-commerce solutions",
    description:
      "Make discovery intuitive and give every product room to tell its story.",
    items: "Product browsing, storefront design, checkout integration",
  },
  {
    name: "UI/UX design",
    description:
      "Turn complex requirements into interfaces that feel clear and natural.",
    items: "User journeys, wireframes, visual systems",
  },
  {
    name: "Custom web applications",
    description:
      "Purpose-built tools for the way your business actually works.",
    items: "Application interfaces, secure APIs, workflow development",
  },
  {
    name: "Interactive experiences",
    description:
      "Thoughtful motion and memorable interactions with a practical purpose.",
    items: "Interactive showcases, digital cards, selective 3D",
  },
  {
    name: "Redesign & optimization",
    description:
      "Bring clarity, consistency and better usability to an existing website.",
    items: "Experience review, responsive refinement, performance work",
  },
];
export interface WebsiteCategory {
  id: string;
  label: string;
  desc: string;
  examples: string[];
  features: string[];
  featureNotes?: Record<string, string>;
  enabled?: boolean;
}

export const DEFAULT_WEBSITE_CATEGORIES: WebsiteCategory[] = [
  {
    id: "portfolio",
    label: "Personal Portfolio",
    desc: "Showcase your work, skills, achievements and experience in one beautiful website.",
    examples: [
      "Student portfolio",
      "Developer or designer portfolio",
      "Professional resume website",
      "Artist or creator portfolio",
      "Personal brand website",
    ],
    features: [
      "About Me",
      "Skills & Experience",
      "Projects / My Work",
      "Resume Download",
      "Photo or Video Gallery",
      "Achievements / Certificates",
      "Contact Form",
      "Social Media Links",
      "Testimonials",
      "Smooth Animations",
    ],
    enabled: true,
  },
  {
    id: "blog",
    label: "Blog / Content Website",
    desc: "Share articles, stories, knowledge or regular updates with your audience.",
    examples: [
      "Personal blog",
      "Articles and stories",
      "News or updates website",
      "Educational content website",
      "Writing or publication website",
    ],
    features: [
      "Publish Articles",
      "Organize Posts by Category",
      "Search Articles",
      "Add Photos and Videos",
      "Newsletter Sign-Up",
      "Reader Comments",
      "Featured Articles",
      "Admin Area to Manage Posts",
      "Author Profile",
      "Social Sharing",
    ],
    featureNotes: {
      "Admin Area to Manage Posts":
        "A private page where you can add and edit your articles.",
    },
    enabled: true,
  },
  {
    id: "business",
    label: "Business Website",
    desc: "Give your business a professional online presence and help customers reach you.",
    examples: [
      "Small business website",
      "Company website",
      "Local service business",
      "Professional services website",
      "Product or service showcase",
    ],
    features: [
      "About Our Business",
      "Services",
      "Product / Service Gallery",
      "Contact Form",
      "WhatsApp Contact",
      "Google Maps Location",
      "Customer Reviews",
      "Team Information",
      "Appointment Booking",
      "FAQ Section",
      "Request a Quote",
      "Multiple Languages",
    ],
    enabled: true,
  },
  {
    id: "agency",
    label: "Agency Website",
    desc: "Present your agency, services, team and completed projects professionally.",
    examples: [
      "Creative agency",
      "Digital agency",
      "Technology agency",
      "Marketing agency",
      "Consulting agency",
    ],
    features: [
      "Agency Introduction",
      "Services",
      "Our Work / Portfolio",
      "Project Case Studies",
      "Team Members",
      "Client Testimonials",
      "Project Enquiry Form",
      "Book a Consultation",
      "Careers / Open Positions",
      "Blog / Insights",
      "Smooth Animations",
      "Private Admin Area",
    ],
    enabled: true,
  },
  {
    id: "ecommerce",
    label: "E-Commerce Website",
    desc: "Showcase products, accept orders and sell online.",
    examples: [
      "Small online shop",
      "Multi-product store",
      "Single-product website",
      "Digital product store",
      "Product catalogue with WhatsApp ordering",
    ],
    features: [
      "Product Listings",
      "Product Categories",
      "Product Search",
      "Shopping Cart",
      "Online Payments",
      "UPI Payments",
      "WhatsApp Ordering",
      "Customer Accounts",
      "Order Tracking",
      "Product Reviews",
      "Discount Codes",
      "Stock Management",
      "Admin Area for Products and Orders",
      "Delivery / Shipping Options",
    ],
    enabled: true,
  },
];

export const DESIGN_STYLES = [
  { id: "clean_simple", label: "Clean & Simple", desc: "Easy to read and professional." },
  { id: "modern_professional", label: "Modern & Professional", desc: "Stylish but suitable for business." },
  { id: "dark_premium", label: "Dark & Premium", desc: "Elegant darker colors and refined details." },
  { id: "colorful_creative", label: "Colorful & Creative", desc: "More personality and visual energy." },
  { id: "inspired", label: "Inspired by a Website", desc: "Share a reference link." },
  { id: "not_sure", label: "Not Sure", desc: "Suggest a design for me." },
];

export const TIMELINE_CHOICES = [
  "As Soon As Possible",
  "Within 2 Weeks",
  "Within 1 Month",
  "Flexible",
  "Not Sure",
];

export const BUDGET_CHOICES = [
  "Below ₹5,000",
  "₹5,000–₹10,000",
  "₹10,000–₹25,000",
  "₹25,000+",
  "I'd Like a Quote",
  "Not Sure Yet",
];

export const defaults = {
  headline: "Thoughtful Design.\nPowerful Digital Experiences.",
  intro:
    "We create modern websites and digital solutions that bring ideas to life and help businesses grow.",
  about:
    "SANJU X DEV is a web development and digital solutions business. We bring design and engineering together to create clear, engaging experiences for businesses and their customers.",
  email: "sanjuxdev27@gmail.com",
  instagram: "https://instagram.com/sanju_x_dev/",
  defaultTheme: "silver",
  introEnabled: true,
  assistantEnabled: true,
  services,
  projects,
  faqs: [
    {
      q: "What can you build?",
      a: "Business websites, e-commerce, UI/UX, custom applications, interactive experiences and redesigns.",
    },
    {
      q: "Can I see your work?",
      a: "Explore StarX Live, TicketX, StarX Connect, AudioX and Yuva Shakti in Our Work. Each has a case study and live link.",
    },
    {
      q: "How much does a website cost?",
      a: "Pricing depends on scope, integrations and content. Share a brief for a tailored discussion. We confirm timelines after understanding the work.",
    },
  ],
  knowledge:
    "SANJU X DEV provides professional web development and digital solutions. Sanjay is Co-Founder at CodeXa Agency, a separate affiliation, not a sixth project.",
  seoTitle: "SANJU X DEV — Websites with distinction",
  seoDescription:
    "Business websites, thoughtful digital experiences and custom applications. Explore five real projects and start a conversation.",
  assistantWelcome:
    "Hi, I’m spideyy! I can help you understand our services, suggest the right website for your business, explain features, or check your project status.",
  homepageQuestions: [
    "What kind of website does my business need?",
    "Can you build an online store?",
    "How do I start a project?",
    "How can I check my project status?",
  ],
  websiteCategories: DEFAULT_WEBSITE_CATEGORIES,
  designStyles: DESIGN_STYLES,
  timelineChoices: TIMELINE_CHOICES,
  budgetChoices: BUDGET_CHOICES,
  formConfig: {
    defaultCategory: "Business Website",
    defaultDesignStyle: "Clean & Simple",
    requireDescription: false,
    customQuestions: [] as { id: string; question: string; required: boolean }[],
  },
  enquiryCategories: [
    { id: "portfolio", label: "Personal Portfolio", desc: "Showcase your work, skills, achievements and experience in one beautiful website." },
    { id: "blog", label: "Blog / Content Website", desc: "Share articles, stories, knowledge or regular updates with your audience." },
    { id: "business", label: "Business Website", desc: "Give your business a professional online presence and help customers reach you." },
    { id: "agency", label: "Agency Website", desc: "Present your agency, services, team and completed projects professionally." },
    { id: "ecommerce", label: "E-Commerce Website", desc: "Showcase products, accept orders and sell online." },
  ],
  enquiryFeatures: [
    "About Our Business",
    "Services",
    "Contact Form",
    "WhatsApp Contact",
    "Product / Service Gallery",
    "Appointment Booking",
    "FAQ Section",
    "Customer Reviews",
  ],
};

