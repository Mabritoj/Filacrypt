import { randomUUID } from 'crypto';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import type { Writable } from 'stream';
import { Logger } from 'logger';
import { assertFilamentPermission, verifyBearerToken, ForbiddenError, UnauthorizedError } from 'workspace-auth';
import { chatConfig } from './config.js';
import { TOOL_DEFINITIONS, dispatchTool } from './tools.js';
import { NdjsonWriter } from './stream.js';

const MAX_TOOL_ITERATIONS = 5;
const MAX_HISTORY_MESSAGES = 20;
const MAX_TOKENS = 4096;

/**
 * Cross-region inference profile ID, not the bare model ID -- Bedrock rejects
 * newer models invoked by their plain foundation-model ID ("use an inference
 * profile") on this endpoint. This is also why the client below is the legacy
 * `AnthropicBedrock` (bedrock-runtime InvokeModelWithResponseStream), not
 * `AnthropicBedrockMantle`: Mantle's account-level entitlement for this model
 * did not clear even after Bedrock's "submit use case details" gate cleared
 * for bedrock-runtime, so we're on the endpoint that's actually proven working.
 *
 * Hardcoded rather than an env var, deliberately: unlike Mantle (whose IAM
 * action authorizes against a *project*, with no per-model resource to scope
 * to), bedrock-runtime's IAM resource is this exact inference-profile ARN --
 * see the ChatFunction policy in template.yaml. So IAM already pins this role
 * to Haiku; hardcoding the ID too means changing it requires touching both
 * the code and the policy, not just one.
 */
const BEDROCK_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const SYSTEM_PROMPT = [
  'You are the inventory assistant for Filacrypt, a 3D-printer filament tracker.',
  'Answer questions about the spools in this workspace using the provided tools.',
  'Always call a tool before stating what the user owns — never guess from memory.',
  'Be concise: a sentence or two. The UI renders matching spools as cards below your',
  'answer, so do not list every spool in prose. Weights are grams unless stated.',
  'You cannot add, edit or delete spools. If asked to, say so and suggest the',
  'Scan / Add spool button.',
].join(' ');

export interface ChatRequest {
  authHeader: string | undefined;
  workspaceId: string;
  messages: { role: string; content: unknown }[];
}

export interface ChatDeps {
  bedrock: AnthropicBedrock;
}

export async function runChat(
  request: ChatRequest,
  writer: NdjsonWriter,
  deps: ChatDeps,
): Promise<void> {
  const userId = await verifyBearerToken(request.authHeader);
  await assertFilamentPermission(userId, request.workspaceId, 'read');

  const messages = request.messages.slice(-MAX_HISTORY_MESSAGES);

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const stream = deps.bedrock.messages.stream({
      model: BEDROCK_MODEL_ID,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS as never,
      messages: messages as never,
    });

    for await (const event of stream as AsyncIterable<Record<string, never>>) {
      const e = event as unknown as {
        type: string;
        delta?: { type: string; text?: string };
      };
      if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
        writer.text(e.delta.text ?? '');
      }
    }

    const message = (await stream.finalMessage()) as unknown as {
      stop_reason: string;
      content: { type: string; id?: string; name?: string; input?: Record<string, unknown> }[];
    };

    if (message.stop_reason !== 'tool_use') {
      writer.done();
      return;
    }

    messages.push({ role: 'assistant', content: message.content });

    const toolResults = [];
    for (const block of message.content) {
      if (block.type !== 'tool_use') continue;
      const outcome = await dispatchTool(block.name!, block.input ?? {}, request.workspaceId);
      writer.spools(outcome.spoolIds);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(outcome.result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  writer.error('I could not finish that in a reasonable number of steps. Try a narrower question.');
  writer.done();
}

const bedrock = new AnthropicBedrock({ awsRegion: chatConfig.awsRegion });

export const handler = awslambda.streamifyResponse(
  async (event: unknown, responseStream: Writable) => {
    const e = event as {
      headers?: Record<string, string>;
      body?: string;
    };

    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: { 'Content-Type': 'application/x-ndjson' },
    });

    const writer = new NdjsonWriter({ write: (chunk) => stream.write(chunk) });
    const logger = new Logger(randomUUID());

    try {
      const body = JSON.parse(e.body ?? '{}') as {
        workspaceId?: string;
        messages?: { role: string; content: unknown }[];
      };

      if (!body.workspaceId) throw new Error('workspaceId is required');

      await runChat(
        {
          authHeader: e.headers?.authorization ?? e.headers?.Authorization,
          workspaceId: body.workspaceId,
          messages: body.messages ?? [],
        },
        writer,
        { bedrock },
      );
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        logger.warning('Rejected an unauthenticated chat request', { reason: err.message });
        writer.error('Your session has expired. Please sign in again.');
      } else if (err instanceof ForbiddenError) {
        logger.warning('Rejected a non-member chat request');
        writer.error('You are not a member of this workspace.');
      } else {
        // The viewer only ever sees a generic message, so without this the
        // cause is lost entirely -- the invocation ends cleanly and CloudWatch
        // shows nothing but START/END.
        const error = err as { name?: string; message?: string; status?: number; stack?: string };
        logger.error('Chat request failed', {
          errorName: error?.name,
          errorMessage: error?.message,
          httpStatus: error?.status,
          stack: error?.stack,
        });
        writer.error('Something went wrong answering that.');
      }
      writer.done();
    } finally {
      stream.end();
    }
  },
);
