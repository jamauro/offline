export const splitAllSettled = results => results.reduce((acc, { status, value, reason }) =>
  ({...acc, ...acc[status].push(value ?? reason)}),
  { fulfilled: [], rejected: [] }
);
