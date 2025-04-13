import type { MetricOptions, GaugeData } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Gauge extends BaseMetric {
	private value = 0;
	private updated: number = Date.now();

	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	inc(amount: number = 1): void {
		if (!Number.isFinite(amount)) return;
		this.value += amount;
		this.updated = Date.now();
	}

	dec(amount: number = 1): void {
		if (!Number.isFinite(amount)) return;
		this.value -= amount;
		this.updated = Date.now();
	}

	set(value: number): void {
		if (!Number.isFinite(value)) return;
		this.value = value;
		this.updated = Date.now();
	}

	get(): GaugeData {
		return {
			value: this.value,
			updated: new Date(this.updated),
		};
	}

	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();
		const updatedTimestamp = this.updated / 1000;

		return `${this.metadata("gauge", prefix)}\n${name}${labels} ${this.value} ${updatedTimestamp}`;
	}
}
