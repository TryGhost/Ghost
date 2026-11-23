import { useRef, useState } from 'react';
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
  PopoverAnchor,
  InputGroup,
} from '@tryghost/shade/components';
import { Box, Inline, Stack } from '@tryghost/shade/primitives';
import { useBrowseMembers } from '@tryghost/admin-x-framework/api/members';
import { formatMemberName, memberAvatarProps } from '@/members/member-format';

export default function ActivityMemberSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const { data, isFetching, isError, refetch } = useBrowseMembers({
    enabled: open && !!debouncedSearch.trim(),
    searchParams: { search: debouncedSearch, limit: '20' },
    defaultErrorHandler: false,
  });
  const loading = isFetching || search !== debouncedSearch;

  return (
    <Command className="h-auto w-60 max-w-full min-w-0 overflow-visible" shouldFilter={false}>
      <Popover open={open && !!search.trim()} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Box ref={anchor}>
            <InputGroup className="[&_[cmdk-input-wrapper]]:w-full [&_[cmdk-input-wrapper]]:border-0">
              <CommandInput
                aria-expanded={open && !!search.trim()}
                aria-label="Search members"
                className="h-(--control-height) min-w-0 py-0"
                data-slot="input-group-control"
                placeholder="Search members..."
                value={search}
                onClick={() => setOpen(!!search.trim())}
                onFocus={() => setOpen(!!search.trim())}
                onValueChange={(value) => {
                  setSearch(value);
                  setOpen(!!value.trim());
                }}
              />
            </InputGroup>
          </Box>
        </PopoverAnchor>
        <PopoverContent
          align="end"
          className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchor.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <CommandList>
            {loading ? (
              <Inline aria-label="Loading members" className="p-4" justify="center" role="status">
                <LoadingIndicator size="sm" />
              </Inline>
            ) : isError ? (
              <Stack className="p-4" gap="sm">
                <p className="text-sm text-muted-foreground" role="alert">
                  Couldn’t load members
                </p>
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
                      <span className="truncate font-medium" title={formatMemberName(member)}>
                        {formatMemberName(member)}
                      </span>
                      {member.name?.trim() && (
                        <span
                          className="truncate text-sm text-muted-foreground"
                          title={member.email}
                        >
                          {member.email}
                        </span>
                      )}
                    </Stack>
                  </CommandItem>
                ))}
              </>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  );
}
