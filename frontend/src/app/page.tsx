import type { Metadata } from "next";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  FileText,
  ListTodo,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { HomeSession } from "../components/home-session";
import "./landing.css";

const title = "AgentBuddy — AI Calendar, Notes & Focus Assistant";
const description =
  "Plan your day with AgentBuddy and Saarthi. Search saved notes, manage tasks, track focus sessions, and approve Google Calendar changes in one workspace.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "https://cipherxcel.dev/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    url: "https://cipherxcel.dev/",
    siteName: "AgentBuddy",
    title,
    description,
    locale: "en_US",
    images: [
      {
        url: "/images/agentbuddy-social.png",
        width: 1200,
        height: 630,
        alt: "AgentBuddy — your AI workspace for notes, calendar, tasks, and focus",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/agentbuddy-social.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://cipherxcel.dev/#website",
      name: "AgentBuddy",
      url: "https://cipherxcel.dev/",
      inLanguage: "en",
      description,
      creator: { "@id": "https://cipherxcel.dev/#creator" },
    },
    {
      "@type": "WebApplication",
      "@id": "https://cipherxcel.dev/#app",
      name: "AgentBuddy",
      url: "https://cipherxcel.dev/",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web browser",
      description,
      image: "https://cipherxcel.dev/images/agentbuddy-social.png",
      creator: { "@id": "https://cipherxcel.dev/#creator" },
      featureList: [
        "AI assistant with saved conversations",
        "Google Calendar integration",
        "Notes search",
        "Task management",
        "Focus-session tracking",
      ],
    },
    {
      "@type": "Person",
      "@id": "https://cipherxcel.dev/#creator",
      name: "Priyanshu Raj",
    },
  ],
};

const features = [
  {
    icon: Sparkles,
    label: "SAARTHI",
    title: "A conversation that keeps context.",
    text: "Pick up where you left off. Saarthi uses saved conversations and summaries of older messages to help you plan your next steps.",
  },
  {
    icon: CalendarDays,
    label: "CALENDAR",
    title: "Find time. Make a plan.",
    text: "Connect Google Calendar, check your availability, and ask for a meeting, reschedule, or cancellation. Review the proposal before it happens.",
  },
  {
    icon: FileText,
    label: "NOTES",
    title: "Put your saved notes to work.",
    text: "Upload documents and ask questions about them. Saarthi can search titles and extracted text, read relevant notes, and link to its sources.",
  },
  {
    icon: ListTodo,
    label: "TASKS",
    title: "Keep the details with the task.",
    text: "Add descriptions, due dates, and linked notes. Open any task to see its context, then mark it complete when the work is done.",
  },
  {
    icon: Timer,
    label: "FOCUS",
    title: "Make room for focused work.",
    text: "Set a time goal or work without a countdown. Come back to finish your session and review your progress, including any extra time.",
  },
  {
    icon: ShieldCheck,
    label: "YOUR WORKSPACE",
    title: "You decide what happens next.",
    text: "Approve assistant proposals yourself. Manage your Google connection, working hours, timezone, appearance, and password from your profile.",
  },
];

export default function Home() {
  return (
    <div className="landing">
      <HomeSession />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <a href="#main" className="landing-skip">
        Skip to content
      </a>
      <header className="landing-header">
        <a href="/" className="landing-brand" aria-label="AgentBuddy home">
          <img src="/icon.svg" alt="" width="34" height="34" /> AgentBuddy
        </a>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="/workspace/" className="landing-button landing-button-small">
            Sign in <ArrowUpRight size={16} />
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="landing-hero" aria-labelledby="hero-heading">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">
              <span /> YOUR DAY, A LITTLE MORE ORGANIZED
            </span>
            <h1 id="hero-heading">
              Your notes.
              <br />
              Your next steps.
              <br />
              <em>One AI workspace.</em>
            </h1>
            <p>
              Meet AgentBuddy. Plan with Saarthi, keep your calendar in view,
              and turn scattered notes into work you can follow through on.
            </p>
            <div className="landing-hero-actions">
              <a href="/workspace/" className="landing-button">
                Open your workspace <ArrowUpRight size={19} />
              </a>
              <a href="#features" className="landing-text-link">
                Take a look around <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="landing-reassurance">
              <ShieldCheck size={16} /> Calendar changes always wait for your
              approval.
            </div>
          </div>
          <div
            className="landing-preview"
            aria-label="Illustrative example of planning with Saarthi"
          >
            <div className="landing-preview-top">
              <span>
                <Sparkles size={18} /> Saarthi
              </span>
              <span className="landing-example">EXAMPLE WORKSPACE</span>
            </div>
            <div className="landing-preview-chat">
              Find time for a project review and help me prepare from my notes.
            </div>
            <div className="landing-preview-reply">
              <span className="landing-mini-label">A PLAN TO REVIEW</span>
              <h2>A little clarity for your day.</h2>
              <p>Bring the meeting, its notes, and your next steps together.</p>
            </div>
            <div className="landing-example-event">
              <span className="landing-calendar-icon">
                <CalendarDays size={24} />
              </span>
              <div>
                <strong>Project review</strong>
                <span>Google Calendar · proposal</span>
              </div>
              <span className="landing-pending">Review</span>
            </div>
            <div className="landing-preview-bottom">
              <div>
                <FileText size={18} />
                <strong>Meeting notes</strong>
                <span>Context, close at hand</span>
              </div>
              <div>
                <Timer size={18} />
                <strong>Space to focus</strong>
                <span>One thing at a time</span>
              </div>
            </div>
            <span className="landing-preview-orbit" aria-hidden="true" />
          </div>
        </section>
        <section id="features" className="landing-section">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">LESS SWITCHING. MORE DOING.</span>
            <h2>A place for the whole day.</h2>
            <p>
              From the first idea to the final checkmark, keep the work
              connected.
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, label, title: heading, text }) => (
              <article className="landing-feature" key={label}>
                <Icon size={22} aria-hidden="true" />
                <span className="landing-mini-label">{label}</span>
                <h3>{heading}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="landing-section landing-workflow">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">
              START WITH WHAT IS ON YOUR MIND
            </span>
            <h2>Ask. Review. Get on with your day.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <h3>Bring your context.</h3>
              <p>
                Create an account, upload your notes, and connect Google
                Calendar when you want to plan meetings.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Talk to Saarthi.</h3>
              <p>
                Ask about a document, check your schedule, or turn a set of
                meeting notes into proposed action items.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Choose your next step.</h3>
              <p>
                Approve the changes you want, work through your tasks, or start
                a focus session to make time for one thing.
              </p>
            </li>
          </ol>
        </section>
        <section
          className="landing-section landing-faq"
          aria-labelledby="faq-heading"
        >
          <div className="landing-section-heading">
            <span className="landing-eyebrow">A FEW THINGS TO KNOW</span>
            <h2 id="faq-heading">Before you get started.</h2>
          </div>
          <div>
            <details>
              <summary>What is AgentBuddy?</summary>
              <p>
                AgentBuddy is a web-based AI productivity assistant created by
                Priyanshu Raj. It brings conversations with Saarthi, Google
                Calendar planning, saved notes, tasks, and focus-session
                tracking into one personal workspace.
              </p>
            </details>
            <details>
              <summary>Will Saarthi change my calendar automatically?</summary>
              <p>
                No. Saarthi prepares proposals for you to review. Creating,
                moving, or cancelling a meeting requires your approval.
                Availability checks use your connected primary Google calendar,
                not other attendees’ calendars.
              </p>
            </details>
            <details>
              <summary>Which documents can I use?</summary>
              <p>
                You can upload text-based PDF, TXT, Markdown, SRT, and VTT
                files. Notes search uses titles and extracted text. Scanned PDFs
                need text recognition before upload. The limit is 10 MB per file
                and 500 MB per account.
              </p>
            </details>
            <details>
              <summary>
                Does focus mode add an event to Google Calendar?
              </summary>
              <p>
                Focus sessions are recorded in AgentBuddy’s own calendar
                history. They do not automatically block Google Calendar. You
                can set a duration or choose open focus, and extra time is
                recorded until you finish the session.
              </p>
            </details>
            <details>
              <summary>Can I use it on my phone?</summary>
              <p>
                Yes. AgentBuddy works in your browser with a mobile layout and
                bottom navigation. Your saved workspace is tied to your account,
                so you can sign in from another device.
              </p>
            </details>
          </div>
        </section>
        <section className="landing-closing">
          <div>
            <Check size={20} />
            <h2>A clear place to start.</h2>
            <p>Bring your next task, thought, or meeting.</p>
          </div>
          <a href="/workspace/" className="landing-button">
            Get started <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
      <footer className="landing-footer">
        <a href="/" className="landing-brand">
          <img src="/icon.svg" alt="" width="26" height="26" />
          AgentBuddy
        </a>
        <span>
          Created by <strong>Priyanshu Raj</strong>
        </span>
        <a href="https://github.com/CipherXcel/AI-Meeting-Intelligence-Productivity-Assistant">
          View on GitHub <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
