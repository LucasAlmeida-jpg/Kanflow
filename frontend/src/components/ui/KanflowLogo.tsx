import { cx } from "../../lib/cx";

type KanflowLogoProps = {
  size?: number;
  withName?: boolean;
  className?: string;
};

export function KanflowLogo({ size = 28, withName = true, className }: KanflowLogoProps) {
  return (
    <span className={cx("logo", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
        <rect width="32" height="32" rx="7" className="logo-tile" />
        <rect x="6" y="6" width="5.5" height="20" rx="1.5" className="logo-bar" />
        <rect x="13.25" y="6" width="5.5" height="13" rx="1.5" className="logo-bar" />
        <rect x="20.5" y="6" width="5.5" height="16" rx="1.5" className="logo-bar" />
      </svg>
      {withName ? <span className="logo-name">Kanflow</span> : <span className="sr-only">Kanflow</span>}
    </span>
  );
}
