import {
    Button,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@tryghost/shade';
import {Tag} from '@tryghost/admin-x-framework/api/tags';

const TagsList = ({items}: { items: Tag[] }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>No. of posts</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="border-b-0">
                {items.map(item => (
                    <TableRow
                        key={item.id}
                        className="relative hover:bg-muted/50"
                    >
                        <TableCell className="static w-1/2">
                            <a
                                className="block font-medium before:absolute before:inset-0 before:z-50 before:bg-transparent"
                                href={`#/tags/${item.slug}`}
                            >
                                {item.name}
                            </a>
                            <span className="block truncate text-sm text-muted-foreground">{item.description}</span>
                        </TableCell>
                        <TableCell className="w-1/4">{item.slug}</TableCell>
                        <TableCell className="">{item.count?.posts ?? 0}</TableCell>
                        <TableCell className="w-4 justify-end">
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
