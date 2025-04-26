import type { MetricOptions, GaugeHistogramData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class GaugeHistogram extends BaseMetric {
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
	 * Creates a new GaugeHistogram instance
	 * @constructor
	 * @param {MetricOptions & { buckets?: number[] }} options - Configuration options
	 * @throws {Error} If bucket values are invalid (non-positive or non-finite)
	 */
	constructor(options: MetricOptions & { buckets?: number[] }) {
		super(options);

		const defaultBuckets = [0.1, 0.5, 1, 5, 10];
		this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);

		if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
			throw new Error("GaugeHistogram buckets must be positive numbers");
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
	 * @param {number} value - The value to observe
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @throws {Error} If value is not finite or labels are invalid
	 * @example
	 * gh.observe(250, { method: 'GET' });
	 */
	observe(value: number, labels?: Record<string, string>): void {
		if (!Number.isFinite(value)) {
			throw new Error("GaugeHistogram observation value must be finite");
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
	 * @returns {GaugeHistogramLabelInterface} Interface with observe method
	 * @example
	 * const labeledHistogram = gh.labels({ method: 'GET' });
	 * labeledHistogram.observe(250);
	 */
	labels(labels: Record<string, string> = {}): GaugeHistogramLabelInterface {
		this.validateLabels(labels);
		return {
			observe: (value: number) => this.observe(value, labels),
		};
	}

	/**
	 * Resets all histogram values to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @example
	 * gh.reset({ method: 'GET' });
	 */
	reset(labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		this.timeSeries.set(key, this.initializeTimeSeries());
	}

	/**
	 * Gets a snapshot of current histogram state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {GaugeHistogramData} Current histogram data including buckets and counts
	 * @example
	 * const snapshot = gh.getSnapshot({ method: 'GET' });
	 * console.log(snapshot.sum, snapshot.count);
	 */
	getSnapshot(labels?: Record<string, string>): GaugeHistogramData {
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
	 * console.log(gh.getMetric());
	 * // # TYPE request_size_bytes gaugehistogram
	 * // request_size_bytes_bucket{le="100",method="GET"} 0
	 * // request_size_bytes_bucket{le="500",method="GET"} 1
	 * // request_size_bytes_bucket{le="+Inf",method="GET"} 1
	 * // request_size_bytes_gsum{method="GET"} 250
	 * // request_size_bytes_gcount{method="GET"} 1
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines: string[] = [this.metadata("gaugehistogram", prefix)];

		for (const [key, series] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);

			this.buckets.forEach((bucket) => {
				lines.push(`${name}_bucket{le="${bucket}"${labelStr ? "," + labelStr.slice(1) : ""}} ${series.counts.get(bucket.toString()) || 0}`);
			});

			lines.push(`${name}_bucket{le="+Inf"${labelStr ? "," + labelStr.slice(1) : ""}} ${series.counts.get("+Inf") || 0}`);

			lines.push(`${name}_gsum${labelStr} ${series.sum}`, `${name}_gcount${labelStr} ${series.count}`);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled gauge histogram time series
 * @interface GaugeHistogramLabelInterface
 * @property {function(number): void} observe - Records a value in the histogram
 */
interface GaugeHistogramLabelInterface {
	/**
	 * Records a value in the histogram
	 * @param {number} value - The value to observe
	 */
	observe(value: number): void;
}
