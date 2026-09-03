import { EmptyIndicator } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { useEmailSendingStatusContext } from './email-sending-status-context';
import type { ReactNode } from 'react';

interface PendingSendEmptyProps {
  children?: ReactNode;
  className?: string;
  description: string;
  failedDescription?: string;
  failedTitle?: string;
  title: string;
}

const PendingSendEmpty = ({
  children,
  className,
  description,
  failedDescription = 'There is no newsletter performance data for this post',
  failedTitle = 'No newsletter data available',
  title,
}: PendingSendEmptyProps) => {
  const { isNewsletterDataHidden, newsletterDataHiddenReason } = useEmailSendingStatusContext();

  if (!isNewsletterDataHidden) {
    return children ? <div className={className}>{children}</div> : null;
  }

  return (
    <div className="py-20 text-center">
      <EmptyIndicator
        className="h-full"
        description={newsletterDataHiddenReason === 'failed' ? failedDescription : description}
        title={newsletterDataHiddenReason === 'failed' ? failedTitle : title}
      >
        <LucideIcon.Mail strokeWidth={1.5} />
      </EmptyIndicator>
    </div>
  );
};

export default PendingSendEmpty;
