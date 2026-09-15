import * as probabilityDistributions from 'probability-distributions';

type EventShape = 'flat' | 'linear' | 'ease-in' | 'ease-out';
type EventTrend = 'positive' | 'negative';

type GenerateEventsOptions = {
  shape?: EventShape;
  trend?: EventTrend;
  total?: number;
  startTime?: Date;
  endTime?: Date;
};

export const generateEvents = ({
  shape = 'flat',
  trend = 'positive',
  total = 0,
  startTime = new Date(),
  endTime = new Date(),
}: GenerateEventsOptions = {}): Date[] => {
  if (total <= 0) {
    return [];
  }

  let alpha = 0;
  let beta = 0;
  let positiveTrend = trend === 'positive';
  switch (shape) {
    case 'linear':
      alpha = 2;
      beta = 1;
      break;
    case 'ease-in':
      alpha = 4;
      beta = 1;
      break;
    case 'ease-out':
      alpha = 1;
      beta = 4;
      positiveTrend = !positiveTrend;
      break;
    case 'flat':
      alpha = 1;
      beta = 1;
      break;
  }

  const data = probabilityDistributions.rbeta(total, alpha, beta, 0);
  const startTimeValue = startTime.valueOf();
  const timeDifference = endTime.valueOf() - startTimeValue;
  return data.map((x) => {
    if (!positiveTrend) {
      x = 1 - x;
    }
    return new Date(startTimeValue + timeDifference * x);
  });
};
