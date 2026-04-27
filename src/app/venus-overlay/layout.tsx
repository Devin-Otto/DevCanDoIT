export default function VenusOverlayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <style>{`
        html,
        body {
          background: transparent !important;
        }

        body {
          overflow: hidden;
        }

        .page-bg,
        .site-header,
        .site-footer {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  );
}
