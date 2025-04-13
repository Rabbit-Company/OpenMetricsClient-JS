import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

/**
 * A StateSet metric that represents a set of mutually exclusive states.
 * Each state is represented as a boolean value where exactly one state
 * should be true at any given time (like an enum).
 *
 * @class StateSet
 * @extends BaseMetric
 * @example
 * const serviceState = new StateSet({
 *   name: 'service_state',
 *   help: 'Current service state',
 *   states: ['starting', 'running', 'stopped', 'degraded']
 * });
 * serviceState.enableOnly('running');
 */
export class StateSet extends BaseMetric {
	/**
	 * Map of state names to their current boolean values
	 * @private
	 */
	private states: Record<string, boolean>;

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
		this.states = Object.fromEntries(options.states.map((s) => [s, false]));
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
	 * Sets a specific state's value
	 * @param {string} state - The state to modify
	 * @param {boolean} value - The value to set
	 * @throws {Error} If state doesn't exist
	 * @example
	 * stateSet.setState('ready', true);
	 */
	setState(state: string, value: boolean): void {
		if (!this.states.hasOwnProperty(state)) {
			throw new Error(`Unknown state: ${state}`);
		}
		this.states[state] = value;
	}

	/**
	 * Enables exactly one state and disables all others
	 * @param {string} state - The state to enable
	 * @throws {Error} If state doesn't exist
	 * @example
	 * stateSet.enableOnly('active');
	 */
	enableOnly(state: string): void {
		if (!this.states.hasOwnProperty(state)) {
			throw new Error(`Unknown state: ${state}`);
		}

		for (const s of Object.keys(this.states)) {
			this.states[s] = s === state;
		}
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
	 * // service_state{service_state="starting"} 0
	 * // service_state{service_state="running"} 1
	 * // service_state{service_state="stopped"} 0
	 * // service_state{service_state="degraded"} 0
	 */
	getMetric(prefix?: string): string {
		const lines = [this.metadata("stateset", prefix)];
		const metricName = this.getFullName(prefix);

		for (const [state, value] of Object.entries(this.states)) {
			const labels = this.formatLabels({ [this.name]: state });
			lines.push(`${metricName}${labels} ${value ? 1 : 0}`);
		}

		return lines.join("\n");
	}
}
