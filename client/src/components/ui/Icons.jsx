// Inline SVG rather than an icon dependency: a handful of 20px glyphs is not
// worth a package, and inline paths inherit currentColor for free.
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const SearchIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
);
export const CartIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>
);
export const ShieldIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M12 3 5 6v5.5c0 4.2 2.9 8 7 9.5 4.1-1.5 7-5.3 7-9.5V6z" /></svg>
);
export const EyeIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12" /><circle cx="12" cy="12" r="2.6" /></svg>
);
export const EyeOffIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M4 4 20 20" /><path d="M9.9 5.7A10.6 10.6 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4.1" /><path d="M6.3 7.9A17 17 0 0 0 2 12s3.6 6.5 10 6.5c1 0 2-.2 2.9-.5" /></svg>
);
export const LockIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const TruckIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M3 6h11v10H3z" /><path d="M14 9h3.5l2.5 3v4H14z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
export const CardIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /></svg>
);
export const CheckIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const ChevronDown = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
export const MenuIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M6 6 18 18M18 6 6 18" /></svg>
);
export const InstagramIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r="0.8" fill="currentColor" /></svg>
);
export const TwitterIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M21 5.5c-.7.3-1.4.5-2.2.6a3.7 3.7 0 0 0 1.7-2 7.5 7.5 0 0 1-2.4.9 3.7 3.7 0 0 0-6.4 3.4A10.6 10.6 0 0 1 4 5.2a3.7 3.7 0 0 0 1.2 5 3.6 3.6 0 0 1-1.7-.5 3.7 3.7 0 0 0 3 3.7 3.7 3.7 0 0 1-1.7.1 3.7 3.7 0 0 0 3.5 2.6A7.5 7.5 0 0 1 3 17.6 10.5 10.5 0 0 0 8.7 19c6.4 0 10-5.4 10-10v-.5c.7-.5 1.3-1.2 1.8-1.9z" /></svg>
);
export const FacebookIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M14.5 8.5h2.2V5.6h-2.4c-2.3 0-3.6 1.4-3.6 3.6v1.6H8.5v3h2.2V21h3.2v-7.2h2.4l.4-3h-2.8v-1.3c0-.7.3-1 1-1z" /></svg>
);
export const YoutubeIcon = (p) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10.5 9.5 5 2.5-5 2.5z" /></svg>
);
