import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * An Info metric that provides static metadata about a component or service
 * with support for multiple time series via dynamic labels.
 *
 * Info metrics are used to expose constant information like versions, build info,
 * or other immutable attributes. They always have a value of 1 and are typically
 * used with labels to provide the metadata values.
 * @class Info
 * @extends BaseMetric
 * @example
 * const info = new Info({
 *   name: 'build_info',
 *   help: 'Build information',
 *   labelNames: ['version', 'commit']
 * });
 *
 * // Set info values with labels
 * info.labels({ version: '1.2.3', commit: 'abc123' }).set();
 */
export class Info extends BaseMetric {
	/**
	 * Internal storage of info time series by label values
	 * @private
	 */
	private timeSeries: Set<string> = new Set();

	/**
	 * Creates a new Info metric instance
	 * @constructor
	 * @param {MetricOptions} options - Configuration options
	 */
	constructor(options: MetricOptions) {
		super(options);
	}

	/**
	 * Records an info metric with specific label values
	 * @param {Record<string, string>} labels - Label values containing the metadata
	 * @returns {void}
	 * @example
	 * info.set({ version: '1.2.3', commit: 'abc123' });
	 */
	set(labels?: Record<string, string>): void {
		this.validateLabels(labels);
		const key = this.getTimeSeriesKey(labels);
		this.timeSeries.add(key);
	}

	/**
	 * Returns an interface for setting info values with specific labels
	 * @param {Record<string, string>} labels - Label values containing the metadata
	 * @returns {InfoLabelInterface} Interface with set method
	 * @example
	 * const labeledInfo = info.labels({ version: '1.2.3' });
	 * labeledInfo.set();
	 */
	labels(labels: Record<string, string> = {}): InfoLabelInterface {
		this.validateLabels(labels);
		return {
			set: () => this.set(labels),
		};
	}

	/**
	 * Generates a unique key for an info time series based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the time series
	 */
	private getTimeSeriesKey(labels: Record<string, string> = {}): string {
		const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sortedEntries);
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
	 * // build_info_info{version="2.0.0",commit="def456"} 1
	 */
	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const lines: string[] = [this.metadata("info", prefix)];

		for (const key of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const labelStr = this.formatLabels(labels);
			lines.push(`${name}_info${labelStr} 1`);
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled info time series
 * @interface InfoLabelInterface
 * @property {function(): void} set - Records the info metric with label values
 */
interface InfoLabelInterface {
	/**
	 * Records the info metric with label values
	 */
	set(): void;
}
