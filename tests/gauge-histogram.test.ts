import { describe, expect, test } from "bun:test";
import { GaugeHistogram } from "../src/openmetrics-client";

describe("GaugeHistogram", () => {
	test("should track observations in buckets", () => {
		const gh = new GaugeHistogram({
			name: "request_sizes",
			help: "",
			buckets: [100, 500, 1000],
		});

		gh.observe(250);
		gh.observe(750);
		const snapshot = gh.getSnapshot();
		expect(snapshot.count).toBe(2);
		expect(snapshot.sum).toBe(1000);
	});

	describe("GaugeHistogram Labels", () => {
		test("should maintain separate histograms per label set", () => {
			const gh = new GaugeHistogram({
				name: "queue_sizes",
				help: "",
				labelNames: ["queue"],
				buckets: [10, 20, 30],
			});

			gh.labels({ queue: "orders" }).observe(15);
			gh.labels({ queue: "payments" }).observe(25);

			const ordersData = gh.getSnapshot({ queue: "orders" });
			const paymentsData = gh.getSnapshot({ queue: "payments" });

			expect(ordersData.count).toBe(1);
			expect(paymentsData.count).toBe(1);
			expect(ordersData.sum).toBe(15);
			expect(paymentsData.sum).toBe(25);
		});

		test("should handle decrementing values", () => {
			const gh = new GaugeHistogram({
				name: "memory",
				help: "",
				labelNames: ["host"],
				buckets: [100, 200],
			});

			gh.labels({ host: "web1" }).observe(150);
			gh.labels({ host: "web1" }).observe(-50); // Decrement

			const output = gh.getMetric();
			expect(output).toInclude('memory_gsum{host="web1"} 100');
		});
	});
});
