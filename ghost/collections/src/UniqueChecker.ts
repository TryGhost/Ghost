export interface UniqueChecker {
    isUniqueSlug(slug: string): Promise<boolean>
}
