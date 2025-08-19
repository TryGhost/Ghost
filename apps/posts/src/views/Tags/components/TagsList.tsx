import {
    Button,
    formatNumber,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@tryghost/shade";
import { Tag } from "@tryghost/admin-x-framework/api/tags";

const TagsList = ({ items }: { items: Tag[] }) => {
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
                {items.map((item) => (
                    <TableRow
                        key={item.id}
                        className="relative"
                    >
                        <TableCell className="w-3/5 static p-4">
                            <a
                                className="before:absolute before:z-10 before:inset-0 font-medium text-lg block pb-1"
                                href={`#/tags/${item.slug}`}
                            >
                                {item.name}
                            </a>
                            <span className="text-muted-foreground block truncate">{item.description}</span>
                        </TableCell>
                        <TableCell className="p-4">{item.slug}</TableCell>
                        <TableCell className="p-4">
                            {item.count?.posts ? (
                                <a href={`#/posts?tag=${item.slug}`} className="relative inline-block z-10 p-4 -m-4 hover:underline">
                                    {formatNumber(item.count?.posts)} posts
                                </a>
                            ) : (
                                <span className="text-muted-foreground">0 posts</span>
                            )}
                        </TableCell>
                        <TableCell className="p-4 w-4 justify-end">
                            <Button
                                variant="outline"
                                size="icon"
                                className="w-12"
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
