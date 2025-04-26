import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Unknown extends BaseMetric {
	/**
	 * Internal storage of values by label values
	 * @private
	 */
	private timeSeries: Map<string, { value: number; updated: number }> = new Map();

	/**
	 * Creates a new Unknown metric instance
	 * @constructor
	 * @param {MetricOptions & { value?: number }} options - Configuration options
	 */
	constructor(options: MetricOptions & { value?: number }) {
		super(options);

		// Initialize with default value if provided
		if (options.value !== undefined) {
			const defaultKey = this.getTimeSeriesKey({});
			this.timeSeries.set(defaultKey, {
				value: options.value,
				updated: Date.now(),
			});
		}
	}

	/**
	 * Sets the metric to a specific value for labeled instance
	 * @param {number} value - The new value to set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {void}
	 * @example
	 * unknownMetric.set(3.14, { instance: 'primary' });
	 */
	set(value: number, labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		this.timeSeries.set(key, {
			value,
			updated: Date.now(),
		});
	}

	/**
	 * Returns an interface for operating on a specific labeled instance
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {UnknownLabelInterface} Interface with set method
	 * @example
	 * const labeledMetric = unknownMetric.labels({ instance: 'primary' });
	 * labeledMetric.set(3.14);
	 */
	labels(labels: Record<string, string> = {}): UnknownLabelInterface {
		this.validateLabels(labels);
		return {
			set: (value: number) => this.set(value, labels),
		};
	}

	/**
	 * Gets the current value for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {number | undefined} The current value or undefined if not set
	 */
	get(labels?: Record<string, string>): number | undefined {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		return this.timeSeries.get(key)?.value;
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
	 * @returns {string} OpenMetrics formatted metric data
	 * @example
	 * console.log(customMetric.getMetric());
	 * // # TYPE custom_metric unknown
	 * // # HELP custom_metric Custom metric with arbitrary values
	 * // custom_metric{category="api",source="external"} 42
	 * // custom_metric{category="db",source="internal"} 3.14
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines: string[] = [this.metadata("unknown", prefix)];

		for (const [key, series] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			lines.push(`${name}${labelStr} ${series.value}`);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled unknown metric
 * @interface UnknownLabelInterface
 * @property {function(number): void} set - Sets the metric value
 */
interface UnknownLabelInterface {
	/**
	 * Sets the metric value
	 * @param {number} value - The new value to set
	 */
	set(value: number): void;
}
