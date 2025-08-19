import {
    Button,
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
                    <TableHead>Tag</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>No. of posts</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="border-b-0">
                {items.map((item) => (
                    <TableRow
                        key={item.id}
                        className="hover:bg-muted/50 relative"
                    >
                        <TableCell className="w-1/2 static">
                            <a
                                className="before:absolute before:z-50 before:inset-0 before:bg-transparent font-medium block"
                                href={`#/tags/${item.slug}`}
                            >
                                {item.name}
                            </a>
                            <span className="text-muted-foreground text-sm block truncate">{item.description}</span>
                        </TableCell>
                        <TableCell className="w-1/4">{item.slug}</TableCell>
                        <TableCell className="">{item.count?.posts ?? 0}</TableCell>
                        <TableCell className="w-4 justify-end">
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
