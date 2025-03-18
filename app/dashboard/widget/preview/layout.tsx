import '@/app/globals.css';

export const metadata = {
  title: 'Widget Preview',
  description: 'Preview of the booking widget as it appears to clients',
};

export default function WidgetPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
} 