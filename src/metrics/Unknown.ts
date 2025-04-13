import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Unknown extends BaseMetric {
	private value: number;

	constructor(options: MetricOptions & { value?: number }) {
		super(options);
		this.value = options.value || 0;
	}

	set(value: number): void {
		this.value = value;
	}

	getMetric(prefix?: string): string {
		return `${this.metadata("unknown", prefix)}\n${this.getFullName(prefix)} ${this.value}`;
	}
}
