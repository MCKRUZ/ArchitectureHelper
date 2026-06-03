'use client';

import { CopilotKit, useCopilotReadable } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { composeArchitectPrompt } from '@/lib/ai/prompts';

interface CopilotKitProviderProps {
  children: React.ReactNode;
}

// Inner component to use the useCopilotReadable hook
function CopilotKitInner({ children }: { children: React.ReactNode }) {
  // Provide system instructions via readable context
  useCopilotReadable({
    description: 'Azure Architect Assistant Instructions',
    value: composeArchitectPrompt(),
  });

  return (
    <CopilotSidebar
      labels={{
        title: 'AzureCraft Assistant',
        initial: "Hi! I'm your Azure architect. Describe what you want to build (e.g., 'a scalable e-commerce platform' or 'a real-time IoT dashboard') and I'll design and build the architecture for you.",
        placeholder: 'Describe your architecture needs...',
      }}
      defaultOpen={false}
      clickOutsideToClose={true}
    >
      {children}
    </CopilotSidebar>
  );
}

export function CopilotKitProvider({ children }: CopilotKitProviderProps) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={true}>
      <CopilotKitInner>{children}</CopilotKitInner>
    </CopilotKit>
  );
}
