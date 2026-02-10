'use client';

import dynamic from 'next/dynamic';
import { ServicePalette } from '@/components/palette/ServicePalette';
import { DiagramProvider } from '@/lib/state/DiagramProvider';

// Dynamic imports to avoid SSR issues with CopilotKit
const AzureCanvas = dynamic(() => import('@/components/canvas/AzureCanvas').then(mod => ({ default: mod.AzureCanvas })), { ssr: false });
const PropertiesPanel = dynamic(() => import('@/components/properties/PropertiesPanel').then(mod => ({ default: mod.PropertiesPanel })), { ssr: false });
const Toolbar = dynamic(() => import('@/components/toolbar/Toolbar').then(mod => ({ default: mod.Toolbar })), { ssr: false });

export default function Home() {
  return (
    <DiagramProvider>
      <main className="flex h-screen w-screen overflow-hidden">
        {/* Service Palette - Left Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <ServicePalette />
        </aside>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <Toolbar />

          {/* Canvas */}
          <div className="flex-1 relative">
            <AzureCanvas />
          </div>
        </div>

        {/* Properties Panel - Right Sidebar */}
        <aside className="w-80 flex-shrink-0">
          <PropertiesPanel />
        </aside>
      </main>
    </DiagramProvider>
  );
}
