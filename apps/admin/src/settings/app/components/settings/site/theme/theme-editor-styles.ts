// Shared button class strings used across the theme editor surface.
// Kept in one place so the toolbar and editor controls stay visually in sync without drift.

const toolbarButtonClass = 'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a9eff] disabled:cursor-not-allowed disabled:opacity-50';

export const ghostButtonClass = `${toolbarButtonClass} border-[#2f333b] bg-transparent text-[#e6e7ea] hover:bg-[#1f2228]`;
export const primaryButtonClass = `${toolbarButtonClass} border-transparent bg-green text-black hover:bg-green-400`;
