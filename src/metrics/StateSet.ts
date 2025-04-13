import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

export class StateSet extends BaseMetric {
	private states: Record<string, boolean>;

	constructor(options: MetricOptions & { states: string[] }) {
		if (options.unit && options.unit !== "") {
			throw new Error("StateSet metrics must have an empty unit string");
		}

		super({ ...options, unit: "" });
		this.validateStates(options.states);
		this.states = Object.fromEntries(options.states.map((s) => [s, false]));
	}

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

	setState(state: string, value: boolean): void {
		if (!this.states.hasOwnProperty(state)) {
			throw new Error(`Unknown state: ${state}`);
		}
		this.states[state] = value;
	}

	enableOnly(state: string): void {
		if (!this.states.hasOwnProperty(state)) {
			throw new Error(`Unknown state: ${state}`);
		}

		for (const s of Object.keys(this.states)) {
			this.states[s] = s === state;
		}
	}

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
