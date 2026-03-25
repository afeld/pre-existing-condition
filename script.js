// Define chart margins and drawing area dimensions.
const margin = { top: 24, right: 28, bottom: 56, left: 66 };
const width = 980;
const height = 520;

// Create the root SVG and provide accessible chart text for screen readers.
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr(
    "aria-label",
    "Line chart of percent of NYC residents with health insurance by year.",
  );

const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

// Shift the plotting group so axes/marks respect margins.
const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Reuse an existing tooltip if present, otherwise create one.
const tooltip =
  d3.select("body").select(".tooltip").node() ||
  d3.select("body").append("div").attr("class", "tooltip").node();

const tip = d3.select(tooltip);

// Parse numeric years into dates for a time scale and format them for labels.
const parseYear = d3.timeParse("%Y");
const formatYear = d3.timeFormat("%Y");

function makeChart(data) {
  // Time scale for the x-axis: oldest year on the left, latest on the right.
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([0, plotWidth]);

  // Track max insured percentage so y-axis can adapt to data while starting at zero.
  const yMax = d3.max(data, (d) => d.insuredPct);
  const y = d3
    .scaleLinear()
    // Start at zero so vertical distances are not visually exaggerated.
    .domain([0, Math.ceil(yMax + 1)])
    .nice()
    .range([plotHeight, 0]);

  // Draw horizontal grid lines to make value comparisons easier.
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-plotWidth).tickFormat(""));

  // Draw the x-axis and rotate labels to avoid overlap.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.timeFormat("%Y")))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.3em");

  // Draw the y-axis and format tick labels as percentages.
  g.append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickFormat((d) => `${d}%`),
    );

  // X-axis title.
  g.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + 48)
    .attr("fill", "#3f5066")
    .attr("text-anchor", "middle")
    .text("Year");

  // Y-axis title.
  g.append("text")
    .attr("x", -plotHeight / 2)
    .attr("y", -48)
    .attr("fill", "#3f5066")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Residents with health insurance (%)");

  // Line generator maps each data point into screen coordinates.
  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.insuredPct));

  // Draw the primary trend line.
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--line)")
    .attr("stroke-width", 3)
    .attr("d", line);

  // Draw point markers and show an exact value tooltip on hover.
  g.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.insuredPct))
    .attr("r", 4.5)
    .attr("fill", "var(--point)")
    .on("mousemove", (event, d) => {
      tip
        .style("opacity", 1)
        .style("left", `${event.pageX}px`)
        .style("top", `${event.pageY}px`)
        .html(
          `<strong>${formatYear(d.date)}</strong><br>${d.insuredPct.toFixed(1)}% insured`,
        );
    })
    .on("mouseleave", () => tip.style("opacity", 0));
}

// Load local CSV data and build the chart.
d3.csv("New_York_City_Community_Health_Survey_20260325.csv").then((rows) => {
  const data = rows
    // Keep only prevalence estimate rows (exclude confidence interval rows).
    .filter(
      (d) =>
        /^Prevalence/i.test(d.Prevelance) && d["No Health Insurance"] !== "",
    )
    .map((d) => {
      // Convert "No Health Insurance" into "With Health Insurance".
      const uninsuredPct = Number(d["No Health Insurance"]);
      return {
        year: Number(d.Year),
        date: parseYear(d.Year),
        insuredPct: 100 - uninsuredPct,
      };
    })
    // Remove malformed rows before rendering.
    .filter(
      (d) => Number.isFinite(d.year) && d.date && Number.isFinite(d.insuredPct),
    )
    // Ensure points are connected in chronological order.
    .sort((a, b) => a.year - b.year);

  makeChart(data);
});
