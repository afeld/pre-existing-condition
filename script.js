const margin = { top: 24, right: 28, bottom: 56, left: 66 };
const width = 980;
const height = 520;

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

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip =
  d3.select("body").select(".tooltip").node() ||
  d3.select("body").append("div").attr("class", "tooltip").node();

const tip = d3.select(tooltip);

const parseYear = d3.timeParse("%Y");
const formatYear = d3.timeFormat("%Y");

function makeChart(data) {
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([0, plotWidth]);

  const yMin = d3.min(data, (d) => d.insuredPct);
  const yMax = d3.max(data, (d) => d.insuredPct);
  const y = d3
    .scaleLinear()
    .domain([0, Math.ceil(yMax + 1)])
    .nice()
    .range([plotHeight, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-plotWidth).tickFormat(""));

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${plotHeight})`)
    .call(d3.axisBottom(x).ticks(data.length).tickFormat(d3.timeFormat("%Y")))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.3em");

  g.append("g")
    .attr("class", "axis")
    .call(
      d3
        .axisLeft(y)
        .ticks(6)
        .tickFormat((d) => `${d}%`),
    );

  g.append("text")
    .attr("x", plotWidth / 2)
    .attr("y", plotHeight + 48)
    .attr("fill", "#3f5066")
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("text")
    .attr("x", -plotHeight / 2)
    .attr("y", -48)
    .attr("fill", "#3f5066")
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Residents with health insurance (%)");

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.insuredPct));

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--line)")
    .attr("stroke-width", 3)
    .attr("d", line);

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

d3.csv("New_York_City_Community_Health_Survey_20260325.csv").then((rows) => {
  const data = rows
    .filter(
      (d) =>
        /^Prevalence/i.test(d.Prevelance) && d["No Health Insurance"] !== "",
    )
    .map((d) => {
      const uninsuredPct = Number(d["No Health Insurance"]);
      return {
        year: Number(d.Year),
        date: parseYear(d.Year),
        insuredPct: 100 - uninsuredPct,
      };
    })
    .filter(
      (d) => Number.isFinite(d.year) && d.date && Number.isFinite(d.insuredPct),
    )
    .sort((a, b) => a.year - b.year);

  makeChart(data);
});
