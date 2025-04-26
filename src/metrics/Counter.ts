import type { MetricOptions, CounterData } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * A counter metric that represents a monotonically increasing value.
 * Supports multiple time series with dynamic labels.
 * Counters are typically used to track request counts, completed tasks, or errors.
 * @class Counter
 * @extends BaseMetric
 * @example
 * const counter = new Counter({
 *   name: 'http_requests',
 *   help: 'Total HTTP requests',
 *   labelNames: ['method', 'status']
 * });
 * counter.labels({ method: 'GET', status: '200' }).inc();
 * counter.labels({ method: 'POST', status: '500' }).inc(2);
 */
export class Counter extends BaseMetric {
	/**
	 * Internal storage of time series data by label values
	 * @private
	 */
	private timeSeries: Map<string, { value: number; created: number; updated: number }> = new Map();

	/**
	 * Creates a new Counter instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);

		const defaultKey = this.getTimeSeriesKey({});
		this.timeSeries.set(defaultKey, {
			value: 0,
			created: Date.now(),
			updated: Date.now(),
		});
	}

	/**
	 * Increments the counter value for specific labels
	 * @param {number} [amount=1] - The amount to increment by (must be positive)
	 * @param {Record<string, string>} labels - Label values for this observation
	 * @returns {void}
	 * @throws {Error} If amount is negative
	 */
	inc(amount: number = 1, labels?: Record<string, string>): void {
		if (amount < 0 || !Number.isFinite(amount)) {
			throw new Error("Counter increment amount must be positive");
		}

		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const now = Date.now();
		const entry = this.timeSeries.get(key) || { value: 0, created: now, updated: now };
		entry.value += amount;
		entry.updated = now;
		this.timeSeries.set(key, entry);
	}

	/**
	 * Gets the current counter state for specific labels
	 * @param {Record<string, string>} labels - Label values to get
	 * @returns {CounterData} Object containing value and timestamps
	 */
	get(labels?: Record<string, string>): CounterData {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const entry = this.timeSeries.get(key);

		if (!entry) {
			return { value: 0, created: new Date(0), updated: new Date(0) };
		}

		return {
			value: entry.value,
			created: new Date(entry.created),
			updated: new Date(entry.updated),
		};
	}

	/**
	 * Resets the counter to zero for specific labels
	 * @param {Record<string, string>} labels - Label values to reset
	 * @returns {void}
	 */
	reset(labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		const now = Date.now();
		this.timeSeries.set(key, { value: 0, created: now, updated: now });
	}

	/**
	 * Returns an interface for operating on a specific labeled time series
	 * @param {Record<string, string>} labels - Label values for the time series
	 * @returns {CounterLabelInterface} Interface with inc method
	 */
	labels(labels: Record<string, string> = {}): CounterLabelInterface {
		this.validateLabels(labels);
		return {
			inc: (amount = 1) => this.inc(amount, labels),
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
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted counter data
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines = [this.metadata("counter", prefix)];

		// Add _total metrics for each time series
		for (const [key, entry] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			const updatedTimestamp = entry.updated / 1000;
			lines.push(`${name}_total${labelStr} ${entry.value} ${updatedTimestamp}`);
		}

		// Add _created metrics for each time series
		for (const [key, entry] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			const createdTimestamp = entry.created / 1000;
			const updatedTimestamp = entry.updated / 1000;
			lines.push(`${name}_created${labelStr} ${createdTimestamp} ${updatedTimestamp}`);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled counter time series
 * @typedef {Object} CounterLabelInterface
 * @property {function(number=): void} inc - Increment the counter value
 */
interface CounterLabelInterface {
	inc(amount?: number): void;
}
