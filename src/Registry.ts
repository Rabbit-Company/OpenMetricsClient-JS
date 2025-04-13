import { BaseMetric } from "./metrics/BaseMetric";
import type { RegistryOptions } from "./types";

/**
 * A registry for collecting and managing metrics.
 *
 * The Registry is responsible for storing metrics, enforcing uniqueness,
 * and generating OpenMetrics-compatible output.
 *
 * @class Registry
 * @example
 * const registry = new Registry({ prefix: "app" });
 * const counter = new Counter({ name: 'requests', help: 'Total requests', registry });
 * console.log(registry.metricsText());
 */
export class Registry {
	/**
	 * Internal storage of metrics using a Map with composite keys
	 * @private
	 */
	private metrics: Map<string, BaseMetric> = new Map();
	/**
	 * Optional prefix for all metric names
	 * @private
	 */
	private prefix?: string;
	/**
	 * Whether to automatically set the registry reference on registered metrics
	 * @private
	 * @readonly
	 */
	private readonly autoRegister: boolean;

	/**
	 * Creates a new Registry instance
	 * @constructor
	 * @param {RegistryOptions} [options] - Configuration options
	 */
	constructor(options?: RegistryOptions) {
		this.prefix = options?.prefix;
		this.autoRegister = options?.autoRegister ?? false;
	}

	/**
	 * Generates a unique key for a metric based on name and labels
	 * @private
	 * @param {BaseMetric} metric - The metric instance
	 * @returns {string} Composite key string
	 */
	private getMetricKey(metric: BaseMetric): string {
		return `${metric.name}|${JSON.stringify(metric.labels)}`;
	}

	/**
	 * Registers a new metric with the registry
	 * @param {BaseMetric} metric - The metric to register
	 * @throws {Error} If a metric with the same name and labels already exists
	 * @example
	 * registry.register(new Counter({ name: 'hits', help: 'Page hits' }));
	 */
	register(metric: BaseMetric): void {
		const key = this.getMetricKey(metric);
		if (this.metrics.has(key)) {
			throw new Error(`Metric with name ${metric.name} and labels ${JSON.stringify(metric.labels)} already registered`);
		}
		this.metrics.set(key, metric);

		if (this.autoRegister) {
			metric.registry = this;
		}
	}

	/**
	 * Unregisters a specific metric instance
	 * @param {BaseMetric} metric - The metric to remove
	 * @returns {boolean} True if the metric was found and removed
	 */
	unregister(metric: BaseMetric): boolean {
		const key = this.getMetricKey(metric);
		return this.metrics.delete(key);
	}

	/**
	 * Unregisters all metrics with a given name
	 * @param {string} name - The metric name to remove
	 * @returns {number} Count of metrics removed
	 */
	unregisterByName(name: string): number {
		let count = 0;
		for (const [key, metric] of this.metrics) {
			if (metric.name === name) {
				this.metrics.delete(key);
				count++;
			}
		}
		return count;
	}

	/**
	 * Gets all registered metrics
	 * @returns {BaseMetric[]} Array of all registered metrics
	 */
	getMetrics(): BaseMetric[] {
		return Array.from(this.metrics.values());
	}

	/**
	 * Finds a metric by name and optional labels
	 * @param {string} name - The metric name to find
	 * @param {Record<string, string>} [labels] - Optional labels to match
	 * @returns {BaseMetric|undefined} The found metric or undefined
	 */
	getMetric(name: string, labels?: Record<string, string>): BaseMetric | undefined {
		const tempMetric = { name, labels } as BaseMetric;
		return this.metrics.get(this.getMetricKey(tempMetric));
	}

	/**
	 * Generates OpenMetrics-compatible text output
	 * @returns {string} Formatted metrics text
	 */
	metricsText(): string {
		return (
			Array.from(this.metrics.values())
				.map((m) => m.getMetric(this.prefix))
				.join("\n") + "\n# EOF"
		);
	}

	/**
	 * Clears all metrics from the registry
	 */
	clear(): void {
		this.metrics.clear();
	}
}
