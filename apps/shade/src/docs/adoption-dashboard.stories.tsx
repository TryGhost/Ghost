import type {Meta, StoryObj} from '@storybook/react-vite';
import {Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue} from '@/components/patterns/kpi-card';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';

import data from './adoption-data.json';

const SHADE_COLOR = 'var(--chart-blue)';
const ADMINX_COLOR = 'var(--chart-yellow)';
const NEITHER_COLOR = 'var(--chart-gray)';

type AppRow = (typeof data.apps)[number];

const formatPct = (value: number, total: number) => {
    if (total === 0) {
        return '0%';
    }
    return `${Math.round((value / total) * 1000) / 10}%`;
};

const Dashboard = () => {
    const {snapshot, summary, apps, topShadeComponents, adminXDsComponentsAggregate, ember, publicApps} = data;

    const generatedAt = new Date(snapshot.generatedAt);
    const generatedLabel = generatedAt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const stackedData = apps.map((app: AppRow) => {
        const neither = Math.max(0, app.files - app.shadeFiles - app.adminXDsFiles);
        return {
            name: app.name,
            Shade: app.shadeFiles,
            'admin-x-design-system': app.adminXDsFiles,
            Neither: neither
        };
    });

    const topShade = topShadeComponents.slice(0, 15);
    const topShadeMax = Math.max(1, ...topShade.map(c => c.count));

    const adminXDsFilesRemaining = apps.reduce((sum: number, app: AppRow) => sum + app.adminXDsFiles, 0);

    return (
        <div className='shade' style={{padding: '32px', maxWidth: '1240px', margin: '0 auto'}}>
            <p className='mb-6 text-xs text-muted-foreground'>Last snapshot {generatedLabel}</p>

            <section className='mb-8'>
                <Card>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
                        <KpiCardHeader>
                            <KpiCardHeaderLabel>admin-x-DS files remaining</KpiCardHeaderLabel>
                            <KpiCardHeaderValue
                                diffDirection='hidden'
                                value={adminXDsFilesRemaining}
                            />
                            <span className='text-xs text-muted-foreground'>
                                Admin React files still importing the legacy design system — the retirement target
                            </span>
                        </KpiCardHeader>
                        <KpiCardHeader>
                            <KpiCardHeaderLabel>Shade exports in use (depth)</KpiCardHeaderLabel>
                            <KpiCardHeaderValue
                                diffDirection='hidden'
                                value={summary.uniqueShadeComponentsUsed}
                            />
                            <span className='text-xs text-muted-foreground'>
                                unique names imported from <code>@tryghost/shade*</code> across the four adopter apps
                            </span>
                        </KpiCardHeader>
                        <KpiCardHeader>
                            <KpiCardHeaderLabel>Legacy DS still in use</KpiCardHeaderLabel>
                            <KpiCardHeaderValue
                                diffDirection='hidden'
                                value={summary.adminXDsComponentsStillUsed}
                            />
                            <span className='text-xs text-muted-foreground'>
                                unique admin-x-design-system exports still imported (mainly in admin-x-settings)
                            </span>
                        </KpiCardHeader>
                        <KpiCardHeader>
                            <KpiCardHeaderLabel>Ember legacy surface</KpiCardHeaderLabel>
                            <KpiCardHeaderValue
                                diffDirection='hidden'
                                value={ember?.hbsFiles ?? 0}
                            />
                            <span className='text-xs text-muted-foreground'>
                                Handlebars templates still in <code>ghost/admin</code> (pre-React)
                            </span>
                        </KpiCardHeader>
                    </div>
                </Card>
            </section>

            <section className='mb-8'>
                <Card>
                    <CardHeader>
                        <CardTitle>Per-app adoption</CardTitle>
                        <CardDescription>
                            Files in each Admin React app, split by which design system they import. &quot;Neither&quot;
                            covers files that don&apos;t import a design system (utilities, hooks, types, contexts).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div style={{width: '100%', height: 360}}>
                            <ResponsiveContainer>
                                <BarChart data={stackedData} margin={{left: 8, right: 8, top: 8, bottom: 8}}>
                                    <CartesianGrid stroke='var(--border)' vertical={false} />
                                    <XAxis
                                        axisLine={{stroke: 'var(--border)'}}
                                        dataKey='name'
                                        tick={{fill: 'var(--muted-foreground)', fontSize: 12}}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tick={{fill: 'var(--muted-foreground)', fontSize: 12}}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            fontSize: 12
                                        }}
                                        cursor={{fill: 'var(--muted)', opacity: 0.3}}
                                    />
                                    <Legend wrapperStyle={{fontSize: 12}} />
                                    <Bar dataKey='Shade' fill={SHADE_COLOR} stackId='files' />
                                    <Bar dataKey='admin-x-design-system' fill={ADMINX_COLOR} stackId='files' />
                                    <Bar dataKey='Neither' fill={NEITHER_COLOR} stackId='files' />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className='mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Where Shade is doing the most work today</CardTitle>
                        <CardDescription>
                            Descriptive only: the names imported most often from <code>@tryghost/shade*</code> across
                            admin, posts, stats, and activitypub. High counts don&apos;t mean &quot;more is
                            better&quot; — they just show where Shade is load-bearing right now.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className='flex flex-col gap-2'>
                            {topShade.map(component => (
                                <li key={component.name} className='flex items-center gap-3'>
                                    <span className='w-44 shrink-0 truncate font-mono text-xs'>{component.name}</span>
                                    <div className='relative h-5 grow rounded-sm bg-muted'>
                                        <div
                                            className='absolute inset-y-0 left-0 rounded-sm'
                                            style={{
                                                width: `${(component.count / topShadeMax) * 100}%`,
                                                background: SHADE_COLOR
                                            }}
                                        />
                                    </div>
                                    <span className='w-10 shrink-0 text-right font-mono text-xs text-muted-foreground'>
                                        {component.count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>admin-x-design-system migration punch list</CardTitle>
                        <CardDescription>
                            Every admin-x-design-system export still imported across the Admin React apps, ranked by
                            usage. Replacing the most-used ones with Shade equivalents yields the biggest wins.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className='max-h-[420px] overflow-auto'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component</TableHead>
                                        <TableHead className='text-right'>Usage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adminXDsComponentsAggregate.map(component => (
                                        <TableRow key={component.name}>
                                            <TableCell className='font-mono text-xs'>{component.name}</TableCell>
                                            <TableCell className='text-right font-mono text-xs'>
                                                {component.count}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className='mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Per-app breakdown</CardTitle>
                        <CardDescription>The same data as the chart above, in numbers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>App</TableHead>
                                    <TableHead className='text-right'>Files</TableHead>
                                    <TableHead className='text-right'>Shade</TableHead>
                                    <TableHead className='text-right'>admin-x-DS</TableHead>
                                    <TableHead className='text-right'>% Shade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {apps.map((app: AppRow) => (
                                    <TableRow key={app.name}>
                                        <TableCell className='font-mono text-xs'>{app.name}</TableCell>
                                        <TableCell className='text-right font-mono text-xs'>{app.files}</TableCell>
                                        <TableCell className='text-right font-mono text-xs'>{app.shadeFiles}</TableCell>
                                        <TableCell className='text-right font-mono text-xs'>
                                            {app.adminXDsFiles}
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-xs'>
                                            {formatPct(app.shadeFiles, app.files)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ember legacy admin</CardTitle>
                        <CardDescription>
                            <code>ghost/admin</code> is the original Ember client. It doesn&apos;t use Shade or any
                            React design system — it&apos;s being migrated to React surface by surface. Measured by
                            file counts since there are no components to import.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <dl className='grid grid-cols-2 gap-4'>
                            <div>
                                <dt className='text-xs text-muted-foreground'>Handlebars templates</dt>
                                <dd className='font-mono text-2xl'>{ember?.hbsFiles ?? 0}</dd>
                            </div>
                            <div>
                                <dt className='text-xs text-muted-foreground'>Spirit utility CSS files</dt>
                                <dd className='font-mono text-2xl'>{ember?.spiritUtilityFiles ?? 0}</dd>
                            </div>
                            <div>
                                <dt className='text-xs text-muted-foreground'>Pattern CSS files</dt>
                                <dd className='font-mono text-2xl'>{ember?.patternFiles ?? 0}</dd>
                            </div>
                            <div>
                                <dt className='text-xs text-muted-foreground'>Component CSS files</dt>
                                <dd className='font-mono text-2xl'>{ember?.componentCssFiles ?? 0}</dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </section>

            <section className='mb-8'>
                <Card>
                    <CardHeader>
                        <CardTitle>Public apps</CardTitle>
                        <CardDescription>
                            UMD bundles served to site visitors via the CDN. They have their own per-app styling and
                            are <strong>out of scope</strong> for the Shade migration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='flex flex-wrap items-center gap-2'>
                        <span className='font-mono text-2xl'>{publicApps.count}</span>
                        <span className='text-sm text-muted-foreground'>apps:</span>
                        {publicApps.names.map(name => (
                            <Badge key={name} variant='secondary'>
                                {name}
                            </Badge>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <footer className='mt-12 border-t border-border pt-6 text-xs text-muted-foreground'>
                <p className='mb-2'>
                    <strong>How this is measured.</strong> The extraction script scans every <code>.ts/.tsx</code>{' '}
                    file under each app&apos;s <code>src/</code> (excluding stories and tests) and records which
                    files import from <code>@tryghost/shade*</code> or{' '}
                    <code>@tryghost/admin-x-design-system</code>. Component counts are the unique named imports
                    parsed from those statements.
                </p>
                <p>
                    <strong>What this is not.</strong> &quot;Shade adoption %&quot; is intentionally absent. Many
                    files (utilities, hooks, types, contexts) legitimately don&apos;t need a design system, so
                    counting them as &quot;not adopted&quot; would be misleading. The number that matters for the
                    migration is the count of files still importing the legacy DS, plus the punch list of specific
                    exports still in use.
                </p>
            </footer>
        </div>
    );
};

const meta = {
    title: 'Overview / Design System Landscape',
    component: Dashboard,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'A snapshot of which design systems each Ghost admin surface uses today. The goal isn\'t to maximize Shade imports — many files (utilities, hooks, contexts) legitimately don\'t need a design system. The useful signal is **legacy retirement progress**: how many files still depend on `@tryghost/admin-x-design-system`, and which specific exports are blocking their migration. Data is generated by `pnpm --filter @tryghost/shade run adoption:extract` and committed as `adoption-data.json`.'
            }
        }
    }
} satisfies Meta<typeof Dashboard>;

export default meta;

type Story = StoryObj<typeof Dashboard>;

export const Snapshot: Story = {};
