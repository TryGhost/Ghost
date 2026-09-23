import React from 'react';
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import { toast } from 'sonner';
import { useAppActivation } from '@/apps/app-activation';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { AdminLink } from '@/shared/admin-link';
import { type AppDefinition, getAppHomePath } from '@/apps/app-registry';

interface AppCardProps {
  app: AppDefinition;
  isActivated: boolean;
}

export function AppIconTile({
  icon: Icon,
  color,
  className = 'size-12',
}: {
  icon: AppDefinition['icon'];
  color: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl text-white ${className}`}
      style={{ backgroundColor: color }}
    >
      <Icon className="size-1/2" strokeWidth={1.5} />
    </div>
  );
}

/** A plain grey block the size of an app card, padding the catalogue grid. Decorative. */
export function AppPlaceholderCard({ height }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl bg-muted"
      data-testid="app-card-placeholder"
      style={height ? { height } : undefined}
    />
  );
}

const AppCard: React.FC<AppCardProps> = ({ app, isActivated }) => {
  const { deactivate } = useAppActivation(app.id);

  const handleDeactivate = () => {
    deactivate();
    toast.success(`${app.name} deactivated`);
  };

  return (
    <Card className="h-full p-6" data-testid={`app-card-${app.id}`}>
      {/* Cards in a row share the row's height; the action stays pinned to the bottom. */}
      <Stack className="h-full" gap="lg">
        <Inline align="center" gap="md">
          <AppIconTile color={app.color} icon={app.icon} />
          <Inline align="center" className="min-w-0 flex-1" gap="sm">
            <Text as="h2" className="truncate" size="lg" weight="semibold">
              {app.name}
            </Text>
            {isActivated && (
              <Badge data-testid={`app-card-${app.id}-active`} variant="secondary">
                Active
              </Badge>
            )}
          </Inline>
          {isActivated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`${app.name} actions`}
                  className="-mr-2 shrink-0"
                  size="icon"
                  variant="ghost"
                >
                  <LucideIcon.Ellipsis size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleDeactivate}
                >
                  <LucideIcon.Trash />
                  Deactivate {app.name}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </Inline>
        <Text size="sm" tone="secondary">
          {app.description}
        </Text>
        <Inline className="mt-auto">
          {isActivated ? (
            <Button variant="outline" asChild>
              <AdminLink to={getAppHomePath(app)}>Manage</AdminLink>
            </Button>
          ) : (
            <Button asChild>
              <AdminLink to={`/apps/${app.id}/activate`}>Activate</AdminLink>
            </Button>
          )}
        </Inline>
      </Stack>
    </Card>
  );
};

export default AppCard;
