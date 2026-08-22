import {defineEditorBlockRenderer, type AddonEditorBlockRequest} from '@tryghost/addon-kit/editor';
import {chartTitle, isChartTable, readChartConfig, sampleChartTable} from './chart-data.ts';
import {renderInteractiveChart, renderStaticChart} from './chart-engine.ts';
import {useEffect, useMemo, useRef} from 'preact/hooks';

function Chart({request}: {request: AddonEditorBlockRequest}) {
    const root = useRef<HTMLDivElement>(null);
    const table = isChartTable(request.props.table) ? request.props.table : sampleChartTable;
    const config = readChartConfig(request.props, table);
    const title = chartTitle(config);
    const svg = useMemo(() => renderStaticChart(table, config), [table, config.type, config.labelColumn, config.valueColumn, config.smooth]);

    useEffect(() => {
        if (!root.current) {
            return;
        }
        const chart = renderInteractiveChart(root.current, table, config);
        return () => chart.dispose();
    }, [table, config.type, config.labelColumn, config.valueColumn, config.smooth]);

    return (
        <figure className="chart-card">
            <div dangerouslySetInnerHTML={{__html: svg}} ref={root} aria-label={`${title} chart`} className="chart-card__visual" />
            <figcaption>{title}.</figcaption>
        </figure>
    );
}

function renderChart(request: AddonEditorBlockRequest) {
    if (request.blockName !== 'interactive-chart') {
        throw new Error(`Unknown editor block: ${request.blockName}`);
    }
    const fallbackImageUrl = typeof request.props.fallbackImageUrl === 'string' ? request.props.fallbackImageUrl : '';
    const table = isChartTable(request.props.table) ? request.props.table : sampleChartTable;
    const title = chartTitle(readChartConfig(request.props, table));
    return {
        content: <Chart request={request} />,
        portableContent: fallbackImageUrl
            ? (
                <figure style={{background: '#ffffff', border: '1px solid #dedee3', borderRadius: '18px', color: '#242426', fontFamily: 'Arial, sans-serif', margin: '0', padding: '20px'}}>
                    <img alt={`${title} chart`} src={fallbackImageUrl} style={{borderRadius: '10px', display: 'block', height: 'auto', width: '100%'}} />
                    <figcaption style={{color: '#626269', fontSize: '13px', lineHeight: '1.4', marginTop: '10px'}}>{title} chart.</figcaption>
                </figure>
            )
            : null,
        css: `
            .chart-card { box-sizing:border-box;margin:0;padding:22px;border:1px solid #dedee3;border-radius:20px;background:linear-gradient(145deg,#fff,#fafafd);box-shadow:0 12px 30px rgba(32,29,45,.08);color:#242426;font-family:ui-sans-serif,system-ui,sans-serif }
            .chart-card__visual { width:100%;min-height:380px }
            .chart-card__visual>svg { display:block;width:100%;height:auto }
            .chart-card figcaption { margin-top:8px;color:#626269;font-size:13px;line-height:1.4 }
        `,
        initialHeight: 460
    };
}

export default defineEditorBlockRenderer(renderChart, {hydrate: true});
