import type { MetricOptions, HistogramData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Histogram extends BaseMetric {
	/**
	 * Array of bucket boundaries (upper bounds)
	 * @private
	 * @readonly
	 */
	private readonly buckets: number[];

	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries: Map<
		string,
		{
			counts: Map<string, number>;
			sum: number;
			count: number;
			created: number;
			updated: number;
		}
	> = new Map();

	/**
	 * Creates a new Histogram instance
	 * @constructor
	 * @param {MetricOptions & { buckets?: number[] }} options - Configuration options
	 * @throws {Error} If bucket values are invalid (non-positive or non-finite)
	 */
	constructor(options: MetricOptions & { buckets?: number[] }) {
		super(options);

		const defaultBuckets = [0.1, 0.5, 1, 5, 10];
		this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);

		if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
			throw new Error("Histogram buckets must be positive numbers");
		}
	}

	/**
	 * Initializes a new time series with zero values
	 * @private
	 * @returns {Object} Initialized time series data structure
	 */
	private initializeTimeSeries(): {
		counts: Map<string, number>;
		sum: number;
		count: number;
		created: number;
		updated: number;
	} {
		const counts = new Map<string, number>();
		this.buckets.forEach((b) => counts.set(b.toString(), 0));
		counts.set("+Inf", 0);

		return {
			counts,
			sum: 0,
			count: 0,
			created: Date.now(),
			updated: Date.now(),
		};
	}

	/**
	 * Records a new observation in the histogram for specific labels
	 * @param {number} value - The value to observe (must be non-negative)
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @throws {Error} If value is negative or not finite
	 * @example
	 * histogram.observe(0.3, { method: 'GET', status: '200' });
	 */
	observe(value: number, labels?: Record<string, string>): void {
		if (value < 0 || !Number.isFinite(value)) {
			throw new Error("Histogram observation value must be non-negative and finite");
		}

		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const now = Date.now();

		if (!this.timeSeries.has(key)) {
			this.timeSeries.set(key, this.initializeTimeSeries());
		}

		const series = this.timeSeries.get(key)!;
		series.count++;
		series.sum += value;
		series.updated = now;

		for (const bucket of this.buckets) {
			if (value <= bucket) {
				const bucketKey = bucket.toString();
				series.counts.set(bucketKey, (series.counts.get(bucketKey) || 0) + 1);
			}
		}
		series.counts.set("+Inf", (series.counts.get("+Inf") || 0) + 1);
	}

	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {HistogramLabelInterface} Interface with observe method
	 * @example
	 * const labeledHistogram = histogram.labels({ method: 'GET' });
	 * labeledHistogram.observe(0.3);
	 */
	labels(labels: Record<string, string> = {}): HistogramLabelInterface {
		this.validateLabels(labels);
		return {
			observe: (value: number) => this.observe(value, labels),
		};
	}

	/**
	 * Resets all histogram values to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @example
	 * histogram.reset({ method: 'GET' });
	 */
	reset(labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		this.timeSeries.set(key, this.initializeTimeSeries());
	}

	/**
	 * Gets a snapshot of current histogram state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {HistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = histogram.getSnapshot({ method: 'GET' });
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(labels?: Record<string, string>): HistogramData {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const series = this.timeSeries.get(key);

		if (!series) {
			const emptyCounts = new Map<string, number>();
			this.buckets.forEach((b) => emptyCounts.set(b.toString(), 0));
			emptyCounts.set("+Inf", 0);

			return {
				buckets: this.buckets,
				counts: emptyCounts,
				sum: 0,
				count: 0,
				created: new Date(0),
				updated: new Date(0),
			};
		}

		return {
			buckets: this.buckets,
			counts: new Map(series.counts),
			sum: series.sum,
			count: series.count,
			created: new Date(series.created),
			updated: new Date(series.updated),
		};
	}

	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey(labels: Record<string, string> = {}): string {
		const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sortedEntries);
	}

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
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines: string[] = [this.metadata("histogram", prefix)];

		for (const [key, series] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			const createdTimestamp = series.created / 1000;

			// Add bucket metrics
			this.buckets.forEach((bucket) => {
				lines.push(`${name}_bucket{le="${bucket}"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get(bucket.toString()) || 0}`);
			});

			// Add +Inf bucket and summary metrics
			lines.push(
				`${name}_bucket{le="+Inf"${labelStr ? "," + labelStr.slice(1) : "}"} ${series.counts.get("+Inf") || 0}`,
				`${name}_count${labelStr} ${series.count}`,
				`${name}_sum${labelStr} ${series.sum}`,
				`${name}_created${labelStr} ${createdTimestamp}`
			);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled histogram time series
 * @interface HistogramLabelInterface
 * @property {function(number): void} observe - Records a value in the histogram
 */
interface HistogramLabelInterface {
	/**
	 * Records a value in the histogram
	 * @param {number} value - The value to observe (must be non-negative)
	 */
	observe(value: number): void;
}
