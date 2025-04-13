import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Unknown extends BaseMetric {
	/**
	 * Current numeric value of the metric
	 * @private
	 */
	private value: number;

	/**
	 * Creates a new Unknown metric instance
	 * @constructor
	 * @param {MetricOptions & { value?: number }} options - Configuration options
	 */
	constructor(options: MetricOptions & { value?: number }) {
		super(options);
		this.value = options.value || 0;
	}

	/**
	 * Sets the metric to a specific value
	 * @param {number} value - The new value to set
	 * @returns {void}
	 * @example
	 * unknownMetric.set(3.14);
	 */
	set(value: number): void {
		this.value = value;
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
	 * // custom_metric 42
	 */
	getMetric(prefix?: string): string {
		return `${this.metadata("unknown", prefix)}\n${this.getFullName(prefix)} ${this.value}`;
	}
}
