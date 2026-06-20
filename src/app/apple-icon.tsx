import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
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
          backgroundColor: '#000000',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
          <rect x="2" y="2" width="116" height="116" fill="#080808" stroke="#E50000" strokeWidth="3"/>
          <circle cx="60" cy="60" r="17" fill="none" stroke="#999999" strokeWidth="3.5"/>
          <circle cx="60" cy="60" r="32" fill="none" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="35 15.2" transform="rotate(45 60 60)" />
          <polygon points="53,48 53,72 73,60" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round"/>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
