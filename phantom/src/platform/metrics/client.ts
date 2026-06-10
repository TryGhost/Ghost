type CounterRecord = {name: string; value: number};
type GaugeRecord = {name: string; value: number};

export type MetricsClient = {
    isEnabled: () => boolean;
    setEnabled: (enabled: boolean) => void;
    increment: (name: string, value?: number) => void;
    setGauge: (name: string, value: number) => void;
    render: () => string;
};

let client: MetricsClient | null = null;

export const getMetricsClient = () => {
    if (client) {
        return client;
    }

    const counters = new Map<string, CounterRecord>();
    const gauges = new Map<string, GaugeRecord>();
    const startTime = Date.now();
    let enabled = false;

    const isEnabled = () => enabled;
    const setEnabled = (next: boolean) => {
        enabled = next;
    };
    const increment = (name: string, value = 1) => {
        const existing = counters.get(name) ?? {name, value: 0};
        existing.value += value;
        counters.set(name, existing);
    };
    const setGauge = (name: string, value: number) => {
        gauges.set(name, {name, value});
    };
    const render = () => {
        const lines = ['# HELP phantom_uptime_seconds Process uptime in seconds', '# TYPE phantom_uptime_seconds gauge'];
        lines.push(`phantom_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}`);
        for (const gauge of gauges.values()) {
            lines.push(`# TYPE ${gauge.name} gauge`);
            lines.push(`${gauge.name} ${gauge.value}`);
        }
        for (const counter of counters.values()) {
            lines.push(`# TYPE ${counter.name} counter`);
            lines.push(`${counter.name} ${counter.value}`);
        }
        return `${lines.join('\n')}\n`;
    };

    client = {
        isEnabled,
        setEnabled,
        increment,
        setGauge,
        render
    };

    return client;
};
