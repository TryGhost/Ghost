// PROTOTYPE ONLY (NY-1750): a CSV made in the browser, so the members import can be walked through
// up to its mapping step (and the lead magnet note there) without a real file. Importing it is
// stopped before anything reaches the server. Don't merge this folder.
const FAKE_IMPORT_FILE_NAME = 'prototype-fake-members.csv';

export const FAKE_IMPORT_SIZES = [50, 120_000] as const;

export const createFakeImportCsv = (rows: number) => {
  const lines = ['email,name'];
  for (let index = 1; index <= rows; index += 1) {
    const number = String(index).padStart(6, '0');
    lines.push(`fake-member-${number}@example.com,Fake Member ${number}`);
  }
  return new File([`${lines.join('\n')}\n`], FAKE_IMPORT_FILE_NAME, { type: 'text/csv' });
};

export const isFakeImportFile = (file: File | null | undefined) =>
  file?.name === FAKE_IMPORT_FILE_NAME;
