/**
 * „სივრცის" ლოგო-მარკი — სამი მომრგვალებული შტრიხისგან აწყობილი სამკუთხედი
 * (ბრენდის ფერები = დიზაინ-ტოკენები: green-dark / green-mid / green-light).
 * ინლაინ SVG, რომ ფერები ტოკენებთან ერთად იცვლებოდეს და ჩატვირთვა არ ჭირდებოდეს.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-8 -8 116 92"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <line
        x1="4"
        y1="72"
        x2="43"
        y2="12"
        stroke="var(--color-green-dark)"
        strokeWidth="11.5"
        strokeLinecap="round"
      />
      <line
        x1="52"
        y1="2.5"
        x2="96"
        y2="73.5"
        stroke="var(--color-green-mid)"
        strokeWidth="11.5"
        strokeLinecap="round"
      />
      <path
        d="M24 70.5 L72 57 L80 70 L28 74 Z"
        fill="var(--color-green-light)"
        stroke="var(--color-green-light)"
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
