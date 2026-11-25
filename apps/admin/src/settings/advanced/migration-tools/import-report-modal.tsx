import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tryghost/shade/components';

export default function ImportReportModal() {
  const { importId, filename } = useParams();
  const navigate = useNavigate();
  const enabled = useFeatureFlag('csvContentImporter');
  const available =
    enabled &&
    importId &&
    /^[a-f0-9]{24}$/.test(importId) &&
    (filename === 'report.csv' || filename === 'errors.csv');

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          navigate('/settings', { replace: true });
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Content import report</DialogTitle>
          <DialogDescription>
            {available
              ? 'Download the CSV file from your content import. Reports are available for seven days.'
              : 'This content import report is unavailable.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          {available && (
            <Button asChild>
              <a
                download={filename}
                href={apiUrl(`/posts/upload/reports/${importId}/${filename}/`)}
                referrerPolicy="same-origin"
              >
                Download {filename}
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
