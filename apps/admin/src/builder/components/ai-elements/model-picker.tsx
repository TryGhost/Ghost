import {useEffect, useState} from 'react';

import {Button, Command, CommandCheck, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade/components';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import type {BuilderProvider, CuratedModel} from '@/builder/models/curated-models';

const providerNames: Record<BuilderProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic'
};

export const ModelPicker = ({provider, modelId, models, disabled, onSelect}: {
    provider: BuilderProvider;
    modelId: string;
    models: readonly CuratedModel[];
    disabled?: boolean;
    onSelect: (provider: BuilderProvider, modelId: string) => void;
}) => {
    const [open, setOpen] = useState(false);
    const selected = models.find(model => model.provider === provider && model.id === modelId);
    const selectedName = selected?.name ?? modelId;

    useEffect(() => {
        if (disabled) {
            setOpen(false);
        }
    }, [disabled]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    aria-expanded={open}
                    aria-label={`Choose model: ${selectedName}`}
                    className='h-8 max-w-52 justify-start px-2 font-normal'
                    disabled={disabled}
                    role='combobox'
                    size='sm'
                    type='button'
                    variant='ghost'
                >
                    <LucideIcon.Bot aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' />
                    <Text className='truncate' size='sm'>{selectedName}</Text>
                    <LucideIcon.ChevronDown aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' />
                </Button>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-72 p-0'>
                <Command>
                    <CommandInput aria-label='Search models' placeholder='Search models…' />
                    <CommandList>
                        <CommandEmpty>No models found.</CommandEmpty>
                        {(Object.keys(providerNames) as BuilderProvider[]).map(providerKey => (
                            <CommandGroup key={providerKey} heading={providerNames[providerKey]}>
                                {models.filter(model => model.provider === providerKey).map(model => (
                                    <CommandItem
                                        key={`${model.provider}:${model.id}`}
                                        disabled={disabled}
                                        value={`${providerNames[model.provider]} ${model.name} ${model.id}`}
                                        onSelect={() => {
                                            if (disabled) {
                                                return;
                                            }
                                            onSelect(model.provider, model.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <Inline align='center' className='min-w-0 flex-1' gap='sm'>
                                            <Text className='truncate' size='sm'>{model.name}</Text>
                                        </Inline>
                                        {model.provider === provider && model.id === modelId && <CommandCheck />}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
