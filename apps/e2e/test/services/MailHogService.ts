import type { Email, EmailService } from './EmailService';

// Add Buffer for potential base64 decoding if not already available in the environment
// For Node.js environment (which Playwright tests run in), Buffer is global.
// import { Buffer } from 'buffer';

interface MailHogMessageContent {
  Headers: { [key: string]: string[] };
  Body: string;
  Size: number;
  MIME?: any; // MIME structure can be complex
}

interface MailHogMessage {
  ID: string;
  From: any; // Could be more specific if needed
  To: any[]; // Could be more specific if needed
  Content: MailHogMessageContent;
  Created: string;
  MIME?: any;
  Raw: any;
}

interface MailHogMessagesResult {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

export class MailHogService implements EmailService {
  private mailhogApiUrl: string;

  constructor(mailhogApiUrl: string = 'http://localhost:8025') {
    this.mailhogApiUrl = mailhogApiUrl.replace(/\/$/, '');
  }

  private async fetchMessageById(messageId: string): Promise<MailHogMessage | null> {
    try {
      const response = await fetch(`${this.mailhogApiUrl}/api/v1/messages/${messageId}`);
      if (!response.ok) {
        console.warn(`MailHog API (fetch by ID) failed: ${response.status} ${response.statusText}`);
        return null;
      }
      return await response.json() as MailHogMessage;
    } catch (error) {
      console.warn('Error fetching message by ID from MailHog:', error);
      return null;
    }
  }

  async waitForLatestEmail(recipientEmail: string, timeoutMs: number = 30000): Promise<Email> {
    if (!recipientEmail) {
      throw new Error('Recipient email is required for MailHog waitForLatestEmail.');
    }
    console.log(`Waiting for email to ${recipientEmail} via MailHog at ${this.mailhogApiUrl}...`);

    const endTime = Date.now() + timeoutMs;
    let latestMessageSummary: MailHogMessage | null = null;

    while (Date.now() < endTime) {
      try {
        const response = await fetch(`${this.mailhogApiUrl}/api/v2/search?kind=to&query=${encodeURIComponent(recipientEmail)}`);
        if (!response.ok) {
          console.warn(`MailHog API (search) failed: ${response.status} ${response.statusText}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        const data = await response.json() as MailHogMessagesResult;
        if (data.items && data.items.length > 0) {
          latestMessageSummary = data.items[0]; // Assumes newest first from search
          break;
        }
      } catch (error) {
        console.warn('Error searching emails from MailHog:', error);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!latestMessageSummary) {
      throw new Error(`Timeout: No email found for ${recipientEmail} in MailHog search after ${timeoutMs}ms.`);
    }

    // Now fetch the full message details to get a better body
    const fullMessage = await this.fetchMessageById(latestMessageSummary.ID);
    if (!fullMessage) {
        throw new Error(`Failed to fetch full email details for ID ${latestMessageSummary.ID} from MailHog.`);
    }

    let emailBody = fullMessage.Content.Body; // Default to the main content body
    let isHtml = fullMessage.Content.Headers['Content-Type']?.join('').includes('text/html') || false;

    if (fullMessage.MIME && fullMessage.MIME.Parts) {
        const textPart = fullMessage.MIME.Parts.find((part: any) =>
            part.Headers['Content-Type']?.join('').includes('text/plain')
        );

        if (textPart && textPart.Body) {
            console.log('Using text/plain part from MailHog email.');
            emailBody = textPart.Body;
            isHtml = false; // Plain text part is not HTML
            // Check if this specific part is base64 encoded
            if (textPart.Headers['Content-Transfer-Encoding']?.join('').toLowerCase().includes('base64')) {
                try {
                    console.log('Base64 decoding text/plain part.');
                    emailBody = Buffer.from(emailBody, 'base64').toString('utf-8');
                } catch (e) {
                    console.warn('Failed to base64 decode text/plain part, using as is.', e);
                }
            }
        } else if (!isHtml && fullMessage.Content.Headers['Content-Transfer-Encoding']?.join('').toLowerCase().includes('base64')) {
            // If no specific text part, but the main body claims to be text/plain and base64
            console.log('Main body is text/plain and base64 encoded. Decoding.');
             try {
                emailBody = Buffer.from(emailBody, 'base64').toString('utf-8');
            } catch (e) {
                console.warn('Failed to base64 decode main text/plain body, using as is.', e);
            }
        }
    } else if (fullMessage.Content.Headers['Content-Transfer-Encoding']?.join('').toLowerCase().includes('base64')) {
        // No MIME parts, but main content body is base64 encoded (could be HTML or plain text)
        console.log('Main content body is base64 encoded. Decoding.');
        try {
            emailBody = Buffer.from(emailBody, 'base64').toString('utf-8');
        } catch (e) {
            console.warn('Failed to base64 decode main content body, using as is.', e);
        }
    }

    return {
      id: fullMessage.ID,
      subject: fullMessage.Content.Headers?.Subject?.[0],
      body: emailBody,
    };
  }

  extractVerificationCode(emailBody: string): string | null {
    if (!emailBody) return null;
    let contentToSearch = emailBody;

    // If it looks like HTML (e.g., contains < and >)
    // This check might need to be more robust or rely on an isHtml flag from waitForLatestEmail
    if (contentToSearch.includes('<') && contentToSearch.includes('>')) {
        // Attempt to decode quoted-printable encoding, common in HTML emails
        if (contentToSearch.includes('=\r\n') || contentToSearch.includes('=3D') || contentToSearch.includes('=\n')) {
            try {
                console.log('Decoding quoted-printable characters from HTML-like body.');
                // Handle different line endings and ensure complete replacement
                contentToSearch = contentToSearch.replace(/=(\r\n|\n|=20|=0A)/g, ''); // Remove soft line breaks and some common encoded spaces/newlines
                contentToSearch = contentToSearch.replace(/=([0-9A-F]{2})/gi, (_match, hex) => {
                    try { return String.fromCharCode(parseInt(hex, 16)); } catch { return '=' + hex; }
                });
            } catch (e) {
                console.warn('Error during quoted-printable decoding, proceeding with potentially partially decoded content.', e);
            }
        }
        // Strip HTML tags to get text content
        console.log('Stripping HTML tags.');
        contentToSearch = contentToSearch.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ''); // Remove style blocks
        contentToSearch = contentToSearch.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ''); // Remove script blocks
        contentToSearch = contentToSearch.replace(/<[^>]*>/g, ' '); // Strip all other tags
    }

    // General cleanup for better regex matching
    contentToSearch = contentToSearch
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#160;/gi, ' ') // Another non-breaking space
        .replace(/\s+/g, ' ')
        .trim();

    // Log a snippet of the processed content before regex matching
    // console.log("Content for regex matching (first 300 chars):", contentToSearch.substring(0, 300));

    // Look for 6 digits as a whole word, or common OTP phrases
    const codeMatch = contentToSearch.match(/(\b\d{6}\b)|(?:your verification code is|is:|code:|is|verification code:)\s*(\d{6})/i);

    if (codeMatch) {
        const extractedCode = codeMatch[1] || codeMatch[2];
        if (extractedCode) {
            console.log(`Found code: ${extractedCode}`);
            return extractedCode;
        }
    }

    console.error("Could not find 6-digit OTP in MailHog email body after processing. Processed content snippet (first 500 chars):", contentToSearch.substring(0, 500) + (contentToSearch.length > 500 ? '...' : '') );
    return null;
  }
}
