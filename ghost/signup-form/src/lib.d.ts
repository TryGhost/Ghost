declare module '@tryghost/color-utils' {
    export const textColorForBackgroundColor: (backgroundColor: string) => ({ hex(): string });
}
