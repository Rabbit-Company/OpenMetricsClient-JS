import type { MetricOptions } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Info extends BaseMetric {
	constructor(options: MetricOptions) {
		super(options);
		this.validateLabels(options.labels);
	}

	getMetric(prefix?: string): string {
		const name = this.getFullName(prefix);
		const labels = this.formatLabels();

		return `${this.metadata("info", prefix)}\n${name}_info${labels} 1`;
	}
}
