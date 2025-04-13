import type { MetricOptions, CounterData } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * A counter metric that represents a monotonically increasing value.
 * Counters are typically used to track request counts, completed tasks, or errors.
 *
 * @class Counter
 * @extends BaseMetric
 * @example
 * const counter = new Counter({ name: 'http_requests', help: 'Total HTTP requests' });
 * counter.inc();
 * counter.inc(5);
 */
export class Counter extends BaseMetric {
	/**
	 * Current value of the counter
	 * @private
	 */
	private value: number = 0;
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
	 * Creates a new Counter instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	/**
	 * Increments the counter value
	 * @param {number} [amount=1] - The amount to increment by (must be positive)
	 * @returns {void}
	 * @example
	 * counter.inc(); // increments by 1
	 * counter.inc(5); // increments by 5
	 */
	inc(amount = 1): void {
		if (amount < 0 || !Number.isFinite(amount)) return;
		this.value += amount;
		this.updated = Date.now();
	}

	/**
	 * Gets the current counter state
	 * @returns {CounterData} Object containing value and timestamps
	 * @example
	 * const data = counter.get();
	 * console.log(data.value, data.updated);
	 */
	get(): CounterData {
		return {
			value: this.value,
			updated: new Date(this.updated),
			created: new Date(this.created),
		};
	}

	/**
	 * Resets the counter to zero and updates timestamps
	 * @returns {void}
	 */
	reset(): void {
		const changed = Date.now();

		this.value = 0;
		this.created = changed;
		this.updated = changed;
	}

	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted counter data
	 * @example
	 * console.log(counter.getMetric());
	 * // # TYPE http_requests counter
	 * // # HELP http_requests Total HTTP requests
	 * // http_requests_total 6 1625097600
	 * // http_requests_created 1625097000 1625097600
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();
		const updatedTimestamp = this.updated / 1000;
		const createdTimestamp = this.created / 1000;

		return [
			this.metadata("counter", prefix),
			`${name}_total${labels} ${this.value} ${updatedTimestamp}`,
			`${name}_created${labels} ${createdTimestamp} ${updatedTimestamp}`,
		].join("\n");
	}
}
