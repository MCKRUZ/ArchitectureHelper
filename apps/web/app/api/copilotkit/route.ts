import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

// Extract resource name from endpoint URL
// e.g., https://alf-aiodc-dev-001.cognitiveservices.azure.com -> alf-aiodc-dev-001
const endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
const resourceName = endpoint.replace('https://', '').split('.')[0];
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || '';

// Log config validation on startup (redacted)
if (!endpoint || !deploymentName || !process.env.AZURE_OPENAI_API_KEY) {
  console.warn(
    '[CopilotKit] Missing Azure OpenAI config:',
    !endpoint && 'AZURE_OPENAI_ENDPOINT',
    !deploymentName && 'AZURE_OPENAI_DEPLOYMENT',
    !process.env.AZURE_OPENAI_API_KEY && 'AZURE_OPENAI_API_KEY',
  );
}

// Configure OpenAI client for Azure
// Key insight: Use OpenAI class (not AzureOpenAI) with Azure-specific configuration
const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}`,
  defaultHeaders: {
    'api-key': process.env.AZURE_OPENAI_API_KEY,
  },
  defaultQuery: {
    'api-version': '2024-08-01-preview',
  },
});

// Initialize the CopilotKit runtime with OpenAI adapter
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  try {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: '/api/copilotkit',
    });

    return await handleRequest(req);
  } catch (error) {
    console.error('[CopilotKit] Request failed:', error);
    return NextResponse.json(
      { error: 'CopilotKit request failed' },
      { status: 500 }
    );
  }
};
