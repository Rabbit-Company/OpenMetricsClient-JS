# OpenMetrics-Compatible Metrics Library

A lightweight, type-safe implementation of OpenMetrics standard metrics for Node.js applications, featuring built-in support for all standard metric types with automatic registry management.

## Features

- **Full OpenMetrics Compliance:** Implements all standard metric types with proper formatting

- **Type-Safe API:** Written in TypeScript with complete type definitions

- **Comprehensive Metric Support:**

  - Counters (monotonically increasing values)
  - Gauges (arbitrary up/down values)
  - Histograms (bucketed observations)
  - Summaries (sliding window quantiles)
  - Info (static metadata)
  - StateSets (mutually exclusive states)

- **Automatic Registry Management:** Optional auto-registration of metrics

- **Time-Based Windowing:** Configurable observation windows for summaries

- **Label Support:** Full label implementation with proper escaping

## Installation

```bash
npm i @rabbit-company/openmetrics-client
```

## Usage

### Basic Setup

```js
import { Registry, Counter, Gauge, Histogram } from "@rabbit-company/openmetrics-client";

const registry = new Registry({ prefix: "myapp" });

// Create and register metrics
const requestCounter = new Counter({
	name: "http_requests_total",
	help: "Total HTTP requests",
	registry: registry,
});

const tempGauge = new Gauge({
	name: "temperature_celsius",
	help: "Current temperature",
	labels: { location: "server_room" },
	registry: registry,
});

// Observe values
requestCounter.inc();
tempGauge.set(23.5);
```

### Metric Types

#### Counter

```js
const counter = new Counter({
	name: "requests",
	help: "Total requests",
	registry: registry,
});

counter.inc(); // Increase by 1
counter.inc(5); // Increase by 5
```

#### Gauge

```js
const gauge = new Gauge({
	name: "memory_usage",
	help: "Current memory usage in bytes",
	registry: registry,
});

gauge.set(1024 * 1024 * 512); // 512MB
gauge.inc(100); // Increase by 100
gauge.dec(50); // Decrease by 50
```

#### Histogram

```js
const histogram = new Histogram({
	name: "response_size_bytes",
	help: "Response size distribution",
	buckets: [100, 500, 1000, 5000],
	registry: registry,
});

histogram.observe(350);
histogram.observe(1200);
```

#### Gauge Histogram

```js
const gaugeHistogram = new GaugeHistogram({
	name: "request_size_bytes",
	help: "Size of HTTP requests",
	buckets: [100, 500, 1000, 5000],
	registry: registry,
});

gaugeHistogram.observe(350);
gaugeHistogram.observe(1200);
```

#### Summary

```js
const summary = new Summary({
	name: "request_duration_seconds",
	help: "Request duration distribution",
	registry: registry,
	quantiles: [0.5, 0.9, 0.99],
	maxAgeSeconds: 300, // 5 minute window
	ageBuckets: 5, // Number of buckets for the sliding window
});

summary.observe(0.25);
```

#### StateSet

```js
const status = new StateSet({
	name: "service_status",
	help: "Current service status",
	states: ["running", "degraded", "stopped"],
	labels: { instance: "webserver-1" },
	registry: registry,
});

status.enableOnly("running"); // Enable only running
```

#### Info

```js
const version = new Info({
	name: "version",
	help: "Version of the project",
	labels: {
		version: "1.0.0",
	},
	registry: registry,
});
```

#### Unknown

```js
const unknown = new Unknown({
	name: "unknown",
	help: "Avoid using unknown as much as possible",
	value: 42,
	registry: registry,
});
```

## Exporting Metrics

```js
// In your HTTP server
import { Registry } from "@rabbit-company/openmetrics-client";

const registry = new Registry();
// ... setup metrics ...

// OpenMetrics requires metrics to be accessible thru /metrics API endpoint
server.get("/metrics", (req, res) => {
	// Don't forget to set the correct header
	res.set("Content-Type", "application/openmetrics-text; version=1.0.0; charset=utf-8");
	res.send(registry.metricsText());
});
```
