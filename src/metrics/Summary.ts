import type { MetricOptions, SummaryOptions, SummaryBucket, SummaryData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Summary extends BaseMetric {
	/**
	 * Array of quantiles to calculate (values between 0 and 1)
	 * @private
	 * @readonly
	 */
	private readonly quantiles: number[];
	/**
	 * Maximum age of observations in seconds
	 * @private
	 * @readonly
	 */
	private readonly maxAgeSeconds: number;
	/**
	 * Number of buckets for the sliding window
	 * @private
	 * @readonly
	 */
	private readonly ageBuckets: number;

	/**
	 * Historical buckets of observations
	 * @private
	 */
	private buckets: SummaryBucket[];
	/**
	 * Current active bucket of observations
	 * @private
	 */
	private currentBucket: SummaryBucket;
	/**
	 * Interval timer for bucket rotation
	 * @private
	 */
	private rotationInterval: NodeJS.Timeout;
	/**
	 * Sum of all observations in the current window
	 * @private
	 */
	private sum: number = 0;
	/**
	 * Count of all observations in the current window
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
	 * Flag indicating if the summary has been destroyed
	 * @private
	 */
	private isDestroyed = false;

	/**
	 * Creates a new Summary instance
	 * @constructor
	 * @param {SummaryOptions} options - Configuration options
	 * @throws {Error} If quantiles are invalid
	 */
	constructor(options: SummaryOptions) {
		super(options);
		this.quantiles = options.quantiles || [0.5, 0.9, 0.99];
		this.maxAgeSeconds = options.maxAgeSeconds || 600;
		this.ageBuckets = options.ageBuckets || 5;
		this.validateQuantiles();

		this.buckets = [];
		this.currentBucket = this.createBucket();

		this.rotationInterval = setInterval(() => this.rotateBuckets(), (this.maxAgeSeconds * 1000) / this.ageBuckets);
		this.rotationInterval.unref?.();
	}

	/**
	 * Creates a new empty bucket
	 * @private
	 * @returns {SummaryBucket} New bucket instance
	 */
	private createBucket() {
		return { values: [], sum: 0, count: 0, timestamp: Date.now() };
	}

	/**
	 * Validates that quantiles are between 0 and 1
	 * @private
	 * @throws {Error} If any quantile is invalid
	 */
	private validateQuantiles(): void {
		for (const q of this.quantiles) {
			if (q <= 0 || q >= 1) throw new Error(`Quantile ${q} must be between 0 and 1`);
		}
	}

	/**
	 * Rotates buckets and maintains the sliding window
	 * @private
	 */
	private rotateBuckets(): void {
		if (this.isDestroyed) return;
		// Add current bucket to history
		this.buckets.push(this.currentBucket);

		// Remove expired buckets
		const cutoff = Date.now() - this.maxAgeSeconds * 1000;
		this.buckets = this.buckets.filter((b) => b.timestamp >= cutoff);

		// Recalculate aggregates
		this.recalculateAggregates();

		// Start new bucket
		this.currentBucket = this.createBucket();
		this.updated = Date.now();
	}

	/**
	 * Recalculates sum and count from all valid buckets
	 * @private
	 */
	private recalculateAggregates(): void {
		this.sum = this.buckets.reduce((sum, b) => sum + b.sum, 0);
		this.count = this.buckets.reduce((count, b) => count + b.count, 0);
	}

	/**
	 * Records a new observation in the summary
	 * @param {number} value - The value to observe (must be finite and non-negative)
	 * @returns {void}
	 * @example
	 * summary.observe(0.3);
	 */
	observe(value: number): void {
		if (this.isDestroyed || !Number.isFinite(value) || value < 0) return;

		this.currentBucket.values.push(value);
		this.currentBucket.sum += value;
		this.currentBucket.count++;
		this.sum += value;
		this.count++;
		this.updated = Date.now();
	}

	/**
	 * Resets all summary values and buckets
	 * @returns {void}
	 */
	reset(): void {
		this.buckets = [];
		this.currentBucket = this.createBucket();
		this.sum = 0;
		this.count = 0;
		this.updated = Date.now();
		this.created = Date.now();
	}

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
	getMetric(prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const lines = [this.metadata("summary", prefix)];
		const createdTimestamp = this.created / 1000;
		const updatedTimestamp = this.updated / 1000;

		const allValues = this.buckets.concat([this.currentBucket]).flatMap((b) => b.values);

		if (allValues.length > 0) {
			const sortedValues = [...allValues].sort((a, b) => a - b);

			for (const q of this.quantiles) {
				const pos = q * (sortedValues.length - 1);
				const base = Math.floor(pos);
				const rest = pos - base;

				const value = base + 1 < sortedValues.length ? sortedValues[base]! + rest * (sortedValues[base + 1]! - sortedValues[base]!) : sortedValues[base]!;

				lines.push(`${fullName}{quantile="${q}"} ${value}`);
			}
		} else {
			for (const q of this.quantiles) {
				lines.push(`${fullName}{quantile="${q}"} NaN`);
			}
		}

		lines.push(`${fullName}_sum ${this.sum}`, `${fullName}_count ${this.count}`, `${fullName}_created ${createdTimestamp}`);

		return lines.join("\n");
	}

	/**
	 * Gets a snapshot of current summary state
	 * @returns {SummaryData} Current summary statistics
	 * @example
	 * const stats = summary.getSnapshot();
	 * console.log(stats.sum, stats.count);
	 */
	getSnapshot(): SummaryData {
		return {
			sum: this.sum,
			count: this.count,
			buckets: this.buckets.length,
			currentBucketSize: this.currentBucket.values.length,
			maxAgeSeconds: this.maxAgeSeconds,
			updated: new Date(this.updated),
			created: new Date(this.created),
		};
	}

	/**
	 * Cleans up the summary by stopping rotation and clearing data
	 * @returns {void}
	 */
	destroy(): void {
		if (this.isDestroyed) return;

		this.isDestroyed = true;
		clearInterval(this.rotationInterval);
		this.reset();
	}
}
