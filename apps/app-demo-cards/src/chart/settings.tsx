import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CardFile, CardSettingsPanel } from '@tryghost/app-sdk/cards/settings';

import { FileInput, Input, Note, Select, Toggle } from '../remote.ts';
import {
  isChartTable,
  numericValueColumns,
  readChartConfig,
  sampleChartTable,
} from './chart-data.ts';
import { renderChartPng } from './chart-engine.ts';
import {
  createChartConfigurationPatch,
  createChartFallbackWorkflow,
  createChartPatchFromFile,
  createLabelColumnPatch,
} from './editor-settings-model.ts';

function Settings({ panel }: { panel: CardSettingsPanel }) {
  const [properties, setProperties] = useState(() => panel.properties);
  const [status, setStatus] = useState(
    'A CSV with a header row and up to 100 rows. Without one, the card shows sample data.',
  );
  const propertiesRef = useRef(panel.properties);
  const table = isChartTable(properties.table) ? properties.table : sampleChartTable;
  const config = readChartConfig(properties, table);
  const columnOptions = table.columns.map((column) => ({ label: column, value: column }));
  const labelOptions = columnOptions.filter(
    (option) => numericValueColumns(table, option.value).length > 0,
  );
  const valueColumns = numericValueColumns(table, config.labelColumn);
  const valueOptions = columnOptions.filter((option) => valueColumns.includes(option.value));

  // Email can't run the chart, so the panel draws a picture of it and stores it on the site.
  const fallback = useMemo(
    () =>
      createChartFallbackWorkflow({
        renderImage: renderChartPng,
        uploadImage: (image) => panel.uploadImage(image),
        proposePatch: (patch) => panel.propose(patch),
        onError: (error) => setStatus(`Could not make the picture for email: ${error.message}`),
      }),
    [panel],
  );

  useEffect(() => {
    const unsubscribe = panel.onPropertiesChange((next) => {
      propertiesRef.current = next;
      setProperties(next);
      fallback.sync(next);
    });
    fallback.sync(propertiesRef.current);
    return () => {
      unsubscribe();
      fallback.cancel();
    };
  }, [fallback, panel]);

  const changeChart = async (patch: Record<string, unknown>) => {
    const current = propertiesRef.current;
    const next = { ...current, ...patch, fallbackImageUrl: null };
    propertiesRef.current = next;
    setProperties(next);
    await fallback.commit(current, patch);
  };

  const importFile = async (file: CardFile) => {
    try {
      await changeChart(createChartPatchFromFile(file));
      setStatus(`Imported ${file.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import this file.');
    }
  };

  const configure = (patch: Record<string, unknown>) =>
    changeChart(createChartConfigurationPatch(patch));

  return (
    <>
      <FileInput
        label="Data"
        accept=".csv,text/csv"
        buttonLabel="Import CSV"
        description={status}
        onChange={(event) => void importFile(event.detail)}
      />
      <Input
        label="Title"
        value={config.title}
        onChange={(event) => void configure({ title: event.detail })}
      />
      <Input
        label="Caption"
        description="Shown below the chart, and read out by screen readers."
        value={config.description}
        onChange={(event) => void configure({ description: event.detail })}
      />
      <Select
        label="Chart type"
        options={[
          { label: 'Bar', value: 'bar' },
          { label: 'Line', value: 'line' },
          { label: 'Pie', value: 'pie' },
        ]}
        value={config.type}
        onChange={(event) => void configure({ type: event.detail })}
      />
      <Select
        label="Labels"
        options={labelOptions}
        value={config.labelColumn}
        onChange={(event) =>
          void changeChart(createLabelColumnPatch(table, event.detail, config.valueColumn))
        }
      />
      <Select
        label="Values"
        options={valueOptions}
        value={config.valueColumn}
        onChange={(event) => void configure({ valueColumn: event.detail })}
      />
      {config.type === 'line' && (
        <Toggle
          label="Smooth line"
          checked={config.smooth}
          onChange={(event) => void configure({ smooth: event.detail })}
        />
      )}
      {config.type === 'bar' && (
        <Toggle
          label="Horizontal bars"
          checked={config.horizontal}
          onChange={(event) => void configure({ horizontal: event.detail })}
        />
      )}
      {config.type === 'pie' && (
        <Toggle
          label="Donut"
          checked={config.donut}
          onChange={(event) => void configure({ donut: event.detail })}
        />
      )}
      <Toggle
        label="Legend"
        checked={config.showLegend}
        onChange={(event) => void configure({ showLegend: event.detail })}
      />
      <Toggle
        label="Values on marks"
        checked={config.showValues}
        onChange={(event) => void configure({ showValues: event.detail })}
      />
      {!properties.fallbackImageUrl && <Note tone="info">Preparing the picture for email…</Note>}
    </>
  );
}

export function chartSettings(panel: CardSettingsPanel) {
  render(<Settings panel={panel} />, document.body);
}
