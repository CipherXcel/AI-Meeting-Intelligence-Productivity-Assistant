import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function MeetAgentIcon({ className = "size-6", size, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      {...props}
    >
      <defs>
        <linearGradient id="meetagent-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5D4" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <linearGradient id="meetagent-table-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00F0FF" />
          <stop offset="100%" stopColor="#0096C7" />
        </linearGradient>
      </defs>

      {/* External Sparkles */}
      <path
        d="M42 4L42.8 7.2L46 8L42.8 8.8L42 12L41.2 8.8L38 8L41.2 7.2L42 4Z"
        fill="url(#meetagent-grad)"
      />
      <path
        d="M45 14L45.5 15.5L47 16L45.5 16.5L45 18L44.5 16.5L43 16L44.5 15.5L45 14Z"
        fill="url(#meetagent-grad)"
      />

      {/* Calendar Outer Border */}
      <rect
        x="4"
        y="9"
        width="36"
        height="35"
        rx="7"
        stroke="url(#meetagent-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Top Calendar Ring Hooks */}
      <line x1="12" y1="5" x2="12" y2="10" stroke="url(#meetagent-grad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="5" x2="22" y2="10" stroke="url(#meetagent-grad)" strokeWidth="3" strokeLinecap="round" />
      <line x1="32" y1="5" x2="32" y2="10" stroke="url(#meetagent-grad)" strokeWidth="3" strokeLinecap="round" />

      {/* Calendar Header Line */}
      <line x1="8" y1="16" x2="36" y2="16" stroke="url(#meetagent-grad)" strokeWidth="1.6" strokeOpacity="0.6" strokeLinecap="round" />

      {/* Calendar Date Dots */}
      <circle cx="10" cy="20.5" r="1" fill="url(#meetagent-grad)" />
      <circle cx="15" cy="20.5" r="1" fill="url(#meetagent-grad)" />
      <circle cx="20" cy="20.5" r="1" fill="url(#meetagent-grad)" />
      <circle cx="25" cy="20.5" r="1" fill="url(#meetagent-grad)" />
      
      <circle cx="10" cy="24.5" r="1" fill="url(#meetagent-grad)" />
      <circle cx="15" cy="24.5" r="1" fill="url(#meetagent-grad)" />
      <circle cx="20" cy="24.5" r="1" fill="url(#meetagent-grad)" />

      {/* Internal AI Star */}
      <path
        d="M32 20L32.8 23.2L36 24L32.8 24.8L32 28L31.2 24.8L28 24L31.2 23.2L32 20Z"
        fill="url(#meetagent-grad)"
      />

      {/* Meeting Table */}
      <ellipse cx="22" cy="38.5" rx="10" ry="3.2" fill="url(#meetagent-table-grad)" />

      {/* Left Person */}
      <circle cx="11.5" cy="31" r="2.8" fill="url(#meetagent-grad)" />
      <path
        d="M6.5 41C6.5 36.8 9.5 35.5 13 36.5C14.2 36.8 15 37.8 15 39.2L15 41"
        fill="url(#meetagent-grad)"
      />

      {/* Center Person */}
      <circle cx="22" cy="28.5" r="2.8" fill="url(#meetagent-grad)" />
      <path
        d="M17 38.5C17 35 19.2 34 22 34C24.8 34 27 35 27 38.5"
        fill="url(#meetagent-grad)"
      />

      {/* Right Person */}
      <circle cx="32.5" cy="31" r="2.8" fill="url(#meetagent-grad)" />
      <path
        d="M37.5 41C37.5 36.8 34.5 35.5 31 36.5C29.8 36.8 29 37.8 29 39.2L29 41"
        fill="url(#meetagent-grad)"
      />
    </svg>
  );
}

export function MeetAgentLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 p-1 shadow-sm">
        <MeetAgentIcon className="size-full" />
      </div>
      <span className="font-heading text-xl font-bold tracking-tight bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
        MeetAgent AI
      </span>
    </div>
  );
}
