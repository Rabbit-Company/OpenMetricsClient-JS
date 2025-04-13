import type { MetricOptions, GaugeHistogramData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class GaugeHistogram extends BaseMetric {
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
	 * Creates a new GaugeHistogram instance
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
			throw new Error("GaugeHistogram buckets must be positive numbers");
		}

		this.counts = new Map([...this.buckets.map((b) => [b.toString(), 0] as [string, number]), ["+Inf", 0]]);
	}

	/**
	 * Records a new observation in the histogram
	 * @param {number} value - The value to observe
	 * @returns {void}
	 * @example
	 * gh.observe(0.8); // Records a value in the appropriate buckets
	 */
	observe(value: number): void {
		if (!Number.isFinite(value)) return;

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
	 * console.log(gh.getMetric());
	 * // # TYPE request_size_bytes gaugehistogram
	 * // request_size_bytes_bucket{le="100"} 0
	 * // request_size_bytes_bucket{le="500"} 1
	 * // request_size_bytes_bucket{le="+Inf"} 1
	 * // request_size_bytes_gcount 1
	 * // request_size_bytes_gsum 250
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();
		const lines: string[] = [this.metadata("gaugehistogram", prefix)];

		for (const bucket of this.buckets) {
			lines.push(`${name}_bucket{le="${bucket}"} ${this.counts.get(bucket.toString()) ?? 0}`);
		}

		lines.push(`${name}_bucket{le="+Inf"} ${this.counts.get("+Inf") ?? 0}`, `${name}_gcount ${this.count}`, `${name}_gsum ${this.sum}`);

		return lines.join("\n");
	}

	/**
	 * Gets a snapshot of current histogram state
	 * @returns {GaugeHistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = gh.getSnapshot();
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(): GaugeHistogramData {
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
