import {GhEditorFileInput, GhEditorSelect, GhEditorToggle, type AddonEditorSettingsBridge, type GhEditorFile} from '@tryghost/addon-kit/editor-settings';
import {createChartConfigurationPatch, createChartFallbackWorkflow, createChartPatchFromFile, createLabelColumnPatch} from './editor-settings-model.ts';
import {isChartTable, numericValueColumns, readChartConfig, sampleChartTable} from './chart-data.ts';
import {renderChartPng} from './chart-engine.ts';
import {render} from 'preact';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';

function Settings({ghost}: {ghost: AddonEditorSettingsBridge}) {
    const [props, setProps] = useState(() => ghost.props);
    const [status, setStatus] = useState('Choose a CSV with a header row and up to 100 data rows.');
    const propsRef = useRef(ghost.props);
    const table = isChartTable(props.table) ? props.table : sampleChartTable;
    const config = readChartConfig(props, table);
    const columnOptions = table.columns.map(column => ({label: column, value: column}));
    const labelOptions = columnOptions.filter(option => numericValueColumns(table, option.value).length > 0);
    const valueColumns = numericValueColumns(table, config.labelColumn);
    const valueOptions = columnOptions.filter(option => valueColumns.includes(option.value));

    const fallbackWorkflow = useMemo(() => createChartFallbackWorkflow({
        renderImage: renderChartPng,
        uploadImage: image => ghost.assets.uploadImage(image),
        proposePatch: patch => ghost.proposePatch(patch),
        onError: error => setStatus(`Could not generate the email image: ${error.message}`)
    }), [ghost]);

    useEffect(() => {
        const unsubscribe = ghost.onPropsChange((nextProps) => {
            propsRef.current = nextProps;
            setProps(nextProps);
            fallbackWorkflow.sync(nextProps);
        });
        fallbackWorkflow.sync(propsRef.current);
        return () => {
            unsubscribe();
            fallbackWorkflow.cancel();
        };
    }, [fallbackWorkflow, ghost]);

    const changeChart = async (patch: Record<string, unknown>) => {
        const currentProps = propsRef.current;
        const nextProps = {...currentProps, ...patch, fallbackImageUrl: null};
        propsRef.current = nextProps;
        setProps(nextProps);
        await fallbackWorkflow.commit(currentProps, patch);
    };

    const selectFile = async (file: GhEditorFile) => {
        try {
            await changeChart(createChartPatchFromFile(file));
            setStatus(`Imported ${file.name}. The normalized table is now stored with the card.`);
        } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Could not import this file.');
        }
    };

    const configure = (patch: Record<string, unknown>) => changeChart(createChartConfigurationPatch(patch));

    return (
        <>
            <GhEditorFileInput
                accept=".csv,text/csv"
                description={status}
                label="CSV data"
                maxBytes={128 * 1024}
                onChange={event => void selectFile(event.detail)}
            />
            <GhEditorSelect
                label="Chart type"
                options={[{label: 'Bar', value: 'bar'}, {label: 'Line', value: 'line'}]}
                value={config.type}
                onChange={event => void configure({type: event.detail})}
            />
            <GhEditorSelect
                label="Label column"
                options={labelOptions}
                value={config.labelColumn}
                onChange={event => void changeChart(createLabelColumnPatch(table, event.detail, config.valueColumn))}
            />
            <GhEditorSelect
                label="Value series"
                options={valueOptions}
                value={config.valueColumn}
                onChange={event => void configure({valueColumn: event.detail})}
            />
            {config.type === 'line' && (
                <GhEditorToggle
                    checked={config.smooth}
                    description="Use a smooth curve between data points."
                    label="Smooth line"
                    onChange={event => void configure({smooth: event.detail})}
                />
            )}
        </>
    );
}

export default function renderEditorSettings(ghost: AddonEditorSettingsBridge) {
    if (ghost.blockName !== 'interactive-chart') {
        throw new Error(`Unknown editor block: ${ghost.blockName}`);
    }
    render(<Settings ghost={ghost} />, document.body);
}
