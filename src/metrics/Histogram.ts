import type { MetricOptions, HistogramData } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Histogram extends BaseMetric {
	private readonly buckets: number[];
	private counts: Map<string, number>;
	private sum: number = 0;
	private count: number = 0;
	private updated: number = Date.now();
	private created: number = Date.now();

	constructor(options: MetricOptions & { buckets?: number[] }) {
		super(options);
		this.validateLabels(options.labels);

		const defaultBuckets = [0.1, 0.5, 1, 5, 10];
		this.buckets = (options.buckets || defaultBuckets).sort((a, b) => a - b);

		if (this.buckets.some((b) => b <= 0 || !Number.isFinite(b))) {
			throw new Error("Histogram buckets must be positive numbers");
		}

		this.counts = new Map([...this.buckets.map((b) => [b.toString(), 0] as [string, number]), ["+Inf", 0]]);
	}

	observe(value: number): void {
		if (value < 0 || !Number.isFinite(value)) return;

		this.count++;
		this.sum += value;
		this.updated = Date.now();

		for (const bucket of this.buckets) {
			if (value <= bucket) {
				this.counts.set(bucket.toString(), (this.counts.get(bucket.toString()) ?? 0) + 1);
			}
		}

		this.counts.set("+Inf", (this.counts.get("+Inf") ?? 0) + 1);
	}

	reset(): void {
		this.count = 0;
		this.sum = 0;
		this.updated = Date.now();
		this.created = Date.now();

		for (const key of this.counts.keys()) {
			this.counts.set(key, 0);
		}
	}

	getMetric(prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const labels = this.formatLabels();
		const lines: string[] = [this.metadata("histogram", prefix)];

		for (const bucket of this.buckets) {
			lines.push(`${fullName}_bucket{le="${bucket}"} ${this.counts.get(bucket.toString()) ?? 0}`);
		}

		lines.push(
			`${fullName}_bucket{le="+Inf"} ${this.counts.get("+Inf") ?? 0}`,
			`${fullName}_count ${this.count}`,
			`${fullName}_sum ${this.sum}`,
			`${fullName}_created ${this.created / 1000}`
		);

		return lines.join("\n");
	}

	getSnapshot(): HistogramData {
		return {
			buckets: this.buckets,
			counts: this.counts,
			sum: this.sum,
			count: this.count,
			created: new Date(this.created),
			updated: new Date(this.updated),
		};
	}
}
