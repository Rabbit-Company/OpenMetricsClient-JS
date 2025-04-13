import type { MetricOptions, GaugeData } from "../types";
import { BaseMetric } from "./BaseMetric";

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
export class Gauge extends BaseMetric {
	/**
	 * Current value of the gauge
	 * @private
	 */
	private value = 0;
	/**
	 * Timestamp of last update (in milliseconds since epoch)
	 * @private
	 */
	private updated: number = Date.now();

	/**
	 * Creates a new Gauge instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	/**
	 * Increments the gauge value
	 * @param {number} [amount=1] - The amount to increment by
	 * @returns {void}
	 * @example
	 * gauge.inc(); // increments by 1
	 * gauge.inc(2.5); // increments by 2.5
	 */
	inc(amount: number = 1): void {
		if (!Number.isFinite(amount)) return;
		this.value += amount;
		this.updated = Date.now();
	}

	/**
	 * Decrements the gauge value
	 * @param {number} [amount=1] - The amount to decrement by
	 * @returns {void}
	 * @example
	 * gauge.dec(); // decrements by 1
	 * gauge.dec(0.5); // decrements by 0.5
	 */
	dec(amount: number = 1): void {
		if (!Number.isFinite(amount)) return;
		this.value -= amount;
		this.updated = Date.now();
	}

	/**
	 * Sets the gauge to a specific value
	 * @param {number} value - The new value to set
	 * @returns {void}
	 * @example
	 * gauge.set(42); // sets value to 42
	 */
	set(value: number): void {
		if (!Number.isFinite(value)) return;
		this.value = value;
		this.updated = Date.now();
	}

	/**
	 * Gets the current gauge state
	 * @returns {GaugeData} Object containing value and timestamp
	 * @example
	 * const data = gauge.get();
	 * console.log(data.value, data.updated);
	 */
	get(): GaugeData {
		return {
			value: this.value,
			updated: new Date(this.updated),
		};
	}

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
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();
		const updatedTimestamp = this.updated / 1000;

		return `${this.metadata("gauge", prefix)}\n${name}${labels} ${this.value} ${updatedTimestamp}`;
	}
}
