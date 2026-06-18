import React from 'react';

// Common style for inline icons to match text alignment
const defaultInlineStyle: React.CSSProperties = {
  display: 'inline-block',
  verticalAlign: 'middle',
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const ShieldIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

export const DocsIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 12, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, ...style }}
    {...props}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const HistoryIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const DisconnectIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

export const NetworkDot: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ style, ...props }) => (
  <span
    style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#00ff88',
      boxShadow: '0 0 8px #00ff88',
      display: 'inline-block',
      marginRight: '8px',
      verticalAlign: 'middle',
      ...style,
    }}
    {...props}
  />
);

export const VaultIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    style={{ ...defaultInlineStyle, marginRight: '8px', ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" />
    <path d="M12 2L2 7h20L12 2z" stroke="currentColor" fill="currentColor" fillOpacity="0.1" />
    <line x1="6" y1="11" x2="6" y2="20" stroke="currentColor" />
    <line x1="10" y1="11" x2="10" y2="20" stroke="currentColor" />
    <line x1="14" y1="11" x2="14" y2="20" stroke="currentColor" />
    <line x1="18" y1="11" x2="18" y2="20" stroke="currentColor" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const RobotIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    style={{ ...defaultInlineStyle, marginRight: '8px', ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" fill="currentColor" fillOpacity="0.1" />
    <circle cx="12" cy="5" r="2" stroke="currentColor" />
    <path d="M12 7v4" stroke="currentColor" />
    <line x1="8" y1="16" x2="8.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="16" x2="16.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M9 12h6" stroke="currentColor" />
  </svg>
);

export const WarningIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const CrossIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, ...style }}
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
    <path d="M12 2a6 6 0 0 1 6 6v3.34a6 6 0 0 1-6 6.33a6 6 0 0 1-6-6.33V8a6 6 0 0 1 6-6z" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

export const SwapIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, ...style }}
    {...props}
  >
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="8 21 3 21 3 16" />
    <line x1="3" y1="21" x2="20" y2="4" />
  </svg>
);

export const GreenDotIcon: React.FC<IconProps> = ({ size = 10, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="5" cy="5" r="4" fill="#00ff88" />
  </svg>
);

export const FlagIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

export const ScienceIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M4.5 16.5c-1.5 1.26-2 3-2 3.5h19c0-.5-.5-2.24-2-3.5L14 9V4h2V2H8v2h2v5z" />
    <path d="M10 9h4" />
  </svg>
);

export const CardIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

export const SignalIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.59 16.11a6 6 0 0 1 6.82 0" />
    <circle cx="12" cy="20" r="1" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const BookIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export const AnchorIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="5" r="3" />
    <line x1="12" y1="8" x2="12" y2="22" />
    <line x1="5" y1="12" x2="19" y2="12" />
    <path d="M5 12a7 7 0 0 0 14 0" />
  </svg>
);

export const IdeaIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17h8v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" fill="currentColor" fillOpacity="0.1" />
  </svg>
);

export const MessageIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const TerminalIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    style={{ ...defaultInlineStyle, marginRight: '8px', ...style }}
    {...props}
  >
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

export const ShoeIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M3 18h18a1 1 0 0 0 1-1v-4a4 4 0 0 0-4-4h-5L9 6H4v12z" />
    <line x1="6" y1="18" x2="6" y2="20" />
    <line x1="12" y1="18" x2="12" y2="20" />
    <line x1="18" y1="18" x2="18" y2="20" />
  </svg>
);

export const NewsIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 1 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8M18 18h-8M16 6H10v4h6V6z" />
  </svg>
);

export const WarningOctagonIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const DumbbellIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M6.5 6.5h11M6.5 17.5h11M3 21h18M3 3h18" />
    <rect x="6.5" y="3" width="11" height="18" rx="2" ry="2" />
  </svg>
);

export const GoldMedalIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFD700"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="8" r="6" fill="#FFD700" fillOpacity="0.2" />
    <path d="M15.47 14H8.53L6 22l6-2 6 2z" />
  </svg>
);

export const SilverMedalIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#C0C0C0"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="8" r="6" fill="#C0C0C0" fillOpacity="0.2" />
    <path d="M15.47 14H8.53L6 22l6-2 6 2z" />
  </svg>
);

export const BronzeMedalIcon: React.FC<IconProps> = ({ size = 18, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#CD7F32"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="8" r="6" fill="#CD7F32" fillOpacity="0.2" />
    <path d="M15.47 14H8.53L6 22l6-2 6 2z" />
  </svg>
);

export const QuestionIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const BlockedIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

export const UnlockIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, marginRight: '6px', ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 14, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ ...defaultInlineStyle, ...style }}
    {...props}
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
