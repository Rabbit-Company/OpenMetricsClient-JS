import { describe, expect, test, beforeEach } from "bun:test";
import { Registry } from "../src/Registry";
import { Histogram } from "../src/openmetrics-client";

describe("Histogram", () => {
	let registry: Registry;

	beforeEach(() => {
		registry = new Registry({ prefix: "test" });
	});

	test("should observe values", () => {
		const hist = new Histogram({ name: "latency", help: "", registry });
		[0.1, 0.2, 0.3].forEach((v) => hist.observe(v));
		expect(hist.getSnapshot().count).toBe(3);
	});

	test("should calculate buckets", () => {
		const hist = new Histogram({
			name: "size",
			help: "",
			buckets: [1, 2, 3],
		});
		[0.5, 1.5, 2.5, 10].forEach((v) => hist.observe(v));
		const output = hist.getMetric();
		expect(output).toInclude('size_bucket{le="1"} 1');
		expect(output).toInclude('size_bucket{le="+Inf"} 4');
	});

	describe("Histogram Labels", () => {
		test("should track separate histograms per label set", () => {
			const hist = new Histogram({
				name: "response_size",
				help: "",
				labelNames: ["endpoint"],
				buckets: [100, 200, 300],
				registry,
			});

			hist.labels({ endpoint: "/api" }).observe(150);
			hist.labels({ endpoint: "/admin" }).observe(250);

			const apiData = hist.getSnapshot({ endpoint: "/api" });
			const adminData = hist.getSnapshot({ endpoint: "/admin" });

			expect(apiData.count).toBe(1);
			expect(adminData.count).toBe(1);
			expect(apiData.sum).toBe(150);
			expect(adminData.sum).toBe(250);
		});
	});
});
