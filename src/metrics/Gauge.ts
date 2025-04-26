import type { MetricOptions, GaugeData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Gauge extends BaseMetric {
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries: Map<string, { value: number; updated: number }> = new Map();

	/**
	 * Creates a new Gauge instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);
	}

	/**
	 * Increments the gauge value for specific labels
	 * @param {number} [amount=1] - The amount to increment by
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	inc(amount: number = 1, labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const entry = this.timeSeries.get(key) || { value: 0, updated: 0 };
		entry.value += amount;
		entry.updated = Date.now();
		this.timeSeries.set(key, entry);
	}

	/**
	 * Decrements the gauge value for specific labels
	 * @param {number} [amount=1] - The amount to decrement by
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	dec(amount: number = 1, labels?: Record<string, string>): void {
		this.inc(-amount, labels);
	}

	/**
	 * Sets the gauge to a specific value for specific labels
	 * @param {number} value - The new value to set
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 */
	set(value: number, labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		this.timeSeries.set(key, { value, updated: Date.now() });
	}

	/**
	 * Gets the current gauge state
	 * @returns {GaugeData} Object containing value and timestamp
	 * @example
	 * const data = gauge.get();
	 * console.log(data.value, data.updated);
	 */
	get(labels?: Record<string, string>): GaugeData | null {
		const key = this.getTimeSeriesKey(labels);
		const data = this.timeSeries.get(key);
		if (!data) return null;
		return {
			value: data.value,
			updated: new Date(data.updated),
		};
	}

	/**
	 * Generates a unique key for a time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey(labels: Record<string, string> = {}): string {
		const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sorted);
	}

	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {GaugeLabelInterface} Interface with inc, dec, and set methods
	 */
	labels(labels: Record<string, string> = {}): GaugeLabelInterface {
		this.validateLabels(labels);
		return {
			inc: (amount = 1) => this.inc(amount, labels),
			dec: (amount = 1) => this.dec(amount, labels),
			set: (value: number) => this.set(value, labels),
		};
	}

	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted gauge data
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines = [this.metadata("gauge", prefix)];

		for (const [key, entry] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			const timestamp = entry.updated / 1000;
			lines.push(`${name}${labelStr} ${entry.value} ${timestamp}`);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled gauge time series
 * @typedef {Object} GaugeLabelInterface
 * @property {function(number=): void} inc - Increment the gauge value
 * @property {function(number=): void} dec - Decrement the gauge value
 * @property {function(number): void} set - Set the gauge to a specific value
 */
interface GaugeLabelInterface {
	inc(amount?: number): void;
	dec(amount?: number): void;
	set(value: number): void;
}
