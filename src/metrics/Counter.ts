import type { MetricOptions, CounterData } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Counter extends BaseMetric {
	private value: number = 0;
	private updated: number = Date.now();
	private created: number = Date.now();

	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	inc(amount = 1): void {
		if (amount < 0 || !Number.isFinite(amount)) return;
		this.value += amount;
		this.updated = Date.now();
	}

	get(): CounterData {
		return {
			value: this.value,
			updated: new Date(this.updated),
			created: new Date(this.created),
		};
	}

	reset(): void {
		const changed = Date.now();

		this.value = 0;
		this.created = changed;
		this.updated = changed;
	}

	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();
		const updatedTimestamp = this.updated / 1000;
		const createdTimestamp = this.created / 1000;

		return [
			this.metadata("counter", prefix),
			`${name}_total${labels} ${this.value} ${updatedTimestamp}`,
			`${name}_created${labels} ${createdTimestamp} ${updatedTimestamp}`,
		].join("\n");
	}
}
