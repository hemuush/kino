import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer lens focus ring */}
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="url(#icon-lens-grad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="28 6 6 6"
          />
          
          {/* Shutter Blades */}
          <path
            d="M12 2C14.7614 2 17 4.23858 17 7V12"
            stroke="url(#icon-shutter-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <path
            d="M22 12C22 14.7614 19.7614 17 17 17H12"
            stroke="url(#icon-shutter-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <path
            d="M12 22C9.23858 22 7 19.7614 7 17V12"
            stroke="url(#icon-shutter-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          <path
            d="M2 12C2 9.23858 4.23858 7 7 7H12"
            stroke="url(#icon-shutter-grad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
          
          {/* Center Play Button Triangle with rounded joints */}
          <path
            d="M10.25 8.25C10.25 7.43958 11.1667 6.96008 11.8333 7.42675L16.1216 10.4287C16.6994 10.8332 16.6994 11.6668 16.1216 12.0713L11.8333 15.0733C11.1667 15.5399 10.25 15.0604 10.25 14.25V8.25Z"
            fill="url(#icon-play-grad)"
            stroke="url(#icon-play-grad)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          
          <defs>
            <linearGradient id="icon-lens-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="0.5" stopColor="#00f0ff" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="icon-shutter-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#00f0ff" />
            </linearGradient>
            <linearGradient id="icon-play-grad" x1="10" y1="7" x2="16" y2="15" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00f0ff" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
