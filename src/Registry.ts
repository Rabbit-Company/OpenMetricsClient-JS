import { BaseMetric } from "./metrics/BaseMetric";
import type { RegistryOptions } from "./types";

export class Registry {
	private metrics: Map<string, BaseMetric> = new Map();
	private prefix?: string;
	private readonly autoRegister: boolean;

	constructor(options?: RegistryOptions) {
		this.prefix = options?.prefix;
		this.autoRegister = options?.autoRegister ?? false;
	}

	private getMetricKey(metric: BaseMetric): string {
		return `${metric.name}|${JSON.stringify(metric.labels)}`;
	}

	register(metric: BaseMetric): void {
		const key = this.getMetricKey(metric);
		if (this.metrics.has(key)) {
			throw new Error(`Metric with name ${metric.name} and labels ${JSON.stringify(metric.labels)} already registered`);
		}
		this.metrics.set(key, metric);

		if (this.autoRegister) {
			metric.registry = this;
		}
	}

	unregister(metric: BaseMetric): boolean {
		const key = this.getMetricKey(metric);
		return this.metrics.delete(key);
	}

	unregisterByName(name: string): number {
		let count = 0;
		for (const [key, metric] of this.metrics) {
			if (metric.name === name) {
				this.metrics.delete(key);
				count++;
			}
		}
		return count;
	}

	getMetrics(): BaseMetric[] {
		return Array.from(this.metrics.values());
	}

	getMetric(name: string, labels?: Record<string, string>): BaseMetric | undefined {
		const tempMetric = { name, labels } as BaseMetric;
		return this.metrics.get(this.getMetricKey(tempMetric));
	}

	metricsText(): string {
		return (
			Array.from(this.metrics.values())
				.map((m) => m.getMetric(this.prefix))
				.join("\n\n") + "\n# EOF"
		);
	}

	clear(): void {
		this.metrics.clear();
	}
}
