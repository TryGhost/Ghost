export default function mergeStatsByDate(list) {
    const reducedStatsByDate = list.reduce((acc, current) => {
        const currentDate = current.date;

        if (!acc[currentDate]) {
            acc[currentDate] = {
                date: currentDate,
                count: 0,
                positiveDelta: 0,
                negativeDelta: 0,
                signups: 0,
                cancellations: 0
            };
        }

        acc[currentDate].count += current.count;
        acc[currentDate].positiveDelta += current.positive_delta;
        acc[currentDate].negativeDelta += current.negative_delta;
        acc[currentDate].signups += current.signups;
        acc[currentDate].cancellations += current.cancellations;

        return acc;
    }, {});

    return Object.values(reducedStatsByDate);
}
