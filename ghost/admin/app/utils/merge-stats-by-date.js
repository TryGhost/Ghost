export default function mergeDates(list, entry) {
    const [current, ...rest] = list;

    if (!current) {
        return entry ? [entry] : [];
    }

    if (!entry) {
        return mergeDates(rest, {
            date: current.date,
            count: current.count,
            positiveDelta: current.positive_delta,
            negativeDelta: current.negative_delta,
            signups: current.signups,
            cancellations: current.cancellations
        });
    }

    if (current.date === entry.date) {
        return mergeDates(rest, {
            date: entry.date,
            count: entry.count + current.count,
            positiveDelta: entry.positiveDelta + current.positive_delta,
            negativeDelta: entry.negativeDelta + current.negative_delta,
            signups: entry.signups + current.signups,
            cancellations: entry.cancellations + current.cancellations
        });
    }

    return [entry].concat(mergeDates(list));
}
