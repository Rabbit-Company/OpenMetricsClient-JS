/**
 * The standard Content-Type header value for OpenMetrics format
 * @constant
 * @type {string}
 * @default "application/openmetrics-text; version=1.0.0; charset=utf-8"
 * @example
 * // Using with HTTP response
 * res.setHeader('Content-Type', OPENMETRICS_CONTENT_TYPE);
 *
 * // Using with fetch API
 * const headers = new Headers();
 * headers.set('Content-Type', OPENMETRICS_CONTENT_TYPE);
 */
export declare const OPENMETRICS_CONTENT_TYPE = "application/openmetrics-text; version=1.0.0; charset=utf-8";
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
declare abstract class BaseMetric {
	/**
	 * The name of the metric (must be unique within its registry)
	 * @public
	 * @readonly
	 */
	readonly name: string;
	/**
	 * Descriptive help text for the metric
	 * @public
	 * @readonly
	 */
	readonly help: string;
	/**
	 * Optional unit of measurement for the metric
	 * @public
	 * @readonly
	 */
	readonly unit?: string;
	/**
	 * Array of allowed label names for this metric
	 * @public
	 * @readonly
	 */
	readonly labelNames: string[];
	/**
	 * Reference to the registry this metric is registered with (if any)
	 * @public
	 */
	registry?: Registry;
	/**
	 * Creates a new BaseMetric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options for the metric
	 * @throws {Error} If label name validation fails
	 */
	constructor(options: MetricOptions);
	/**
	 * Validates metric label names
	 * @private
	 * @throws {Error} If any label name is invalid
	 */
	private validateLabelNames;
	/**
	 * Validates provided label values against expected label names
	 * @protected
	 * @param {Record<string, string>} labels - Labels to validate
	 * @throws {Error} If labels don't match expected label names
	 */
	protected validateLabels(labels?: Record<string, string>): void;
	/**
	 * Gets the fully qualified metric name with optional prefix
	 * @param {string} [prefix] - Optional prefix to prepend
	 * @returns {string} Full metric name
	 * @example
	 * metric.getFullName('app') // returns 'app_requests'
	 */
	getFullName(prefix?: string): string;
	/**
	 * Formats labels for OpenMetrics output
	 * @protected
	 * @param {Record<string, string>} labels - Labels to format
	 * @returns {string} Formatted label string in OpenMetrics format
	 */
	protected formatLabels(labels?: Record<string, string>): string;
	/**
	 * Generates metadata lines for OpenMetrics output
	 * @protected
	 * @param {string} type - The metric type (counter, gauge, etc.)
	 * @param {string} [prefix] - Optional name prefix
	 * @returns {string} Formatted metadata lines
	 */
	protected metadata(type: string, prefix?: string): string;
	/**
	 * Abstract method to generate complete OpenMetrics output for the metric
	 * @abstract
	 * @param {string} [prefix] - Optional name prefix
	 * @returns {string} Complete OpenMetrics formatted metric data
	 */
	abstract getMetric(prefix?: string): string;
}
/**
 * A registry for collecting and managing metrics.
 *
 * The Registry is responsible for storing metrics, enforcing uniqueness,
 * and generating OpenMetrics-compatible output.
 *
 * @class Registry
 * @example
 * const registry = new Registry({ prefix: "app" });
 * const counter = new Counter({ name: 'requests', help: 'Total requests', registry });
 * console.log(registry.metricsText());
 */
export declare class Registry {
	/**
	 * Internal storage of metrics using a Map with composite keys
	 * @private
	 */
	private metrics;
	/**
	 * Optional prefix for all metric names
	 * @private
	 */
	private prefix?;
	/**
	 * Whether to automatically set the registry reference on registered metrics
	 * @private
	 * @readonly
	 */
	private readonly autoRegister;
	/**
	 * Returns the standard OpenMetrics content type header value
	 * @static
	 * @returns {string} The content type string for OpenMetrics
	 * @example
	 * res.setHeader('Content-Type', Registry.contentType);
	 */
	static get contentType(): string;
	/**
	 * Instance accessor for the content type
	 * @returns {string} The content type string for OpenMetrics
	 * @example
	 * res.setHeader('Content-Type', registry.contentType);
	 */
	get contentType(): string;
	/**
	 * Creates a new Registry instance
	 * @constructor
	 * @param {RegistryOptions} [options] - Configuration options
	 */
	constructor(options?: RegistryOptions);
	/**
	 * Registers a new metric with the registry
	 * @param {BaseMetric} metric - The metric to register
	 * @throws {Error} If a metric with the same name already exists
	 * @example
	 * registry.register(new Counter({ name: 'hits', help: 'Page hits' }));
	 */
	register(metric: BaseMetric): void;
	/**
	 * Unregisters a metric by name
	 * @param {string} name - The metric name to remove
	 * @returns {boolean} True if the metric was found and removed
	 */
	unregister(name: string): boolean;
	/**
	 * Gets all registered metrics
	 * @returns {BaseMetric[]} Array of all registered metrics
	 */
	getMetrics(): BaseMetric[];
	/**
	 * Finds a metric by name
	 * @param {string} name - The metric name to find
	 * @returns {BaseMetric|undefined} The found metric or undefined
	 */
	getMetric(name: string): BaseMetric | undefined;
	/**
	 * Generates OpenMetrics-compatible text output
	 * @returns {string} Formatted metrics text
	 */
	metricsText(): string;
	/**
	 * Clears all metrics from the registry
	 */
	clear(): void;
}
/**
 * A counter metric that represents a monotonically increasing value.
 * Supports multiple time series with dynamic labels.
 * Counters are typically used to track request counts, completed tasks, or errors.
 * @class Counter
 * @extends BaseMetric
 * @example
 * const counter = new Counter({
 *   name: 'http_requests',
 *   help: 'Total HTTP requests',
 *   labelNames: ['method', 'status']
 * });
 * counter.labels({ method: 'GET', status: '200' }).inc();
 * counter.labels({ method: 'POST', status: '500' }).inc(2);
 */
export declare class Counter extends BaseMetric {
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Counter instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
	/**
	 * Increments the counter value for specific labels
	 * @param {number} [amount=1] - The amount to increment by (must be positive)
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 * @throws {Error} If amount is negative
	 */
	inc(amount?: number, labels?: Record<string, string>): void;
	/**
	 * Gets the current counter state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {CounterData} Object containing value and timestamps
	 */
	get(labels?: Record<string, string>): CounterData;
	/**
	 * Resets the counter to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @returns {void}
	 */
	reset(labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {CounterLabelInterface} Interface with inc method
	 */
	labels(labels?: Record<string, string>): CounterLabelInterface;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted counter data
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled counter time series
 * @typedef {Object} CounterLabelInterface
 * @property {function(number=): void} inc - Increment the counter value
 */
export interface CounterLabelInterface {
	inc(amount?: number): void;
}
/**
 * A gauge metric that represents a value that can go up or down.
 * Supports multiple time series with dynamic labels.
 * @class Gauge
 * @extends BaseMetric
 * @example
 * const gauge = new Gauge({
 *   name: 'temperature',
 *   help: 'Current temperature',
 *   labelNames: ['location']
 * });
 * gauge.labels({ location: 'kitchen' }).set(23.5);
 * gauge.labels({ location: 'bedroom' }).inc(0.5);
 */
export declare class Gauge extends BaseMetric {
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Gauge instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
	/**
	 * Increments the gauge value for specific labels
	 * @param {number} [amount=1] - The amount to increment by
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	inc(amount?: number, labels?: Record<string, string>): void;
	/**
	 * Decrements the gauge value for specific labels
	 * @param {number} [amount=1] - The amount to decrement by
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	dec(amount?: number, labels?: Record<string, string>): void;
	/**
	 * Sets the gauge to a specific value for specific labels
	 * @param {number} value - The new value to set
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	set(value: number, labels?: Record<string, string>): void;
	/**
	 * Gets the current gauge state
	 * @returns {GaugeData} Object containing value and timestamp
	 * @example
	 * const data = gauge.get();
	 * console.log(data.value, data.updated);
	 */
	get(labels?: Record<string, string>): GaugeData | null;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {GaugeLabelInterface} Interface with inc, dec, and set methods
	 */
	labels(labels?: Record<string, string>): GaugeLabelInterface;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted gauge data
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled gauge time series
 * @typedef {Object} GaugeLabelInterface
 * @property {function(number=): void} inc - Increment the gauge value
 * @property {function(number=): void} dec - Decrement the gauge value
 * @property {function(number): void} set - Set the gauge to a specific value
 */
export interface GaugeLabelInterface {
	inc(amount?: number): void;
	dec(amount?: number): void;
	set(value: number): void;
}
/**
 * A Histogram metric that tracks observations in configurable buckets
 * with support for multiple time series via dynamic labels.
 *
 * Histograms are typically used to measure request durations, response sizes,
 * or other value distributions where you want to analyze quantiles.
 * @class Histogram
 * @extends BaseMetric
 * @example
 * const histogram = new Histogram({
 *   name: 'http_request_duration_seconds',
 *   help: 'HTTP request duration distribution',
 *   labelNames: ['method', 'status'],
 *   buckets: [0.1, 0.5, 1, 2.5]
 * });
 *
 * // Record observations with labels
 * histogram.labels({ method: 'GET', status: '200' }).observe(0.3);
 * histogram.labels({ method: 'POST', status: '500' }).observe(1.2);
 */
export declare class Histogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets;
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Histogram instance
	 * @constructor
	 * @param {MetricOptions & { buckets?: number[] }} options - Configuration options
	 * @throws {Error} If bucket values are invalid (non-positive or non-finite)
	 */
	constructor(options: MetricOptions & {
		buckets?: number[];
	});
	/**
	 * Initializes a new time series with zero values
	 * @private
	 * @returns {Object} Initialized time series data structure
	 */
	private initializeTimeSeries;
	/**
	 * Records a new observation in the histogram for specific labels
	 * @param {number} value - The value to observe (must be non-negative)
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @throws {Error} If value is negative or not finite
	 * @example
	 * histogram.observe(0.3, { method: 'GET', status: '200' });
	 */
	observe(value: number, labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {HistogramLabelInterface} Interface with observe method
	 * @example
	 * const labeledHistogram = histogram.labels({ method: 'GET' });
	 * labeledHistogram.observe(0.3);
	 */
	labels(labels?: Record<string, string>): HistogramLabelInterface;
	/**
	 * Resets all histogram values to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @example
	 * histogram.reset({ method: 'GET' });
	 */
	reset(labels?: Record<string, string>): void;
	/**
	 * Gets a snapshot of current histogram state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {HistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = histogram.getSnapshot({ method: 'GET' });
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(labels?: Record<string, string>): HistogramData;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted histogram data
	 * @example
	 * console.log(histogram.getMetric());
	 * // # TYPE http_request_duration_seconds histogram
	 * // http_request_duration_seconds_bucket{le="0.1",method="GET"} 0
	 * // http_request_duration_seconds_bucket{le="0.5",method="GET"} 1
	 * // http_request_duration_seconds_bucket{le="+Inf",method="GET"} 1
	 * // http_request_duration_seconds_count{method="GET"} 1
	 * // http_request_duration_seconds_sum{method="GET"} 0.3
	 * // http_request_duration_seconds_created{method="GET"} 1625097600
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled histogram time series
 * @interface HistogramLabelInterface
 * @property {function(number): void} observe - Records a value in the histogram
 */
export interface HistogramLabelInterface {
	/**
	 * Records a value in the histogram
	 * @param {number} value - The value to observe (must be non-negative)
	 */
	observe(value: number): void;
}
/**
 * A Summary metric that calculates configurable quantiles over a sliding time window
 * with support for both labeled and unlabeled time series.
 *
 * Summaries are used to track distributions of observations (like request durations)
 * while maintaining efficient memory usage through bucket rotation. They provide:
 * - Quantile calculations over a sliding time window
 * - Total sum and count of observations
 * - Both labeled and unlabeled metric support
 *
 * @class Summary
 * @extends BaseMetric
 * @example
 * // Basic usage
 * const summary = new Summary({
 *   name: 'request_duration_seconds',
 *   help: 'Request duration distribution',
 *   quantiles: [0.5, 0.95],
 *   maxAgeSeconds: 300
 * });
 *
 * // Record observations
 * summary.observe(0.25);
 *
 * // Labeled usage
 * summary.labels({ method: 'GET' }).observe(0.3);
 */
export declare class Summary extends BaseMetric {
	/**
	 * Array of quantiles to calculate (values between 0 and 1)
	 * @private
	 * @readonly
	 */
	private readonly quantiles;
	/**
	 * Maximum age of observations in seconds
	 * @private
	 * @readonly
	 */
	private readonly maxAgeSeconds;
	/**
	 * Number of buckets for the sliding window
	 * @private
	 * @readonly
	 */
	private readonly ageBuckets;
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Summary instance
	 * @constructor
	 * @param {SummaryOptions} options - Configuration options
	 * @throws {Error} If quantiles are invalid
	 */
	constructor(options: SummaryOptions);
	/**
	 * Creates a new empty bucket
	 * @private
	 * @returns {SummaryBucket} New bucket instance
	 */
	private createBucket;
	/**
	 * Validates that quantiles are between 0 and 1
	 * @private
	 * @throws {Error} If any quantile is invalid
	 */
	private validateQuantiles;
	/**
	 * Initializes a new time series with empty buckets
	 * @private
	 * @param {string} key - The time series key
	 * @returns {Object} Initialized time series data structure
	 */
	private initializeTimeSeries;
	/**
	 * Rotates buckets and maintains the sliding window for a specific time series
	 * @private
	 * @param {string} key - The time series key to rotate
	 */
	private rotateBuckets;
	/**
	 * Recalculates sum and count from all valid buckets
	 * @private
	 * @param {Object} series - The time series to recalculate
	 */
	private recalculateAggregates;
	/**
	 * Records a new observation in the summary
	 * @param {number} value - The value to observe (must be finite and non-negative)
	 * @param {Record<string, string>} [labels] - Optional label values
	 * @throws {Error} If value is invalid or labels are invalid
	 * @example
	 * // Unlabeled observation
	 * summary.observe(0.25);
	 *
	 * // Labeled observation
	 * summary.observe(0.3, { method: 'GET' });
	 */
	observe(value: number, labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} [labels] - Optional label values
	 * @returns {SummaryLabelInterface} Interface with observe method
	 * @example
	 * // Get labeled interface
	 * const labeled = summary.labels({ method: 'GET' });
	 * labeled.observe(0.3);
	 *
	 * // Get unlabeled interface
	 * const unlabeled = summary.labels();
	 * unlabeled.observe(0.4);
	 */
	labels(labels?: Record<string, string>): SummaryLabelInterface;
	/**
	 * Resets summary values for a specific labeled time series or all
	 * @param {Record<string, string>} [labels] - Optional label values to reset
	 * @example
	 * // Reset specific labels
	 * summary.reset({ method: 'GET' });
	 *
	 * // Reset all
	 * summary.reset();
	 */
	reset(labels?: Record<string, string>): void;
	/**
	 * Gets a snapshot of current summary state
	 * @param {Record<string, string>} [labels] - Optional label values to get
	 * @returns {SummaryData} Current summary statistics
	 * @example
	 * // Get snapshot for specific labels
	 * const stats = summary.getSnapshot({ method: 'GET' });
	 *
	 * // Get snapshot for unlabeled
	 * const defaultStats = summary.getSnapshot();
	 */
	getSnapshot(labels?: Record<string, string>): SummaryData;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted summary data
	 * @example
	 * // Example output:
	 * // # TYPE request_duration_seconds summary
	 * // request_duration_seconds{quantile="0.5"} 0.25
	 * // request_duration_seconds{quantile="0.95"} 0.42
	 * // request_duration_seconds_sum 3.5
	 * // request_duration_seconds_count 10
	 * // request_duration_seconds_created 1625097600
	 */
	getMetric(prefix?: string): string;
	/**
	 * Cleans up all summary time series by stopping rotation and clearing data
	 * @returns {void}
	 * @example
	 * summary.destroy();
	 */
	destroy(): void;
}
/**
 * Interface for operating on a labeled summary time series
 * @interface SummaryLabelInterface
 * @property {function(number): void} observe - Records a value in the summary
 */
export interface SummaryLabelInterface {
	/**
	 * Records a value in the summary
	 * @param {number} value - The value to observe (must be finite and non-negative)
	 */
	observe(value: number): void;
}
/**
 * A GaugeHistogram metric that tracks observations in configurable buckets
 * with support for multiple time series via dynamic labels.
 *
 * Unlike regular histograms, GaugeHistograms can decrease in value and are
 * typically used for measurements that can go up or down like queue sizes
 * or memory usage.
 * @class GaugeHistogram
 * @extends BaseMetric
 * @example
 * const gh = new GaugeHistogram({
 *   name: 'request_size_bytes',
 *   help: 'Size of HTTP requests',
 *   labelNames: ['method'],
 *   buckets: [100, 500, 1000]
 * });
 *
 * // Record observations with labels
 * gh.labels({ method: 'GET' }).observe(250);
 * gh.labels({ method: 'POST' }).observe(750);
 */
export declare class GaugeHistogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets;
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new GaugeHistogram instance
	 * @constructor
	 * @param {MetricOptions & { buckets?: number[] }} options - Configuration options
	 * @throws {Error} If bucket values are invalid (non-positive or non-finite)
	 */
	constructor(options: MetricOptions & {
		buckets?: number[];
	});
	/**
	 * Initializes a new time series with zero values
	 * @private
	 * @returns {Object} Initialized time series data structure
	 */
	private initializeTimeSeries;
	/**
	 * Records a new observation in the histogram for specific labels
	 * @param {number} value - The value to observe
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @throws {Error} If value is not finite or labels are invalid
	 * @example
	 * gh.observe(250, { method: 'GET' });
	 */
	observe(value: number, labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {GaugeHistogramLabelInterface} Interface with observe method
	 * @example
	 * const labeledHistogram = gh.labels({ method: 'GET' });
	 * labeledHistogram.observe(250);
	 */
	labels(labels?: Record<string, string>): GaugeHistogramLabelInterface;
	/**
	 * Resets all histogram values to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @example
	 * gh.reset({ method: 'GET' });
	 */
	reset(labels?: Record<string, string>): void;
	/**
	 * Gets a snapshot of current histogram state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {GaugeHistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = gh.getSnapshot({ method: 'GET' });
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(labels?: Record<string, string>): GaugeHistogramData;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted histogram data
	 * @example
	 * console.log(gh.getMetric());
	 * // # TYPE request_size_bytes gaugehistogram
	 * // request_size_bytes_bucket{le="100",method="GET"} 0
	 * // request_size_bytes_bucket{le="500",method="GET"} 1
	 * // request_size_bytes_bucket{le="+Inf",method="GET"} 1
	 * // request_size_bytes_gsum{method="GET"} 250
	 * // request_size_bytes_gcount{method="GET"} 1
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled gauge histogram time series
 * @interface GaugeHistogramLabelInterface
 * @property {function(number): void} observe - Records a value in the histogram
 */
export interface GaugeHistogramLabelInterface {
	/**
	 * Records a value in the histogram
	 * @param {number} value - The value to observe
	 */
	observe(value: number): void;
}
/**
 * An Info metric that provides static metadata about a component or service
 * with support for multiple time series via dynamic labels.
 *
 * Info metrics are used to expose constant information like versions, build info,
 * or other immutable attributes. They always have a value of 1 and are typically
 * used with labels to provide the metadata values.
 * @class Info
 * @extends BaseMetric
 * @example
 * const info = new Info({
 *   name: 'build_info',
 *   help: 'Build information',
 *   labelNames: ['version', 'commit']
 * });
 *
 * // Set info values with labels
 * info.labels({ version: '1.2.3', commit: 'abc123' }).set();
 */
export declare class Info extends BaseMetric {
	/**
	 * Internal storage of info time series by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Info metric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
	/**
	 * Records an info metric with specific label values
	 * @param {Record<string, string>} labels - Label values containing the metadata
	 * @returns {void}
	 * @example
	 * info.set({ version: '1.2.3', commit: 'abc123' });
	 */
	set(labels?: Record<string, string>): void;
	/**
	 * Returns an interface for setting info values with specific labels
	 * @param {Record<string, string>} labels - Label values containing the metadata
	 * @returns {InfoLabelInterface} Interface with set method
	 * @example
	 * const labeledInfo = info.labels({ version: '1.2.3' });
	 * labeledInfo.set();
	 */
	labels(labels?: Record<string, string>): InfoLabelInterface;
	/**
	 * Generates a unique key for an info time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted info metric
	 * @example
	 * console.log(info.getMetric());
	 * // # TYPE build_info info
	 * // # HELP build_info Build information
	 * // build_info_info{version="1.2.3",commit="abc123"} 1
	 * // build_info_info{version="2.0.0",commit="def456"} 1
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled info time series
 * @interface InfoLabelInterface
 * @property {function(): void} set - Records the info metric with label values
 */
export interface InfoLabelInterface {
	/**
	 * Records the info metric with label values
	 */
	set(): void;
}
/**
 * A StateSet metric that represents a set of mutually exclusive states
 * with support for multiple time series via dynamic labels.
 *
 * Each state is represented as a boolean value where exactly one state
 * should be true at any given time (like an enum). The StateSet can track
 * different sets of states for different labeled instances.
 * @class StateSet
 * @extends BaseMetric
 * @example
 * const serviceState = new StateSet({
 *   name: 'service_state',
 *   help: 'Current service state',
 *   labelNames: ['service_name'],
 *   states: ['starting', 'running', 'stopped', 'degraded']
 * });
 *
 * // Set states for different services
 * serviceState.labels({ service_name: 'api' }).enableOnly('running');
 * serviceState.labels({ service_name: 'worker' }).enableOnly('starting');
 */
export declare class StateSet extends BaseMetric {
	/**
	 * Array of valid state names
	 * @private
	 * @readonly
	 */
	private readonly stateNames;
	/**
	 * Internal storage of state sets by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new StateSet instance
	 * @constructor
	 * @param {MetricOptions & { states: string[] }} options - Configuration options
	 * @throws {Error} If states are invalid or unit is specified
	 */
	constructor(options: MetricOptions & {
		states: string[];
	});
	/**
	 * Validates the state names
	 * @private
	 * @param {string[]} states - Array of state names to validate
	 * @throws {Error} If states are empty, contain duplicates, or match metric name
	 */
	private validateStates;
	/**
	 * Initializes a new state set with all states disabled
	 * @private
	 * @returns {Object} Initialized state set
	 */
	private initializeStateSet;
	/**
	 * Sets a specific state's value for labeled instance
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * stateSet.setState('ready', true, { instance: 'primary' });
	 */
	setState(state: string, value: boolean, labels?: Record<string, string>): void;
	/**
	 * Returns the current value of a state for labeled instance
	 * @param {string} state - The state to check
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {boolean} The current value of the state
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * const isRunning = stateSet.getState('running', { instance: 'primary' });
	 */
	getState(state: string, labels?: Record<string, string>): boolean;
	/**
	 * Enables exactly one state and disables all others for labeled instance
	 * @param {string} state - The state to enable
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * stateSet.enableOnly('active', { instance: 'primary' });
	 */
	enableOnly(state: string, labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled state set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {StateSetLabelInterface} Interface with state manipulation methods
	 * @example
	 * const labeledStateSet = stateSet.labels({ instance: 'primary' });
	 * labeledStateSet.enableOnly('active');
	 */
	labels(labels: Record<string, string>): StateSetLabelInterface;
	/**
	 * Generates a unique key for a state set based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the state set
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted stateset data
	 * @example
	 * console.log(serviceState.getMetric());
	 * // # TYPE service_state stateset
	 * // # HELP service_state Current service state
	 * // service_state{service_state="starting",service_name="api"} 0
	 * // service_state{service_state="running",service_name="api"} 1
	 * // service_state{service_state="stopped",service_name="api"} 0
	 * // service_state{service_state="degraded",service_name="api"} 0
	 * // service_state{service_state="starting",service_name="worker"} 1
	 * // service_state{service_state="running",service_name="worker"} 0
	 * // service_state{service_state="stopped",service_name="worker"} 0
	 * // service_state{service_state="degraded",service_name="worker"} 0
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled state set
 * @interface StateSetLabelInterface
 * @property {function(string, boolean): void} setState - Sets a specific state's value
 * @property {function(string): void} enableOnly - Enables exactly one state and disables others
 * @property {function(string): boolean} getState - Gets the current value of a state
 */
export interface StateSetLabelInterface {
	/**
	 * Sets a specific state's value
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 */
	setState(state: string, value: boolean): void;
	/**
	 * Enables exactly one state and disables all others
	 * @param {string} state - The state to enable
	 */
	enableOnly(state: string): void;
	/**
	 * Gets the current value of a state
	 * @param {string} state - The state to check
	 * @returns {boolean} The current value of the state
	 */
	getState(state: string): boolean;
}
/**
 * A fallback metric type for representing untyped or custom metric data
 * with support for multiple time series via dynamic labels.
 *
 * The Unknown metric provides basic functionality for tracking numeric values
 * when a specific metric type isn't available or appropriate. It maintains
 * minimal OpenMetrics compliance while allowing arbitrary values.
 * @class Unknown
 * @extends BaseMetric
 * @example
 * const customMetric = new Unknown({
 *   name: 'custom_metric',
 *   help: 'Custom metric with arbitrary values',
 *   labelNames: ['category', 'source']
 * });
 *
 * // Set values with different labels
 * customMetric.labels({ category: 'api', source: 'external' }).set(42);
 * customMetric.labels({ category: 'db', source: 'internal' }).set(3.14);
 */
export declare class Unknown extends BaseMetric {
	/**
	 * Internal storage of values by label values
	 * @private
	 */
	private timeSeries;
	/**
	 * Creates a new Unknown metric instance
	 * @constructor
	 * @param {MetricOptions & { value?: number }} options - Configuration options
	 */
	constructor(options: MetricOptions & {
		value?: number;
	});
	/**
	 * Sets the metric to a specific value for labeled instance
	 * @param {number} value - The new value to set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {void}
	 * @example
	 * unknownMetric.set(3.14, { instance: 'primary' });
	 */
	set(value: number, labels?: Record<string, string>): void;
	/**
	 * Returns an interface for operating on a specific labeled instance
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {UnknownLabelInterface} Interface with set method
	 * @example
	 * const labeledMetric = unknownMetric.labels({ instance: 'primary' });
	 * labeledMetric.set(3.14);
	 */
	labels(labels?: Record<string, string>): UnknownLabelInterface;
	/**
	 * Gets the current value for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {number | undefined} The current value or undefined if not set
	 */
	get(labels?: Record<string, string>): number | undefined;
	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted metric data
	 * @example
	 * console.log(customMetric.getMetric());
	 * // # TYPE custom_metric unknown
	 * // # HELP custom_metric Custom metric with arbitrary values
	 * // custom_metric{category="api",source="external"} 42
	 * // custom_metric{category="db",source="internal"} 3.14
	 */
	getMetric(prefix?: string): string;
}
/**
 * Interface for operating on a labeled unknown metric
 * @interface UnknownLabelInterface
 * @property {function(number): void} set - Sets the metric value
 */
export interface UnknownLabelInterface {
	/**
	 * Sets the metric value
	 * @param {number} value - The new value to set
	 */
	set(value: number): void;
}

export {};
