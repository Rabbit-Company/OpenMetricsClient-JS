import type { MetricOptions, SummaryOptions, SummaryBucket, SummaryData } from "../types";
import { BaseMetric } from "./BaseMetric";

export class Summary extends BaseMetric {
	private readonly quantiles: number[];
	private readonly maxAgeSeconds: number;
	private readonly ageBuckets: number;

	private buckets: SummaryBucket[];
	private currentBucket: SummaryBucket;
	private rotationInterval: NodeJS.Timeout;
	private sum: number = 0;
	private count: number = 0;
	private updated: number = Date.now();
	private created: number = Date.now();
	private isDestroyed = false;

	constructor(options: SummaryOptions) {
		super(options);
		this.quantiles = options.quantiles || [0.5, 0.9, 0.99];
		this.maxAgeSeconds = options.maxAgeSeconds || 600;
		this.ageBuckets = options.ageBuckets || 5;
		this.validateQuantiles();

		this.buckets = [];
		this.currentBucket = this.createBucket();

		this.rotationInterval = setInterval(() => this.rotateBuckets(), (this.maxAgeSeconds * 1000) / this.ageBuckets);
		this.rotationInterval.unref?.();
	}

	private createBucket() {
		return { values: [], sum: 0, count: 0, timestamp: Date.now() };
	}

	private validateQuantiles(): void {
		for (const q of this.quantiles) {
			if (q <= 0 || q >= 1) throw new Error(`Quantile ${q} must be between 0 and 1`);
		}
	}

	private rotateBuckets(): void {
		if (this.isDestroyed) return;
		// Add current bucket to history
		this.buckets.push(this.currentBucket);

		// Remove expired buckets
		const cutoff = Date.now() - this.maxAgeSeconds * 1000;
		this.buckets = this.buckets.filter((b) => b.timestamp >= cutoff);

		// Recalculate aggregates
		this.recalculateAggregates();

		// Start new bucket
		this.currentBucket = this.createBucket();
		this.updated = Date.now();
	}

	private recalculateAggregates(): void {
		this.sum = this.buckets.reduce((sum, b) => sum + b.sum, 0);
		this.count = this.buckets.reduce((count, b) => count + b.count, 0);
	}

	observe(value: number): void {
		if (this.isDestroyed || !Number.isFinite(value) || value < 0) return;

		this.currentBucket.values.push(value);
		this.currentBucket.sum += value;
		this.currentBucket.count++;
		this.sum += value;
		this.count++;
		this.updated = Date.now();
	}

	reset(): void {
		this.buckets = [];
		this.currentBucket = this.createBucket();
		this.sum = 0;
		this.count = 0;
		this.updated = Date.now();
		this.created = Date.now();
	}

	getMetric(prefix?: string): string {
		const fullName = this.getFullName(prefix);
		const lines = [this.metadata("summary", prefix)];
		const createdTimestamp = this.created / 1000;
		const updatedTimestamp = this.updated / 1000;

		const allValues = this.buckets.concat([this.currentBucket]).flatMap((b) => b.values);

		if (allValues.length > 0) {
			const sortedValues = [...allValues].sort((a, b) => a - b);

			for (const q of this.quantiles) {
				const pos = q * (sortedValues.length - 1);
				const base = Math.floor(pos);
				const rest = pos - base;

				const value = base + 1 < sortedValues.length ? sortedValues[base]! + rest * (sortedValues[base + 1]! - sortedValues[base]!) : sortedValues[base]!;

				lines.push(`${fullName}{quantile="${q}"} ${value}`);
			}
		} else {
			for (const q of this.quantiles) {
				lines.push(`${fullName}{quantile="${q}"} NaN`);
			}
		}

		lines.push(`${fullName}_sum ${this.sum}`, `${fullName}_count ${this.count}`, `${fullName}_created ${createdTimestamp}`);

		return lines.join("\n");
	}

	getSnapshot(): SummaryData {
		return {
			sum: this.sum,
			count: this.count,
			buckets: this.buckets.length,
			currentBucketSize: this.currentBucket.values.length,
			maxAgeSeconds: this.maxAgeSeconds,
			updated: new Date(this.updated),
			created: new Date(this.created),
		};
	}

	destroy(): void {
		if (this.isDestroyed) return;

		this.isDestroyed = true;
		clearInterval(this.rotationInterval);
		this.reset();
	}
}
