import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * An Info metric that provides static metadata about a component or service.
 *
 * Info metrics are used to expose constant information like versions, build info,
 * or other immutable attributes. They always have a value of 1 and are typically
 * used with labels to provide the metadata values.
 *
 * @class Info
 * @extends BaseMetric
 * @example
 * const info = new Info({
 *   name: 'build_info',
 *   help: 'Build information',
 *   labels: {
 *     version: '1.2.3',
 *     commit: 'abc123'
 *   }
 * });
 */
export class Info extends BaseMetric {
	/**
	 * Creates a new Info metric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted info metric
	 * @example
	 * console.log(info.getMetric());
	 * // # TYPE build_info info
	 * // # HELP build_info Build information
	 * // build_info_info{version="1.2.3",commit="abc123"} 1
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();

		return `${this.metadata("info", prefix)}\n${name}_info${labels} 1`;
	}
}
