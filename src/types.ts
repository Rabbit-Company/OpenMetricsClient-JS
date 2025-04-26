import type { Registry } from "./Registry";

/**
 * Options for configuring a metrics registry
 * @interface RegistryOptions
 */
export interface RegistryOptions {
	/**
	 * Optional prefix to prepend to all metric names
	 * @type {string}
	 * @example
	 * new Registry({ prefix: "myapp" }) // Metrics will be "myapp_metricname"
	 */
	prefix?: string;

	/**
	 * Whether to automatically register metrics when they're created
	 * @type {boolean}
	 * @default false
	 */
	autoRegister?: boolean;
}

/**
 * Base options for all metric types
 * @interface MetricOptions
 */
export interface MetricOptions {
	/**
	 * The name of the metric (must be unique per registry)
	 * @type {string}
	 * @example "http_requests_total"
	 */
	name: string;

	/**
	 * Help text describing the metric
	 * @type {string}
	 * @example "Total number of HTTP requests"
	 */
	help: string;

	/**
	 * Optional unit of measurement
	 * @type {string}
	 * @example "seconds", "bytes"
	 */
	unit?: string;

	/**
	 * Array of metric label names
	 * @type {string[]}
	 * @example ["method", "endpoint"]
	 */
	labelNames?: string[];

	/**
	 * Optional registry to automatically register this metric
	 * @type {Registry}
	 */
	registry?: Registry;
}

/**
 * Data structure representing a Counter's current state
 * @interface CounterData
 */
export interface CounterData {
	/**
	 * Current numeric value of the counter
	 * @type {number}
	 */
	value: number;

	/**
	 * Last time the counter was updated
	 * @type {Date}
	 */
	updated: Date;

	/**
	 * When the counter was created
	 * @type {Date}
	 */
	created: Date;
}

/**
 * Data structure representing a Gauge's current state
 * @interface GaugeData
 */
export interface GaugeData {
	/**
	 * Current gauge value
	 * @type {number}
	 */
	value: number;

	/**
	 * Last time the gauge was updated
	 * @type {Date}
	 */
	updated: Date;
}

/**
 * Data structure representing a GaugeHistogram's current state
 * @interface GaugeHistogramData
 */
export interface GaugeHistogramData {
	/**
	 * Array of bucket boundaries
	 * @type {number[]}
	 */
	buckets: number[];

	/**
	 * Map of bucket values (key = bucket upper bound as string)
	 * @type {Map<string, number>}
	 */
	counts: Map<string, number>;

	/**
	 * Sum of all observed values
	 * @type {number}
	 */
	sum: number;

	/**
	 * Total number of observations
	 * @type {number}
	 */
	count: number;

	/**
	 * Last time the histogram was updated
	 * @type {Date}
	 */
	updated: Date;

	/**
	 * When the histogram was created
	 * @type {Date}
	 */
	created: Date;
}

/**
 * Data structure representing a Histogram's current state
 * @interface HistogramData
 */
export interface HistogramData {
	/**
	 * Array of bucket boundaries
	 * @type {number[]}
	 */
	buckets: number[];

	/**
	 * Map of bucket values (key = bucket upper bound as string)
	 * @type {Map<string, number>}
	 */
	counts: Map<string, number>;

	/**
	 * Sum of all observed values
	 * @type {number}
	 */
	sum: number;

	/**
	 * Total number of observations
	 * @type {number}
	 */
	count: number;

	/**
	 * Last time the histogram was updated
	 * @type {Date}
	 */
	updated: Date;

	/**
	 * When the histogram was created
	 * @type {Date}
	 */
	created: Date;
}

/**
 * Extended options for Summary metrics
 * @interface SummaryOptions
 * @extends {MetricOptions}
 */
export interface SummaryOptions extends MetricOptions {
	/**
	 * Quantiles to calculate (values between 0 and 1)
	 * @type {number[]}
	 * @default [0.5, 0.9, 0.99]
	 */
	quantiles?: number[];

	/**
	 * Maximum age of observations in seconds
	 * @type {number}
	 * @default 600 (10 minutes)
	 */
	maxAgeSeconds?: number;

	/**
	 * Number of buckets for the rolling window
	 * @type {number}
	 * @default 5
	 */
	ageBuckets?: number;
}

/**
 * Internal structure for Summary metric buckets
 * @interface SummaryBucket
 */
export interface SummaryBucket {
	/**
	 * Array of observed values in this bucket
	 * @type {number[]}
	 */
	values: number[];

	/**
	 * Sum of values in this bucket
	 * @type {number}
	 */
	sum: number;

	/**
	 * Number of observations in this bucket
	 * @type {number}
	 */
	count: number;

	/**
	 * When this bucket was created
	 * @type {number} Timestamp in milliseconds
	 */
	timestamp: number;
}

/**
 * Data structure representing a Summary's current state
 * @interface SummaryData
 */
export interface SummaryData {
	/**
	 * Sum of all observed values
	 * @type {number}
	 */
	sum: number;

	/**
	 * Total number of observations
	 * @type {number}
	 */
	count: number;

	/**
	 * Number of active buckets
	 * @type {number}
	 */
	buckets: number;

	/**
	 * Number of observations in current bucket
	 * @type {number}
	 */
	currentBucketSize: number;

	/**
	 * Configured maximum age of observations
	 * @type {number}
	 */
	maxAgeSeconds: number;

	/**
	 * Last time the summary was updated
	 * @type {Date}
	 */
	updated: Date;

	/**
	 * When the summary was created
	 * @type {Date}
	 */
	created: Date;
}
