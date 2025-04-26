import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * A StateSet metric that represents a set of mutually exclusive states
 * with support for multiple time series via dynamic labels.
 *
 * Each state is represented as a boolean value where exactly one state
 * should be true at any given time (like an enum). The StateSet can track
 * different sets of states for different labeled instances.
 * @class StateSet
 * @extends BaseMetric
 * @example
 * const serviceState = new StateSet({
 *   name: 'service_state',
 *   help: 'Current service state',
 *   labelNames: ['service_name'],
 *   states: ['starting', 'running', 'stopped', 'degraded']
 * });
 *
 * // Set states for different services
 * serviceState.labels({ service_name: 'api' }).enableOnly('running');
 * serviceState.labels({ service_name: 'worker' }).enableOnly('starting');
 */
export class StateSet extends BaseMetric {
	/**
	 * Array of valid state names
	 * @private
	 * @readonly
	 */
	private readonly stateNames: string[];

	/**
	 * Internal storage of state sets by label values
	 * @private
	 */
	private timeSeries: Map<
		string,
		{
			states: Record<string, boolean>;
		}
	> = new Map();

	/**
	 * Creates a new StateSet instance
	 * @constructor
	 * @param {MetricOptions & { states: string[] }} options - Configuration options
	 * @throws {Error} If states are invalid or unit is specified
	 */
	constructor(options: MetricOptions & { states: string[] }) {
		if (options.unit && options.unit !== "") {
			throw new Error("StateSet metrics must have an empty unit string");
		}

		super({ ...options, unit: "" });
		this.validateStates(options.states);
		this.stateNames = options.states;
	}

	/**
	 * Validates the state names
	 * @private
	 * @param {string[]} states - Array of state names to validate
	 * @throws {Error} If states are empty, contain duplicates, or match metric name
	 */
	private validateStates(states: string[]): void {
		if (states.length === 0) {
			throw new Error("StateSet must have at least one state");
		}

		const seen = new Set<string>();
		for (const state of states) {
			if (seen.has(state)) {
				throw new Error(`Duplicate state name: ${state}`);
			}
			seen.add(state);

			if (state === this.name) {
				throw new Error(`State name cannot match metric name: ${state}`);
			}
		}
	}

	/**
	 * Initializes a new state set with all states disabled
	 * @private
	 * @returns {Object} Initialized state set
	 */
	private initializeStateSet(): {
		states: Record<string, boolean>;
	} {
		return {
			states: Object.fromEntries(this.stateNames.map((s) => [s, false])),
		};
	}

	/**
	 * Sets a specific state's value for labeled instance
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * stateSet.setState('ready', true, { instance: 'primary' });
	 */
	setState(state: string, value: boolean, labels?: Record<string, string>): void {
		this.validateLabels(labels);
		if (!this.stateNames.includes(state)) {
			throw new Error(`Unknown state: ${state}`);
		}

		const key = this.getTimeSeriesKey(labels);
		if (!this.timeSeries.has(key)) {
			this.timeSeries.set(key, this.initializeStateSet());
		}

		this.timeSeries.get(key)!.states[state] = value;
	}

	/**
	 * Returns the current value of a state for labeled instance
	 * @param {string} state - The state to check
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {boolean} The current value of the state
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * const isRunning = stateSet.getState('running', { instance: 'primary' });
	 */
	getState(state: string, labels?: Record<string, string>): boolean {
		this.validateLabels(labels);
		if (!this.stateNames.includes(state)) {
			throw new Error(`Unknown state: ${state}`);
		}

		const key = this.getTimeSeriesKey(labels);
		return this.timeSeries.get(key)?.states[state] || false;
	}

	/**
	 * Enables exactly one state and disables all others for labeled instance
	 * @param {string} state - The state to enable
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @throws {Error} If state doesn't exist or labels are invalid
	 * @example
	 * stateSet.enableOnly('active', { instance: 'primary' });
	 */
	enableOnly(state: string, labels?: Record<string, string>): void {
		this.validateLabels(labels);
		if (!this.stateNames.includes(state)) {
			throw new Error(`Unknown state: ${state}`);
		}

		const key = this.getTimeSeriesKey(labels);
		if (!this.timeSeries.has(key)) {
			this.timeSeries.set(key, this.initializeStateSet());
		}

		const series = this.timeSeries.get(key)!;
		for (const s of this.stateNames) {
			series.states[s] = s === state;
		}
	}

	/**
	 * Returns an interface for operating on a specific labeled state set
	 * @param {Record<string, string>} labels - Label values identifying the instance
	 * @returns {StateSetLabelInterface} Interface with state manipulation methods
	 * @example
	 * const labeledStateSet = stateSet.labels({ instance: 'primary' });
	 * labeledStateSet.enableOnly('active');
	 */
	labels(labels: Record<string, string>): StateSetLabelInterface {
		this.validateLabels(labels);
		return {
			setState: (state: string, value: boolean) => this.setState(state, value, labels),
			enableOnly: (state: string) => this.enableOnly(state, labels),
			getState: (state: string) => this.getState(state, labels),
		};
	}

	/**
	 * Generates a unique key for a state set based on sorted label values
	 * @private
	 * @param {Record<string, string>} labels - Label values
	 * @returns {string} Unique key for the state set
	 */
	private getTimeSeriesKey(labels: Record<string, string> = {}): string {
		const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
		return JSON.stringify(sortedEntries);
	}

	/**
	 * Generates OpenMetrics-compatible text representation
	 * @override
	 * @param {string} [prefix] - Optional metric name prefix
	 * @returns {string} OpenMetrics formatted stateset data
	 * @example
	 * console.log(serviceState.getMetric());
	 * // # TYPE service_state stateset
	 * // # HELP service_state Current service state
	 * // service_state{service_state="starting",service_name="api"} 0
	 * // service_state{service_state="running",service_name="api"} 1
	 * // service_state{service_state="stopped",service_name="api"} 0
	 * // service_state{service_state="degraded",service_name="api"} 0
	 * // service_state{service_state="starting",service_name="worker"} 1
	 * // service_state{service_state="running",service_name="worker"} 0
	 * // service_state{service_state="stopped",service_name="worker"} 0
	 * // service_state{service_state="degraded",service_name="worker"} 0
	 */
	getMetric(prefix?: string): string {
		const lines = [this.metadata("stateset", prefix)];
		const metricName = this.getFullName(prefix);

		for (const [key, series] of this.timeSeries) {
			const labels = Object.fromEntries(JSON.parse(key));
			const baseLabelStr = this.formatLabels(labels);

			for (const [state, value] of Object.entries(series.states)) {
				const stateLabel = { [this.name]: state };
				const fullLabelStr = this.formatLabels({ ...labels, ...stateLabel });
				lines.push(`${metricName}${fullLabelStr} ${value ? 1 : 0}`);
			}
		}

		return lines.join("\n");
	}
}

/**
 * Interface for operating on a labeled state set
 * @interface StateSetLabelInterface
 * @property {function(string, boolean): void} setState - Sets a specific state's value
 * @property {function(string): void} enableOnly - Enables exactly one state and disables others
 * @property {function(string): boolean} getState - Gets the current value of a state
 */
interface StateSetLabelInterface {
	/**
	 * Sets a specific state's value
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 */
	setState(state: string, value: boolean): void;

	/**
	 * Enables exactly one state and disables all others
	 * @param {string} state - The state to enable
	 */
	enableOnly(state: string): void;

	/**
	 * Gets the current value of a state
	 * @param {string} state - The state to check
	 * @returns {boolean} The current value of the state
	 */
	getState(state: string): boolean;
}
