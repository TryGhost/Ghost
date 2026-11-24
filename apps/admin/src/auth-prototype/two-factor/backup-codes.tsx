import { useState } from 'react';
import { Button, Checkbox, Label } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';

function codesText(codes: string[], siteTitle: string) {
  return [`Backup codes for ${siteTitle}`, 'Each code gets you in once.', '', ...codes, ''].join(
    '\n',
  );
}

function downloadCodes(codes: string[], siteTitle: string) {
  const text = codesText(codes, siteTitle);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ghost-backup-codes.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Print just the codes, from a hidden frame, so the rest of Admin stays off the page. */
function printCodes(codes: string[], siteTitle: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    return;
  }
  const pre = printWindow.document.createElement('pre');
  pre.style.font = '14px/1.8 ui-monospace, monospace';
  pre.textContent = codesText(codes, siteTitle);
  printWindow.document.body.appendChild(pre);
  printWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
  printWindow.print();
}

/** Step 4 (and E2): show the codes once, offer copy and download, and ask the user to confirm they saved them. */
export function BackupCodes({
  codes,
  siteTitle,
  finishLabel = 'Finish',
  onFinish,
}: {
  codes: string[];
  siteTitle: string;
  finishLabel?: string;
  onFinish: () => void;
}) {
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      toast.success('Backup codes copied');
    } catch {
      toast.error('Couldn’t copy. Select the codes and copy them instead.');
    }
  };

  return (
    <Stack gap="lg">
      <Text size="md" tone="secondary">
        If you lose your phone, each code gets you in once. We won’t show them again.
      </Text>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-lg border border-border-default bg-surface-panel p-4 font-mono text-md">
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <Inline gap="sm">
        <Button variant="outline" onClick={() => void copy()}>
          <LucideIcon.Copy />
          Copy
        </Button>
        <Button variant="outline" onClick={() => downloadCodes(codes, siteTitle)}>
          <LucideIcon.Download />
          Download .txt
        </Button>
        <Button variant="outline" onClick={() => printCodes(codes, siteTitle)}>
          <LucideIcon.Printer />
          Print
        </Button>
      </Inline>
      <Inline gap="sm">
        <Checkbox
          checked={saved}
          id="auth-prototype-saved-codes"
          onCheckedChange={(checked) => setSaved(checked === true)}
        />
        <Label className="font-normal" htmlFor="auth-prototype-saved-codes">
          I’ve saved these codes somewhere safe
        </Label>
      </Inline>
      <Inline justify="end">
        <Button disabled={!saved} onClick={onFinish}>
          {finishLabel}
        </Button>
      </Inline>
    </Stack>
  );
}
