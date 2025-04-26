import type { MetricOptions, SummaryOptions, SummaryBucket, SummaryData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries: Map<
		string,
		{
			buckets: SummaryBucket[];
			currentBucket: SummaryBucket;
			sum: number;
			count: number;
			created: number;
			updated: number;
			rotationInterval: NodeJS.Timeout;
		}
	> = new Map();

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
	}

	/**
	 * Creates a new empty bucket
	 * @private
	 * @returns {SummaryBucket} New bucket instance
	 */
	private createBucket(): SummaryBucket {
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
	 * Initializes a new time series with empty buckets
	 * @private
	 * @param {string} key - The time series key
	 * @returns {Object} Initialized time series data structure
	 */
	private initializeTimeSeries(key: string) {
		const rotationInterval = setInterval(() => this.rotateBuckets(key), (this.maxAgeSeconds * 1000) / this.ageBuckets);
		rotationInterval.unref?.();

		return {
			buckets: [],
			currentBucket: this.createBucket(),
			sum: 0,
			count: 0,
			created: Date.now(),
			updated: Date.now(),
			rotationInterval,
		};
	}

	/**
	 * Rotates buckets and maintains the sliding window for a specific time series
	 * @private
	 * @param {string} key - The time series key to rotate
	 */
	private rotateBuckets(key: string): void {
		const series = this.timeSeries.get(key);
		if (!series) return;

		series.buckets.push(series.currentBucket);
		const cutoff = Date.now() - this.maxAgeSeconds * 1000;
		series.buckets = series.buckets.filter((b) => b.timestamp >= cutoff);
		this.recalculateAggregates(series);
		series.currentBucket = this.createBucket();
		series.updated = Date.now();
	}

	/**
	 * Recalculates sum and count from all valid buckets
	 * @private
	 * @param {Object} series - The time series to recalculate
	 */
	private recalculateAggregates(series: { buckets: SummaryBucket[]; sum: number; count: number }): void {
		series.sum = series.buckets.reduce((sum, b) => sum + b.sum, 0);
		series.count = series.buckets.reduce((count, b) => count + b.count, 0);
	}

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
	observe(value: number, labels?: Record<string, string>): void {
		if (!Number.isFinite(value) || value < 0) {
			throw new Error("Summary observation value must be finite and non-negative");
		}

		const safeLabels = labels || {};
		this.validateLabels(safeLabels);
		const key = this.getTimeSeriesKey(safeLabels);

		if (!this.timeSeries.has(key)) {
			this.timeSeries.set(key, this.initializeTimeSeries(key));
		}

		const series = this.timeSeries.get(key)!;
		series.currentBucket.values.push(value);
		series.currentBucket.sum += value;
		series.currentBucket.count++;
		series.sum += value;
		series.count++;
		series.updated = Date.now();
	}

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
	labels(labels: Record<string, string> = {}): SummaryLabelInterface {
		this.validateLabels(labels);
		return {
			observe: (value: number) => this.observe(value, labels),
		};
	}

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
	reset(labels?: Record<string, string>): void {
		const safeLabels = labels || {};
		this.validateLabels(safeLabels);
		const key = this.getTimeSeriesKey(safeLabels);
		if (this.timeSeries.has(key)) {
			const series = this.timeSeries.get(key)!;
			clearInterval(series.rotationInterval);
			this.timeSeries.set(key, this.initializeTimeSeries(key));
		}
	}

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
	getSnapshot(labels?: Record<string, string>): SummaryData {
		const safeLabels = labels || {};
		this.validateLabels(safeLabels);
		const key = this.getTimeSeriesKey(safeLabels);
		const series = this.timeSeries.get(key);

		if (!series) {
			return {
				sum: 0,
				count: 0,
				buckets: 0,
				currentBucketSize: 0,
				maxAgeSeconds: this.maxAgeSeconds,
				updated: new Date(0),
				created: new Date(0),
			};
		}

		return {
			sum: series.sum,
			count: series.count,
			buckets: series.buckets.length,
			currentBucketSize: series.currentBucket.values.length,
			maxAgeSeconds: this.maxAgeSeconds,
			updated: new Date(series.updated),
			created: new Date(series.created),
		};
	}

	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey(labels: Record<string, string>): string {
		const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sortedEntries);
	}

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
	getMetric(prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const lines: string[] = [this.metadata("summary", prefix)];

		for (const [key, series] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			const createdTimestamp = series.created / 1000;

			const allValues = series.buckets.concat([series.currentBucket]).flatMap((b) => b.values);

			if (allValues.length > 0) {
				const sortedValues = [...allValues].sort((a, b) => a - b);

				for (const q of this.quantiles) {
					const pos = q * (sortedValues.length - 1);
					const base = Math.floor(pos);
					const rest = pos - base;

					const baseValue = sortedValues[base];
					const nextValue = sortedValues[base + 1];
					let value = NaN;

					if (baseValue !== undefined) {
						value = nextValue !== undefined ? baseValue + rest * (nextValue - baseValue) : baseValue;
					}

					lines.push(`${fullName}{quantile="${q}"${labelStr ? "," + labelStr.slice(1) : ""}} ${value}`);
				}
			} else {
				for (const q of this.quantiles) {
					lines.push(`${fullName}{quantile="${q}"${labelStr ? "," + labelStr.slice(1) : ""}} NaN`);
				}
			}

			lines.push(
				`${fullName}_sum${labelStr} ${series.sum}`,
				`${fullName}_count${labelStr} ${series.count}`,
				`${fullName}_created${labelStr} ${createdTimestamp}`
			);
		}

		return lines.join("\n");
	}

	/**
	 * Cleans up all summary time series by stopping rotation and clearing data
	 * @returns {void}
	 * @example
	 * summary.destroy();
	 */
	destroy(): void {
		for (const series of this.timeSeries.values()) {
			clearInterval(series.rotationInterval);
		}
		this.timeSeries.clear();
	}
}

/**
 * Interface for operating on a labeled summary time series
 * @interface SummaryLabelInterface
 * @property {function(number): void} observe - Records a value in the summary
 */
interface SummaryLabelInterface {
	/**
	 * Records a value in the summary
	 * @param {number} value - The value to observe (must be finite and non-negative)
	 */
	observe(value: number): void;
}
