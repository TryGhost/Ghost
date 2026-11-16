declare const locations: {
  /** The original home of every service root. */
  readonly servicesRoot: string;
  readonly domainsRoot: string;
  /** Regular-expression source matching both homes of a root that boot.js initializes. */
  readonly bootOwnedServiceHomes: string;
  /** Regular-expression source matching every home of a defineService root. */
  readonly allServiceHomes: string;
  /** Regular-expression source matching the home of a reshaped root. */
  readonly reshapedServices: string;
};
export = locations;
