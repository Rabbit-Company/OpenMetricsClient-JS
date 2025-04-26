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
	 * Array of allowed label names for this metric
	 * @public
	 * @readonly
	 */
	public readonly labelNames: string[];
	/**
	 * Reference to the registry this metric is registered with (if any)
	 * @public
	 */
	public registry?: Registry;

	/**
	 * Creates a new BaseMetric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options for the metric
	 * @throws {Error} If label name validation fails
	 */
	constructor(options: MetricOptions) {
		let name = options.name;
		const unit = options.unit;

		if (unit && !name.endsWith(`_${unit}`)) {
			name = `${name}_${unit}`;
		}

		this.name = name;
		this.help = options.help;
		this.unit = unit;
		this.labelNames = options.labelNames || [];

		this.validateLabelNames();

		if (options.registry) {
			this.registry = options.registry;
			this.registry.register(this);
		}
	}

	/**
	 * Validates metric label names
	 * @private
	 * @throws {Error} If any label name is invalid
	 */
	private validateLabelNames(): void {
		for (const name of this.labelNames) {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
				throw new Error(`Invalid label name: ${name}`);
			}
		}
	}

	/**
	 * Validates provided label values against expected label names
	 * @protected
	 * @param {Record<string, string>} labels - Labels to validate
	 * @throws {Error} If labels don't match expected label names
	 */
	protected validateLabels(labels: Record<string, string> = {}): void {
		const provided = Object.keys(labels);

		// Check for extra labels
		for (const label of provided) {
			if (!this.labelNames.includes(label)) {
				throw new Error(`Unexpected label: ${label}`);
			}
		}

		// Check all labelNames are provided
		for (const name of this.labelNames) {
			if (!(name in labels)) {
				throw new Error(`Missing label: ${name}`);
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
	 * @param {Record<string, string>} labels - Labels to format
	 * @returns {string} Formatted label string in OpenMetrics format
	 */
	protected formatLabels(labels: Record<string, string> = {}): string {
		const labelStrings = Object.entries(labels).map(([k, v]) => `${k}="${escapeLabelValue(v)}"`);
		return labelStrings.length > 0 ? `{${labelStrings.join(",")}}` : "";
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
