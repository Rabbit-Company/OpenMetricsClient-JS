import type { Registry } from "../Registry";
import type { MetricOptions } from "../types";

/**
 * Abstract base class for all metric types.
 * Provides common functionality for name, labels, help text, and OpenMetrics formatting.
 *
 * @abstract
 * @class BaseMetric
 */
export abstract class BaseMetric {
	/**
	 * The name of the metric (must be unique within its registry)
	 * @public
	 * @readonly
	 */
	public readonly name: string;
	/**
	 * Descriptive help text for the metric
	 * @public
	 * @readonly
	 */
	public readonly help: string;
	/**
	 * Optional unit of measurement for the metric
	 * @public
	 * @readonly
	 */
	public readonly unit?: string;
	/**
	 * Key-value pairs of metric labels
	 * @public
	 * @readonly
	 */
	public readonly labels: Record<string, string>;
	/**
	 * Reference to the registry this metric is registered with (if any)
	 * @public
	 */
	public registry?: Registry;

	/**
	 * Creates a new BaseMetric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options for the metric
	 * @throws {Error} If label validation fails
	 */
	constructor(options: MetricOptions) {
		this.name = options.name;
		this.help = options.help;
		this.unit = options.unit;
		this.labels = options.labels || {};

		if (options.registry) {
			this.registry = options.registry;
			this.registry.register(this);
		}
	}

	/**
	 * Validates metric label names and values
	 * @protected
	 * @param {Record<string, string>} [labels] - Labels to validate
	 * @throws {Error} If any label name is invalid or value is not a string
	 */
	protected validateLabels(labels?: Record<string, string>): void {
		if (!labels) return;
		for (const [key, value] of Object.entries(labels)) {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
				throw new Error(`Invalid label name: ${key}`);
			}
			if (typeof value !== "string") {
				throw new Error(`Label value must be string for key: ${key}`);
			}
		}
	}

	/**
	 * Gets the fully qualified metric name with optional prefix
	 * @param {string} [prefix] - Optional prefix to prepend
	 * @returns {string} Full metric name
	 * @example
	 * metric.getFullName('app') // returns 'app_requests'
	 */
	getFullName(prefix?: string): string {
		return prefix ? `${prefix}_${this.name}` : this.name;
	}

	/**
	 * Formats labels for OpenMetrics output
	 * @protected
	 * @param {Record<string, string>} [labels] - Additional labels to include
	 * @returns {string} Formatted label string in OpenMetrics format
	 */
	protected formatLabels(labels?: Record<string, string>): string {
		const allLabels = { ...this.labels, ...labels };
		if (Object.keys(allLabels).length === 0) return "";

		const labelStrings = Object.entries(allLabels).map(([k, v]) => `${k}="${escapeLabelValue(v)}"`);
		return `{${labelStrings.join(",")}}`;
	}

	/**
	 * Generates metadata lines for OpenMetrics output
	 * @protected
	 * @param {string} type - The metric type (counter, gauge, etc.)
	 * @param {string} [prefix] - Optional name prefix
	 * @returns {string} Formatted metadata lines
	 */
	protected metadata(type: string, prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const lines = [`# TYPE ${fullName} ${type}`];
		if (this.unit) {
			lines.push(`# UNIT ${fullName} ${this.unit}`);
		}
		lines.push(`# HELP ${fullName} ${this.help}`);
		return lines.join("\n");
	}

	/**
	 * Abstract method to generate complete OpenMetrics output for the metric
	 * @abstract
	 * @param {string} [prefix] - Optional name prefix
	 * @returns {string} Complete OpenMetrics formatted metric data
	 */
	abstract getMetric(prefix?: string): string;
}

/**
 * Escapes label values for OpenMetrics format
 * @param {string} value - The label value to escape
 * @returns {string} Properly escaped label value
 * @private
 */
function escapeLabelValue(value: string): string {
	return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}
