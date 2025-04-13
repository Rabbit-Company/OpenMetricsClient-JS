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
	 * Key-value pairs of metric labels
	 * @type {Record<string, string>}
	 * @example { method: "GET", status: "200" }
	 */
	labels?: Record<string, string>;
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
	 * Key-value pairs of metric labels
	 * @public
	 * @readonly
	 */
	readonly labels: Record<string, string>;
	/**
	 * Reference to the registry this metric is registered with (if any)
	 * @public
	 */
	registry?: Registry;
	/**
	 * Creates a new BaseMetric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options for the metric
	 * @throws {Error} If label validation fails
	 */
	constructor(options: MetricOptions);
	/**
	 * Validates metric label names and values
	 * @protected
	 * @param {Record<string, string>} [labels] - Labels to validate
	 * @throws {Error} If any label name is invalid or value is not a string
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
	 * @param {Record<string, string>} [labels] - Additional labels to include
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
	 * Creates a new Registry instance
	 * @constructor
	 * @param {RegistryOptions} [options] - Configuration options
	 */
	constructor(options?: RegistryOptions);
	/**
	 * Generates a unique key for a metric based on name and labels
	 * @private
	 * @param {BaseMetric} metric - The metric instance
	 * @returns {string} Composite key string
	 */
	private getMetricKey;
	/**
	 * Registers a new metric with the registry
	 * @param {BaseMetric} metric - The metric to register
	 * @throws {Error} If a metric with the same name and labels already exists
	 * @example
	 * registry.register(new Counter({ name: 'hits', help: 'Page hits' }));
	 */
	register(metric: BaseMetric): void;
	/**
	 * Unregisters a specific metric instance
	 * @param {BaseMetric} metric - The metric to remove
	 * @returns {boolean} True if the metric was found and removed
	 */
	unregister(metric: BaseMetric): boolean;
	/**
	 * Unregisters all metrics with a given name
	 * @param {string} name - The metric name to remove
	 * @returns {number} Count of metrics removed
	 */
	unregisterByName(name: string): number;
	/**
	 * Gets all registered metrics
	 * @returns {BaseMetric[]} Array of all registered metrics
	 */
	getMetrics(): BaseMetric[];
	/**
	 * Finds a metric by name and optional labels
	 * @param {string} name - The metric name to find
	 * @param {Record<string, string>} [labels] - Optional labels to match
	 * @returns {BaseMetric|undefined} The found metric or undefined
	 */
	getMetric(name: string, labels?: Record<string, string>): BaseMetric | undefined;
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
 * Counters are typically used to track request counts, completed tasks, or errors.
 *
 * @class Counter
 * @extends BaseMetric
 * @example
 * const counter = new Counter({ name: 'http_requests', help: 'Total HTTP requests' });
 * counter.inc();
 * counter.inc(5);
 */
export declare class Counter extends BaseMetric {
	/**
	 * Current value of the counter
	 * @private
	 */
	private value;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated;
	/**
	 * Timestamp of creation (in milliseconds since epoch)
	 * @private
	 * @readonly
	 */
	private created;
	/**
	 * Creates a new Counter instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
	/**
	 * Increments the counter value
	 * @param {number} [amount=1] - The amount to increment by (must be positive)
	 * @returns {void}
	 * @example
	 * counter.inc(); // increments by 1
	 * counter.inc(5); // increments by 5
	 */
	inc(amount?: number): void;
	/**
	 * Gets the current counter state
	 * @returns {CounterData} Object containing value and timestamps
	 * @example
	 * const data = counter.get();
	 * console.log(data.value, data.updated);
	 */
	get(): CounterData;
	/**
	 * Resets the counter to zero and updates timestamps
	 * @returns {void}
	 */
	reset(): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted counter data
	 * @example
	 * console.log(counter.getMetric());
	 * // # TYPE http_requests counter
	 * // # HELP http_requests Total HTTP requests
	 * // http_requests_total 6 1625097600
	 * // http_requests_created 1625097000 1625097600
	 */
	getMetric(prefix?: string): string;
}
/**
 * A gauge metric that represents a value that can go up or down.
 * Gauges are typically used to track current memory usage, active connections,
 * or any other instantaneous measurement.
 *
 * @class Gauge
 * @extends BaseMetric
 * @example
 * const gauge = new Gauge({ name: 'temperature', help: 'Current temperature' });
 * gauge.set(23.5);
 * gauge.inc(0.5); // Increase by 0.5
 * gauge.dec(1.0); // Decrease by 1.0
 */
export declare class Gauge extends BaseMetric {
	/**
	 * Current value of the gauge
	 * @private
	 */
	private value;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated;
	/**
	 * Creates a new Gauge instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
	/**
	 * Increments the gauge value
	 * @param {number} [amount=1] - The amount to increment by
	 * @returns {void}
	 * @example
	 * gauge.inc(); // increments by 1
	 * gauge.inc(2.5); // increments by 2.5
	 */
	inc(amount?: number): void;
	/**
	 * Decrements the gauge value
	 * @param {number} [amount=1] - The amount to decrement by
	 * @returns {void}
	 * @example
	 * gauge.dec(); // decrements by 1
	 * gauge.dec(0.5); // decrements by 0.5
	 */
	dec(amount?: number): void;
	/**
	 * Sets the gauge to a specific value
	 * @param {number} value - The new value to set
	 * @returns {void}
	 * @example
	 * gauge.set(42); // sets value to 42
	 */
	set(value: number): void;
	/**
	 * Gets the current gauge state
	 * @returns {GaugeData} Object containing value and timestamp
	 * @example
	 * const data = gauge.get();
	 * console.log(data.value, data.updated);
	 */
	get(): GaugeData;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted gauge data
	 * @example
	 * console.log(gauge.getMetric());
	 * // # TYPE temperature gauge
	 * // # HELP temperature Current temperature
	 * // temperature 23.5 1625097600
	 */
	getMetric(prefix?: string): string;
}
/**
 * A Histogram metric that tracks observations in configurable buckets
 * and provides both bucket counts and sum of observed values.
 *
 * Histograms are typically used to measure request durations, response sizes,
 * or other value distributions where you want to analyze quantiles.
 *
 * @class Histogram
 * @extends BaseMetric
 * @example
 * const histogram = new Histogram({
 *   name: 'http_request_duration_seconds',
 *   help: 'HTTP request duration distribution',
 *   buckets: [0.1, 0.5, 1, 2.5]
 * });
 * histogram.observe(0.75);
 */
export declare class Histogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets;
	/**
	 * Map of bucket counts (key = bucket upper bound as string)
	 * @private
	 */
	private counts;
	/**
	 * Sum of all observed values
	 * @private
	 */
	private sum;
	/**
	 * Total number of observations
	 * @private
	 */
	private count;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated;
	/**
	 * Timestamp of creation (in milliseconds since epoch)
	 * @private
	 * @readonly
	 */
	private created;
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
	 * Records a new observation in the histogram
	 * @param {number} value - The value to observe (must be non-negative)
	 * @returns {void}
	 * @example
	 * histogram.observe(0.3); // Records a value in the appropriate buckets
	 */
	observe(value: number): void;
	/**
	 * Resets all histogram values to zero
	 * @returns {void}
	 */
	reset(): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted histogram data
	 * @example
	 * console.log(histogram.getMetric());
	 * // # TYPE http_request_duration_seconds histogram
	 * // http_request_duration_seconds_bucket{le="0.1"} 0
	 * // http_request_duration_seconds_bucket{le="0.5"} 1
	 * // http_request_duration_seconds_bucket{le="+Inf"} 1
	 * // http_request_duration_seconds_count 1
	 * // http_request_duration_seconds_sum 0.3
	 * // http_request_duration_seconds_created 1625097600
	 */
	getMetric(prefix?: string): string;
	/**
	 * Gets a snapshot of current histogram state
	 * @returns {HistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = histogram.getSnapshot();
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(): HistogramData;
}
/**
 * A Summary metric that calculates configurable quantiles over a sliding time window.
 * Summaries are used to track distributions of observations (like request durations)
 * while maintaining efficient memory usage through bucket rotation.
 *
 * @class Summary
 * @extends BaseMetric
 * @example
 * const summary = new Summary({
 *   name: 'request_duration',
 *   help: 'Request duration distribution',
 *   quantiles: [0.5, 0.95],
 *   maxAgeSeconds: 300
 * });
 * summary.observe(0.25);
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
	 * Historical buckets of observations
	 * @private
	 */
	private buckets;
	/**
	 * Current active bucket of observations
	 * @private
	 */
	private currentBucket;
	/**
	 * Interval timer for bucket rotation
	 * @private
	 */
	private rotationInterval;
	/**
	 * Sum of all observations in the current window
	 * @private
	 */
	private sum;
	/**
	 * Count of all observations in the current window
	 * @private
	 */
	private count;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated;
	/**
	 * Timestamp of creation (in milliseconds since epoch)
	 * @private
	 * @readonly
	 */
	private created;
	/**
	 * Flag indicating if the summary has been destroyed
	 * @private
	 */
	private isDestroyed;
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
	 * Rotates buckets and maintains the sliding window
	 * @private
	 */
	private rotateBuckets;
	/**
	 * Recalculates sum and count from all valid buckets
	 * @private
	 */
	private recalculateAggregates;
	/**
	 * Records a new observation in the summary
	 * @param {number} value - The value to observe (must be finite and non-negative)
	 * @returns {void}
	 * @example
	 * summary.observe(0.3);
	 */
	observe(value: number): void;
	/**
	 * Resets all summary values and buckets
	 * @returns {void}
	 */
	reset(): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted summary data
	 * @example
	 * console.log(summary.getMetric());
	 * // # TYPE request_duration summary
	 * // request_duration{quantile="0.5"} 0.25
	 * // request_duration{quantile="0.95"} 0.42
	 * // request_duration_sum 3.5
	 * // request_duration_count 10
	 * // request_duration_created 1625097600
	 */
	getMetric(prefix?: string): string;
	/**
	 * Gets a snapshot of current summary state
	 * @returns {SummaryData} Current summary statistics
	 * @example
	 * const stats = summary.getSnapshot();
	 * console.log(stats.sum, stats.count);
	 */
	getSnapshot(): SummaryData;
	/**
	 * Cleans up the summary by stopping rotation and clearing data
	 * @returns {void}
	 */
	destroy(): void;
}
/**
 * A GaugeHistogram metric that tracks observations in configurable buckets
 * and provides both bucket counts and sum of observed values.
 *
 * Unlike regular histograms, GaugeHistograms can decrease in value and are
 * typically used for measurements that can go up or down like queue sizes
 * or memory usage.
 *
 * @class GaugeHistogram
 * @extends BaseMetric
 * @example
 * const gh = new GaugeHistogram({
 *   name: 'request_size_bytes',
 *   help: 'Size of HTTP requests',
 *   buckets: [100, 500, 1000]
 * });
 * gh.observe(250);
 */
export declare class GaugeHistogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets;
	/**
	 * Map of bucket counts (key = bucket upper bound as string)
	 * @private
	 */
	private counts;
	/**
	 * Sum of all observed values
	 * @private
	 */
	private sum;
	/**
	 * Total number of observations
	 * @private
	 */
	private count;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated;
	/**
	 * Timestamp of creation (in milliseconds since epoch)
	 * @private
	 * @readonly
	 */
	private created;
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
	 * Records a new observation in the histogram
	 * @param {number} value - The value to observe
	 * @returns {void}
	 * @example
	 * gh.observe(0.8); // Records a value in the appropriate buckets
	 */
	observe(value: number): void;
	/**
	 * Resets all histogram values to zero
	 * @returns {void}
	 */
	reset(): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted histogram data
	 * @example
	 * console.log(gh.getMetric());
	 * // # TYPE request_size_bytes gaugehistogram
	 * // request_size_bytes_bucket{le="100"} 0
	 * // request_size_bytes_bucket{le="500"} 1
	 * // request_size_bytes_bucket{le="+Inf"} 1
	 * // request_size_bytes_gcount 1
	 * // request_size_bytes_gsum 250
	 */
	getMetric(prefix?: string): string;
	/**
	 * Gets a snapshot of current histogram state
	 * @returns {GaugeHistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = gh.getSnapshot();
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(): GaugeHistogramData;
}
/**
 * An Info metric that provides static metadata about a component or service.
 *
 * Info metrics are used to expose constant information like versions, build info,
 * or other immutable attributes. They always have a value of 1 and are typically
 * used with labels to provide the metadata values.
 *
 * @class Info
 * @extends BaseMetric
 * @example
 * const info = new Info({
 *   name: 'build_info',
 *   help: 'Build information',
 *   labels: {
 *     version: '1.2.3',
 *     commit: 'abc123'
 *   }
 * });
 */
export declare class Info extends BaseMetric {
	/**
	 * Creates a new Info metric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions);
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
	 */
	getMetric(prefix?: string): string;
}
/**
 * A StateSet metric that represents a set of mutually exclusive states.
 * Each state is represented as a boolean value where exactly one state
 * should be true at any given time (like an enum).
 *
 * @class StateSet
 * @extends BaseMetric
 * @example
 * const serviceState = new StateSet({
 *   name: 'service_state',
 *   help: 'Current service state',
 *   states: ['starting', 'running', 'stopped', 'degraded']
 * });
 * serviceState.enableOnly('running');
 */
export declare class StateSet extends BaseMetric {
	/**
	 * Map of state names to their current boolean values
	 * @private
	 */
	private states;
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
	 * Sets a specific state's value
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 * @throws {Error} If state doesn't exist
	 * @example
	 * stateSet.setState('ready', true);
	 */
	setState(state: string, value: boolean): void;
	/**
	 * Enables exactly one state and disables all others
	 * @param {string} state - The state to enable
	 * @throws {Error} If state doesn't exist
	 * @example
	 * stateSet.enableOnly('active');
	 */
	enableOnly(state: string): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted stateset data
	 * @example
	 * console.log(serviceState.getMetric());
	 * // # TYPE service_state stateset
	 * // # HELP service_state Current service state
	 * // service_state{service_state="starting"} 0
	 * // service_state{service_state="running"} 1
	 * // service_state{service_state="stopped"} 0
	 * // service_state{service_state="degraded"} 0
	 */
	getMetric(prefix?: string): string;
}
/**
 * A fallback metric type for representing untyped or custom metric data.
 *
 * The Unknown metric provides basic functionality for tracking numeric values
 * when a specific metric type isn't available or appropriate. It maintains
 * minimal OpenMetrics compliance while allowing arbitrary values.
 *
 * @class Unknown
 * @extends BaseMetric
 * @example
 * const customMetric = new Unknown({
 *   name: 'custom_metric',
 *   help: 'Custom metric with arbitrary values',
 *   value: 42
 * });
 */
export declare class Unknown extends BaseMetric {
	/**
	 * Current numeric value of the metric
	 * @private
	 */
	private value;
	/**
	 * Creates a new Unknown metric instance
	 * @constructor
	 * @param {MetricOptions & { value?: number }} options - Configuration options
	 */
	constructor(options: MetricOptions & {
		value?: number;
	});
	/**
	 * Sets the metric to a specific value
	 * @param {number} value - The new value to set
	 * @returns {void}
	 * @example
	 * unknownMetric.set(3.14);
	 */
	set(value: number): void;
	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted metric data
	 * @example
	 * console.log(customMetric.getMetric());
	 * // # TYPE custom_metric unknown
	 * // # HELP custom_metric Custom metric with arbitrary values
	 * // custom_metric 42
	 */
	getMetric(prefix?: string): string;
}

export {};
