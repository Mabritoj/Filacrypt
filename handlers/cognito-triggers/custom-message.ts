import { CustomMessageTriggerEvent } from 'aws-lambda';
import { Logger } from 'logger';

function buildEmailHtml(codePlaceholder: string): string {
  return `
    <div style="background-color:#faf8f3;padding:40px 20px;font-family:'Hanken Grotesk',Arial,sans-serif;">
      <div style="max-width:420px;margin:0 auto;background-color:#ffffff;border-radius:16px;padding:40px 32px;text-align:center;">
        <div style="width:48px;height:48px;border-radius:50%;background-color:#b06a37;color:#ffffff;font-size:22px;font-weight:700;line-height:48px;margin:0 auto 24px;">F</div>
        <h1 style="margin:0 0 8px;font-size:20px;color:#22201c;">Your sign-in code</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6f685e;">Enter this code to finish signing in to Filacrypt.</p>
        <div style="display:inline-block;padding:16px 24px;background-color:#efe7dd;border-radius:12px;font-size:28px;font-weight:700;letter-spacing:6px;color:#b06a37;">${codePlaceholder}</div>
        <p style="margin:28px 0 0;font-size:12px;color:#6f685e;">This code expires shortly. If you didn't request this, you can safely ignore this email.</p>
      </div>
    </div>
  `.trim();
}

export const handler = async (
  event: CustomMessageTriggerEvent,
  logger: Logger
): Promise<CustomMessageTriggerEvent> => {
  logger.info('Building branded sign-in code email');

  event.response.emailSubject = 'Your Filacrypt sign-in code';
  event.response.emailMessage = buildEmailHtml(event.request.codeParameter);

  return event;
};
