import type { MetricOptions, HistogramData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Histogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets: number[];
	/**
	 * Map of bucket counts (key = bucket upper bound as string)
	 * @private
	 */
	private counts: Map<string, number>;
	/**
	 * Sum of all observed values
	 * @private
	 */
	private sum: number = 0;
	/**
	 * Total number of observations
	 * @private
	 */
	private count: number = 0;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated: number = Date.now();
	/**
	 * Timestamp of creation (in milliseconds since epoch)
	 * @private
	 * @readonly
	 */
	private created: number = Date.now();

	/**
	 * Creates a new Histogram instance
	 * @constructor
	 * @param {MetricOptions & { buckets?: number[] }} options - Configuration options
	 * @throws {Error} If bucket values are invalid (non-positive or non-finite)
	 */
	constructor(options: MetricOptions & { buckets?: number[] }) {
		super(options);
		this.validateLabels(options.labels);

		const defaultBuckets = [0.1, 0.5, 1, 5, 10];
		this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);

		if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
			throw new Error("Histogram buckets must be positive numbers");
		}

		this.counts = new Map([...this.buckets.map((b) => [b.toString(), 0] as [string, number]), ["+Inf", 0]]);
	}

	/**
	 * Records a new observation in the histogram
	 * @param {number} value - The value to observe (must be non-negative)
	 * @returns {void}
	 * @example
	 * histogram.observe(0.3); // Records a value in the appropriate buckets
	 */
	observe(value: number): void {
		if (value < 0 || !Number.isFinite(value)) return;

		this.count++;
		this.sum += value;
		this.updated = Date.now();

		for (const bucket of this.buckets) {
			if (value <= bucket) {
				this.counts.set(bucket.toString(), (this.counts.get(bucket.toString()) ?? 0) + 1);
			}
		}

		this.counts.set("+Inf", (this.counts.get("+Inf") ?? 0) + 1);
	}

	/**
	 * Resets all histogram values to zero
	 * @returns {void}
	 */
	reset(): void {
		this.count = 0;
		this.sum = 0;
		this.updated = Date.now();
		this.created = Date.now();

		for (const key of this.counts.keys()) {
			this.counts.set(key, 0);
		}
	}

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
	getMetric(prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const labels = this.formatLabels();
		const lines: string[] = [this.metadata("histogram", prefix)];

		for (const bucket of this.buckets) {
			lines.push(`${fullName}_bucket{le="${bucket}"} ${this.counts.get(bucket.toString()) ?? 0}`);
		}

		lines.push(
			`${fullName}_bucket{le="+Inf"} ${this.counts.get("+Inf") ?? 0}`,
			`${fullName}_count ${this.count}`,
			`${fullName}_sum ${this.sum}`,
			`${fullName}_created ${this.created / 1000}`
		);

		return lines.join("\n");
	}

	/**
	 * Gets a snapshot of current histogram state
	 * @returns {HistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = histogram.getSnapshot();
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(): HistogramData {
		return {
			buckets: this.buckets,
			counts: this.counts,
			sum: this.sum,
			count: this.count,
			created: new Date(this.created),
			updated: new Date(this.updated),
		};
	}
}
