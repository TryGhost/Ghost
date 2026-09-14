import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import {
  Avatar,
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  LoadingIndicator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useBrowseMembers } from '@tryghost/admin-x-framework/api/members';
import { formatMemberName, memberAvatarProps } from '@/members/member-format';

export default function ActivityMemberSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const { data, isFetching, isError, refetch } = useBrowseMembers({
    enabled: open,
    searchParams: { search: debouncedSearch, limit: '20' },
    defaultErrorHandler: false,
  });
  const loading = isFetching || search !== debouncedSearch;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <LucideIcon.Search className="size-4" />
          Search members
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            aria-label="Search members"
            placeholder="Search members"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <Inline className="p-4" justify="center">
                <LoadingIndicator size="sm" />
              </Inline>
            ) : isError ? (
              <Stack className="p-4" gap="sm">
                <p className="text-sm text-muted-foreground">Couldn’t load members</p>
                <Button variant="outline" onClick={() => void refetch()}>
                  Retry
                </Button>
              </Stack>
            ) : (
              <>
                <CommandEmpty>No members found</CommandEmpty>
                {data?.members.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.id}
                    onSelect={() => {
                      onSelect(member.id);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Avatar {...memberAvatarProps(member)} src={member.avatar_image} />
                    <Stack className="min-w-0" gap="none">
                      <span className="truncate font-medium">{formatMemberName(member)}</span>
                      {member.name?.trim() && (
                        <span className="truncate text-sm text-muted-foreground">
                          {member.email}
                        </span>
                      )}
                    </Stack>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
