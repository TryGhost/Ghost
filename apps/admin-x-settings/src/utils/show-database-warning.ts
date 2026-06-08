export function showDatabaseWarning(environment: string, database:string) : boolean {
    const isProduction = !!environment.match?.(/production/i);

    // Show a warning if we're in production and not using MySQL 8
    if (isProduction && database !== 'mysql8') {
        return true;
    }

    // Show a warning if we're in development and using MySQL 5
    if (!isProduction && database === 'mysql5') {
        return true;
    }

    return false;
}
