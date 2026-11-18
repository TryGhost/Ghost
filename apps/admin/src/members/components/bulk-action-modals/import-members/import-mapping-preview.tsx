// PROTOTYPE ONLY (NY-1750): the import's real mapping step on made-up rows, for the lead magnet
// patterns page, with the label field supplied by the page. Nothing is imported. Don't merge.
import { type ReactNode, useMemo, useState } from 'react';
import { MappingStep } from '@/members/components/bulk-action-modals/import-members/mapping-step';
import {
  MembersFieldMapping,
  detectFieldTypes,
  getFieldMappings,
} from '@/members/components/bulk-action-modals/import-members/mapping';
import { fieldTargets } from '@/members/components/bulk-action-modals/import-members/field-targets';
import { type UseLabelPickerResult } from '@/members/hooks/use-label-picker';

// With `labelsByRow`, the file gets a "labels" column, its values cycled down the rows.
const fakeRows = (count: number, labelsByRow?: string[]) =>
  Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(6, '0');
    const row: Record<string, string> = {
      email: `fake-member-${number}@example.com`,
      name: `Fake Member ${number}`,
    };
    if (labelsByRow?.length) {
      row.labels = labelsByRow[index % labelsByRow.length];
    }
    return row;
  });

// The label names in whichever column is mapped to Labels, each once, in file order.
const fileLabelNames = (rows: Record<string, string>[], column: string | null): string[] => {
  if (!column) {
    return [];
  }
  const names = rows.flatMap((row) => (row[column] ?? '').split(','));
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))];
};

// labelField stands in for the label field, so the step never reads the picker.
const UNUSED_LABEL_PICKER = {} as UseLabelPickerResult;

// `labelField` can be a function of the file's label names, so the page's note can follow the
// Labels column as it's mapped and unmapped.
export const ImportMappingPreview: React.FC<{
  rowCount: number;
  labelsByRow?: string[];
  labelField: ReactNode | ((fileLabels: string[]) => ReactNode);
  // The Import button, with the file's label names as mapped. Without it, Import does nothing.
  onImport?: (fileLabels: string[]) => void;
}> = ({ rowCount, labelsByRow, labelField, onImport }) => {
  const fileData = useMemo(() => fakeRows(rowCount, labelsByRow), [rowCount, labelsByRow]);
  const [mapping, setMapping] = useState(
    () => new MembersFieldMapping(detectFieldTypes(fakeRows(1, labelsByRow))),
  );
  const fileLabels = useMemo(
    () => fileLabelNames(fileData, mapping.getKeyByValue('labels')),
    [fileData, mapping],
  );
  const [dataPreviewIndex, setDataPreviewIndex] = useState(0);
  const targetGroups = useMemo(
    () => fieldTargets({ membershipFields: getFieldMappings(), customFieldColumns: [] }),
    [],
  );
  return (
    <MappingStep
      canCreateCustomFields={false}
      dataPreviewIndex={dataPreviewIndex}
      fileData={fileData}
      labelField={typeof labelField === 'function' ? labelField(fileLabels) : labelField}
      labelPicker={UNUSED_LABEL_PICKER}
      mapping={mapping}
      mappingError={null}
      showMappingErrors={false}
      status="MAPPING"
      targetGroups={targetGroups}
      onColumnsChanged={() => {}}
      onDataPreviewIndexChange={setDataPreviewIndex}
      onFieldCreated={() => {}}
      onStartOver={() => {}}
      onUpdateMapping={(from, to) => setMapping((current) => current.updateMapping(from, to))}
      onUpload={() => onImport?.(fileLabels)}
    />
  );
};
