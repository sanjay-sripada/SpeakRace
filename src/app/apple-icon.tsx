import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #14181f 0%, #0c0f14 100%)",
          borderRadius: 36,
        }}
      >
        <svg
          width="128"
          height="128"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="18" width="28" height="2.5" rx="1" fill="#f5b700" opacity="0.45" />
          <path
            d="M4 20h22l-2.8-6.5c-.9-1.8-2.4-3-4.6-3h-7.2c-2.2 0-3.7 1.2-4.6 3L4 20z"
            fill="#f5b700"
          />
          <path
            d="M10 11h10c1.6 0 2.8 1 3.2 2.5l.8 2.5H8.8l.8-2.5C10 12 11.2 11 12.8 11H10z"
            fill="#0f141a"
            opacity="0.35"
          />
          <circle cx="10.5" cy="22.5" r="3.2" fill="#14181f" />
          <circle cx="22.5" cy="22.5" r="3.2" fill="#14181f" />
          <circle cx="10.5" cy="22.5" r="1.3" fill="#e2e8f0" />
          <circle cx="22.5" cy="22.5" r="1.3" fill="#e2e8f0" />
          <rect x="24" y="14.5" width="3.5" height="2.2" rx="1" fill="#2dd4a8" />
        </svg>
      </div>
    ),
    size,
  );
}
