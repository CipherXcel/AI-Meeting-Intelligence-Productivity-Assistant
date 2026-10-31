export const publicGuides = [
  {
    slug: "google-calendar-assistant",
    label: "Calendar planning",
    title: "AI Google Calendar Assistant",
    description:
      "Use Saarthi in AgentBuddy to check Google Calendar availability and prepare meetings, reschedules, and cancellations for your approval.",
    heading: "Plan your Google Calendar with Saarthi.",
    intro:
      "A meeting starts with more than a time slot. You need to know what is already on your calendar, what the meeting is for, and what needs preparing. AgentBuddy keeps that planning conversation beside your notes and tasks.",
    sections: [
      {
        heading: "Check your schedule in a conversation",
        paragraphs: [
          "Connect your primary Google calendar from Profile or the connection card in Saarthi’s sidebar. Once connected, ask about a specific day or date range. Saarthi uses calendar tools to retrieve events and look for available time, instead of relying on old chat messages.",
          "Set your timezone, working days, working hours, and default meeting length in your profile. These give the assistant context for scheduling suggestions. Include the duration and date in your request when you have a particular window in mind.",
        ],
      },
      {
        heading: "Review a proposal before the calendar changes",
        paragraphs: [
          "When you ask to create, move, or cancel a meeting, Saarthi saves a proposal. Open Actions in that conversation or visit All proposals to review it. Preparing a proposal does not send a meeting invitation.",
          "Approval is the step that executes the change. Before creating or moving an event, the backend checks the proposed time against your calendar again. If the slot has become occupied, the request is rejected so you can choose another time. Approved new meetings can include Google Meet links.",
        ],
      },
      {
        heading: "Keep the meeting connected to its work",
        paragraphs: [
          "Use the Calendar tab’s month or week view to see the schedule and select a day for more detail. If you have uploaded a relevant agenda or project note, ask Saarthi to read it before suggesting preparation tasks. Those extracted tasks also come back as proposals for review.",
          "Availability checks cover your connected primary calendar. They do not establish whether another attendee is free. Confirm attendee email addresses and review the proposal details before approving an invitation.",
        ],
      },
    ],
    steps: [
      "Sign in and open Profile, then connect Google Calendar.",
      "Set your timezone and working preferences.",
      "Ask Saarthi for events or available time in a date range.",
      "Review the proposed details and approve the changes you want.",
    ],
    prompts: [
      "What is on my calendar tomorrow?",
      "Find 30 minutes for a project review next Monday afternoon.",
      "Read my project notes and suggest an agenda for that review.",
    ],
    note: "Google Calendar connection is optional. You can still use saved notes, tasks, and focus sessions without connecting a calendar.",
  },
  {
    slug: "ai-notes-search",
    label: "Notes and action items",
    title: "Search Meeting Notes with AI",
    description:
      "Search uploaded meeting notes with Saarthi, read source documents, and turn action items into tasks you can review and link back to their context.",
    heading: "Find the useful part of your meeting notes.",
    intro:
      "Meeting notes are easier to use when you can ask a question about them. AgentBuddy stores your documents in your workspace so Saarthi can find relevant text, read a note, and help you decide what to do next.",
    sections: [
      {
        heading: "Bring your existing documents",
        paragraphs: [
          "Upload text-based PDF, TXT, Markdown, SRT, or VTT files from Notes & files. AgentBuddy extracts their text so it can be retrieved by the assistant. This works for written meeting notes, project documents, agendas, and supported transcript files.",
          "Use a descriptive filename, such as Project Review Notes, so you and Saarthi can identify the document later. Each file can be up to 10 MB, with a total storage quota of 500 MB per account. Your profile shows storage usage.",
        ],
      },
      {
        heading: "Browse first, then ask a specific question",
        paragraphs: [
          "For a broad request like “What notes have I saved?”, Saarthi can list documents with titles and previews. For a specific topic, its search tool looks through saved titles and extracted content. It can then open a relevant document to read more.",
          "A search with no matching keywords does not mean your library is empty. Try the document title, a name used in the notes, or a more specific phrase. Answers can link back to source notes so you can check the surrounding context.",
        ],
      },
      {
        heading: "Turn a discussion into reviewed action items",
        paragraphs: [
          "Ask Saarthi to read a named document and extract the next steps. It prepares a task proposal for you to inspect, rather than immediately adding every suggestion to your list. Review the titles and any proposed dates before approving.",
          "Open a task to add its description, due date, and supporting notes. Linked notes can be previewed from the task details. This keeps the reason for the task available when you return to the work later.",
        ],
      },
    ],
    steps: [
      "Open Notes & files and upload a supported document.",
      "Ask Saarthi to list your notes or search for a topic.",
      "Open the source links to check relevant details.",
      "Ask for action items, review the proposal, and approve the tasks you need.",
    ],
    prompts: [
      "What notes have I saved?",
      "Find the launch decisions in my project review notes.",
      "Read that note and suggest the action items I should track.",
    ],
    note: "Search uses titles and extracted text, not OCR. If a PDF contains only scanned images, run text recognition on it before uploading. Long documents may be read in bounded excerpts; ask about a specific section when needed.",
  },
  {
    slug: "focus-timer",
    label: "Focus and study sessions",
    title: "Focus Timer & Study Session Tracking",
    description:
      "Start a timed or open focus session in AgentBuddy. Track study and work sessions, record extra time, and review your daily focus history.",
    heading: "Give one thing your attention.",
    intro:
      "Use AgentBuddy’s focus mode for studying, preparing a meeting, writing, or working through a task. Choose a time goal when a defined session helps, or use open focus when you would rather work without a countdown.",
    sections: [
      {
        heading: "Choose a timer or work without a countdown",
        paragraphs: [
          "Start from the focus card in Overview. Choose a preset duration or enter a custom length. The open-focus toggle below the custom controls lets you start without showing a countdown while still keeping a record of the time you spend.",
          "A focus session stays active while you move to other parts of the workspace. You can check a note, return to a conversation, or come back to Overview without resetting the recorded start time.",
        ],
      },
      {
        heading: "A reached goal is not the end of your record",
        paragraphs: [
          "For a timed session, AgentBuddy shows a completion notice when the goal is reached. The session continues until you finish it, so extra work is recorded rather than discarded. Your history distinguishes the original goal from the extra time.",
          "The displayed elapsed time is derived from session timestamps, not just a browser interval. When you return to the workspace, it can reflect the time that has passed. Browser suspension may delay an on-screen notice, so use the record to review the actual session.",
        ],
      },
      {
        heading: "Look back at the work you made time for",
        paragraphs: [
          "Select Today’s focus to see a compact list of sessions, including their start and finish times, duration, goals, and extra time. Overview brings this activity together with your schedule and tasks so you can understand your day in context.",
          "Finished sessions appear in AgentBuddy’s calendar history, and you can optionally create a completed task. Focus records belong to the workspace: starting a timer does not automatically create an event or block time in Google Calendar.",
        ],
      },
    ],
    steps: [
      "Open Overview and find the focus card.",
      "Select a preset, a custom duration, or the open-focus toggle.",
      "Start the session and work at your own pace.",
      "Finish the session when you stop, then open Today’s focus to review it.",
    ],
    prompts: [],
    note: "Remember to finish a session when you stop working. Because tracking continues until you finish, leaving a session active can include time away from your desk.",
  },
] as const;
