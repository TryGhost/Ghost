import React from 'react';
import {Button, Card, CodeEditor, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@tryghost/shade/components';
import {Stack} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

interface TagCodeInjectionModalProps {
    disabled?: boolean;
    headerValue: string;
    footerValue: string;
    onHeaderChange: (value: string) => void;
    onFooterChange: (value: string) => void;
}

const htmlExtensions = [() => import('@codemirror/lang-html').then(module => module.html())];

const TagCodeInjectionModal: React.FC<TagCodeInjectionModalProps> = ({disabled, headerValue, footerValue, onHeaderChange, onFooterChange}) => {
    return (
        <Dialog>
            <Card data-testid='tag-code-injection-card'>
                <DialogTrigger asChild>
                    <Button className='group h-auto w-full justify-between rounded-xl px-6 py-5 text-left whitespace-normal hover:bg-transparent' type='button' variant='ghost'>
                        <Stack gap='none'>
                            <span className='text-[14px] font-semibold'>Code injection</span>
                            <span className='text-[13px] leading-[16px] font-normal tracking-normal text-muted-foreground'>Add styles/scripts to the header and footer.</span>
                        </Stack>
                        <LucideIcon.ArrowUpRight aria-hidden='true' className='opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100' />
                    </Button>
                </DialogTrigger>
            </Card>

            <DialogContent
                className='max-h-[calc(100vh-16vmin)] overflow-y-auto'
                data-testid='tag-code-injection-modal'
                // Ember's legacy max-width utilities override Tailwind's modal width in the shared Admin shell.
                style={{width: 'min(64rem, calc(100vw - 3rem))', maxWidth: 'none'}}
            >
                <DialogHeader>
                    <DialogTitle>Code injection</DialogTitle>
                    <DialogDescription>Add styles/scripts to the header and footer.</DialogDescription>
                </DialogHeader>

                <Stack gap='lg'>
                    <CodeEditor
                        data-testid='codeinjection-head'
                        editable={!disabled}
                        extensions={htmlExtensions}
                        height='240px'
                        title={<>Tag header <code className='ml-1 font-normal'>{'{{ghost_head}}'}</code></>}
                        value={headerValue}
                        onChange={onHeaderChange}
                    />
                    <CodeEditor
                        data-testid='codeinjection-foot'
                        editable={!disabled}
                        extensions={htmlExtensions}
                        height='240px'
                        title={<>Tag footer <code className='ml-1 font-normal'>{'{{ghost_foot}}'}</code></>}
                        value={footerValue}
                        onChange={onFooterChange}
                    />
                </Stack>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type='button' variant='outline'>Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TagCodeInjectionModal;
