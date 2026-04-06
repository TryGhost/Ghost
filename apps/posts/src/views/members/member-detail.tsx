import MembersContent from './components/members-content';
import MembersLayout from './components/members-layout';
import {Avatar, AvatarFallback, AvatarImage, Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger, Input, Separator, Switch, Textarea} from '@tryghost/shade/components';
import {ListHeader} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {useNavigate} from '@tryghost/admin-x-framework';
import type React from 'react';

const MemberDetail: React.FC = () => {
    const navigate = useNavigate();

    return (
        <MembersLayout>
            <div className='sticky top-0 z-50 border-border'>
                <ListHeader blurredBackground={false} className='bg-background'>
                    <ListHeader.Left>
                        <div className='flex items-center gap-3'>
                            <ListHeader.BackButton onClick={() => navigate('/members-forward')} />
                            <ListHeader.Title>Member detail</ListHeader.Title>
                        </div>
                    </ListHeader.Left>
                    <ListHeader.Actions>
                        <ListHeader.ActionGroup>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button data-testid="members-actions" size='icon' variant='secondary'>
                                        <LucideIcon.MoreHorizontal className="size-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className='top-[8vh] max-w-[620px] gap-0 overflow-hidden rounded-[28px] border-none bg-transparent p-0 shadow-none'>
                                    <DialogTitle className='sr-only'>Share preview</DialogTitle>
                                    <DialogDescription className='sr-only'>Static share modal mockup for member detail prototype.</DialogDescription>
                                    <div className='relative h-[340px] overflow-hidden rounded-[28px] bg-background'>
                                        <div className='absolute inset-x-0 bottom-0 h-[190px] bg-[#F7F6E0]' />
                                        <DialogClose asChild>
                                            <button className='absolute top-8 left-8 z-20 flex size-(--control-height) items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80' type='button'>
                                                <LucideIcon.ArrowLeft className='size-5' />
                                            </button>
                                        </DialogClose>
                                        <div className='absolute top-8 right-8 z-10 h-[140px] w-[210px] overflow-hidden bg-muted'>
                                            <img alt='Desk setup' className='size-full object-cover' src='https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=900&h=600&fit=crop' />
                                        </div>
                                        <div className='relative z-10 flex h-full flex-col justify-between px-8 py-8'>
                                            <div />
                                            <div className='-mb-16 max-w-[500px] space-y-2'>
                                                <h2 className='[font-family:Times,serif] text-[55px] leading-[0.9] font-semibold tracking-tight text-foreground'>
                                                    Boom!
                                                    <br />
                                                    It&apos;s out there.
                                                </h2>
                                                <p className='mt-3 text-lg leading-none text-foreground'>That&apos;s 968 posts published.</p>
                                            </div>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-2'>
                                                    <Button className='size-(--control-height) bg-white text-foreground' size='icon' type='button' variant='secondary'>
                                                        <LucideIcon.X className='size-5 stroke-[2px]' />
                                                    </Button>
                                                    <Button className='size-(--control-height) bg-white text-foreground' size='icon' type='button' variant='secondary'>
                                                        <LucideIcon.AtSign className='size-5 stroke-[2px]' />
                                                    </Button>
                                                    <Button className='size-(--control-height) bg-white text-foreground' size='icon' type='button' variant='secondary'>
                                                        <LucideIcon.Facebook className='size-5 stroke-[2px]' />
                                                    </Button>
                                                    <Button className='size-(--control-height) bg-white text-foreground' size='icon' type='button' variant='secondary'>
                                                        <LucideIcon.Linkedin className='size-5 stroke-[2px]' />
                                                    </Button>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    <Button className='bg-background' type='button' variant='secondary'>Open post</Button>
                                                    <Button type='button'>Copy link</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button data-testid="members-actions">
                            Save
                            </Button>
                        </ListHeader.ActionGroup>
                    </ListHeader.Actions>
                </ListHeader>
            </div>
            <MembersContent>
                <div className='mx-auto w-full max-w-6xl space-y-10'>
                    <section className='flex items-center justify-between'>
                        <div className='flex basis-1/2 flex-col items-start gap-3 pt-5'>
                            <Avatar className='size-16'>
                                <AvatarImage alt='Carla Culhane' src='https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' />
                                <AvatarFallback>CC</AvatarFallback>
                            </Avatar>
                            <div className='min-w-0'>
                                <h2 className='truncate text-2xl leading-tight font-semibold tracking-tight'>Carla Culhane</h2>
                                <p className='text truncate text-muted-foreground'>carla@example.com</p>
                            </div>
                        </div>
                        <div className='grid basis-1/2 gap-4 sm:grid-cols-3'>
                            <div className='rounded-2xl bg-muted p-4'>
                                <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-gray-400/80 text-foreground'>
                                    <LucideIcon.Send className='size-4' />
                                </div>
                                <p className='text-sm text-muted-foreground'>Emails received</p>
                                <p className='pt-1 text-2xl leading-none font-semibold tracking-tight'>1,688</p>
                            </div>
                            <div className='rounded-2xl bg-muted p-4'>
                                <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-gray-400/80 text-foreground'>
                                    <LucideIcon.MailOpen className='size-4' />
                                </div>
                                <p className='text-sm text-muted-foreground'>Emails opened</p>
                                <p className='pt-1 text-2xl leading-none font-semibold tracking-tight'>873</p>
                            </div>
                            <div className='rounded-2xl bg-muted p-4'>
                                <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-gray-400/80 text-foreground'>
                                    <LucideIcon.Percent className='size-4' />
                                </div>
                                <p className='text-sm text-muted-foreground'>Average open rate</p>
                                <p className='tracking tight pt-1 text-2xl leading-none font-semibold'>51%</p>
                            </div>
                        </div>
                    </section>

                    <section className='space-y-4'>
                        <h3 className='pb-2 text-base font-medium text-muted-foreground'>Member details</h3>
                        <Separator />
                        <div className='grid gap-x-10 gap-y-6 sm:grid-cols-2'>
                            <div>
                                <p className='mb-1.5 text-muted-foreground'>Location</p>
                                <p className='text-md'>France</p>
                            </div>
                            <div>
                                <p className='mb-1.5 text-muted-foreground'>Last seen</p>
                                <p className='text-md'>24 Mar 2026</p>
                            </div>
                            <div>
                                <p className='mb-1.5 text-muted-foreground'>Created</p>
                                <p className='text-md'>21 Mar 2026</p>
                            </div>
                            <div>
                                <p className='mb-1.5 text-muted-foreground'>Comment status</p>
                                <div className='flex items-center gap-3 text-base'>
                                    <span className='inline-flex items-center gap-1.5 rounded-sm bg-red/10 px-2 py-0.5 text-red-500'>
                                        <LucideIcon.CircleOff className='size-3' />
                                        Blocked
                                    </span>
                                    <button className='underline!' type='button'>Manage</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className='space-y-4'>
                        <h3 className='pb-2 text-base font-medium text-muted-foreground'>General</h3>
                        <div className='rounded-2xl bg-surface-elevated p-5 shadow-xs'>
                            <div className='grid gap-5 lg:grid-cols-2'>
                                <div className='space-y-4'>
                                    <div>
                                        <p className='mb-1.5 text-sm text-muted-foreground'>Name</p>
                                        <Input value='Carla Culhane' readOnly />
                                    </div>
                                    <div>
                                        <p className='mb-1.5 text-sm text-muted-foreground'>Email</p>
                                        <Input value='carla@example.com' readOnly />
                                    </div>
                                    <div>
                                        <p className='mb-1.5 text-sm text-muted-foreground'>Labels</p>
                                        <Input value='VIP' readOnly />
                                    </div>
                                </div>
                                <div>
                                    <p className='mb-1.5 text-sm text-muted-foreground'>Notes</p>
                                    <Textarea className='min-h-[104px]' value='No notes' readOnly />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className='space-y-4'>
                        <h3 className='pb-2 text-base font-medium text-muted-foreground'>Newsletters</h3>
                        <Separator />
                        <div className='space-y-1'>
                            <div className='-mx-2 flex items-center justify-between rounded-lg p-2 hover:bg-muted'>
                                <div className='flex items-center gap-3'>
                                    <div className='flex size-8 items-center justify-center rounded-full border border-gray-400 bg-background'>
                                        <LucideIcon.Mail className='size-4' />
                                    </div>
                                    <span className='font-medium'>Handcrafted questionnaire</span>
                                </div>
                                <Switch checked={false} size='sm' />
                            </div>
                            <div className='-mx-2 flex items-center justify-between rounded-lg p-2 hover:bg-muted'>
                                <div className='flex items-center gap-3'>
                                    <div className='flex size-8 items-center justify-center rounded-full border border-gray-400 bg-background'>
                                        <LucideIcon.Mail className='size-4' />
                                    </div>
                                    <span className='font-medium'>Awesome foodstuff</span>
                                </div>
                                <Switch checked={false} size='sm' />
                            </div>
                        </div>
                    </section>
                </div>
            </MembersContent>
        </MembersLayout>
    );
};

export default MemberDetail;
