import {
    Button,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatNumber
} from '@tryghost/shade';
import {Tag} from '@tryghost/admin-x-framework/api/tags';

const TagsList = ({items}: { items: Tag[] }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="px-4">Tag</TableHead>
                    <TableHead className="px-4">Slug</TableHead>
                    <TableHead className="px-4">No. of posts</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map(item => (
                    <TableRow
                        key={item.id}
                        className="relative"
                    >
                        <TableCell className="static w-3/5 p-4">
                            <a
                                className="block pb-1 text-lg font-medium before:absolute before:inset-0 before:z-10"
                                href={`#/tags/${item.slug}`}
                            >
                                {item.name}
                            </a>
                            <span className="block truncate text-muted-foreground">{item.description}</span>
                        </TableCell>
                        <TableCell className="p-4">{item.slug}</TableCell>
                        <TableCell className="p-4">
                            {item.count?.posts ? (
                                <a className="relative z-10 -m-4 inline-block p-4 hover:underline" href={`#/posts?tag=${item.slug}`}>
                                    {`${formatNumber(item.count?.posts)} ${item.count?.posts === 1 ? 'post' : 'posts'}`}
                                </a>
                            ) : (
                                <span className="text-muted-foreground">0 posts</span>
                            )}
                        </TableCell>
                        <TableCell className="w-4 justify-end p-4">
                            <Button
                                className="w-12"
                                size="icon"
                                variant="outline"
                            >
                                <LucideIcon.Pencil />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default TagsList;
