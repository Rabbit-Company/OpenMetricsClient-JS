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
	 * Registers a new metric with the registry
	 * @param {BaseMetric} metric - The metric to register
	 * @throws {Error} If a metric with the same name already exists
	 * @example
	 * registry.register(new Counter({ name: 'hits', help: 'Page hits' }));
	 */
	register(metric: BaseMetric): void {
		const name = metric.name;
		if (this.metrics.has(name)) {
			throw new Error(`Metric with name ${name} already registered`);
		}
		this.metrics.set(name, metric);

		if (this.autoRegister) {
			metric.registry = this;
		}
	}

	/**
	 * Unregisters a metric by name
	 * @param {string} name - The metric name to remove
	 * @returns {boolean} True if the metric was found and removed
	 */
	unregister(name: string): boolean {
		return this.metrics.delete(name);
	}

	/**
	 * Gets all registered metrics
	 * @returns {BaseMetric[]} Array of all registered metrics
	 */
	getMetrics(): BaseMetric[] {
		return Array.from(this.metrics.values());
	}

	/**
	 * Finds a metric by name
	 * @param {string} name - The metric name to find
	 * @returns {BaseMetric|undefined} The found metric or undefined
	 */
	getMetric(name: string): BaseMetric | undefined {
		return this.metrics.get(name);
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
