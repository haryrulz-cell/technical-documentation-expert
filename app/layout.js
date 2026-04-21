export const metadata = {
  title: "Technical Documentation Expert",
  description: "AI-powered Microsoft Dynamics 365 Technical Documentation Specialist",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
