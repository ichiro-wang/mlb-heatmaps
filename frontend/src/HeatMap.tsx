/**
 * testing out creating a heatmap with d3
 * referencing https://d3-graph-gallery.com/graph/heatmap_tooltip.html
 */

import * as d3 from "d3";
import { useEffect, useRef } from "react";

export type DataPoint = { x: number; z: number; avg: number };

interface Props {
  data: DataPoint[] | null;
}

const HeatMap = ({ data }: Props) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const margin = { top: 40, right: 45, bottom: 0, left: 45 };
    const width = 450 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current);

    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear().domain([-1.5, 1.5]).range([0, width]);
    const z = d3.scaleLinear().domain([0.3, 5.0]).range([height, 0]);
    const zTicks = d3.range(0.5, 5.1, 0.5);
    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .style("visibility", "hidden")
      .call(d3.axisBottom(x).ticks(7).tickFormat(d3.format(".1f")));
    svg
      .append("g")
      .style("visibility", "hidden")
      .call(d3.axisLeft(z).tickValues(zTicks).tickFormat(d3.format(".1f")));

    const maxAvg = d3.max(data, (d) => d.avg)!;
    const minAvg = d3.min(data, (d) => d.avg)!;
    const color = d3
      .scaleLinear<string>()
      .range(["blue", "green", "yellow", "orange", "red"])
      .domain([
        minAvg,
        (maxAvg + minAvg) / 4,
        (maxAvg + minAvg) / 2,
        ((maxAvg + minAvg) * 3) / 4,
        maxAvg,
      ]);

    const tooltip = d3
      .select("body")
      .append("div")
      .style("opacity", 0)
      .style("class", "tooltip")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("color", "black")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px");

    const mouseover = () => {
      tooltip.style("opacity", 1);
    };

    const mousemove = (event: MouseEvent, d: DataPoint) => {
      tooltip
        .html(`AVG: ${d.avg.toFixed(3)}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`);
    };

    const mouseleave = () => {
      tooltip.style("opacity", 0);
    };

    const xDataStep = 3 / 50;
    const zDataStep = 4.7 / 50;

    const xStep = Math.abs(x(-1.5 + xDataStep)! - x(-1.5)!);
    const zStep = Math.abs(z(0.3)! - z(0.3 + zDataStep)!);

    svg
      .selectAll()
      .data(data, (d) => `${d!.x}:${d!.z}`)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x)!)
      .attr("y", (d) => z(d.z)!)
      .attr("width", xStep)
      .attr("height", zStep)
      .style("fill", (d) => color(d.avg))
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

    const strikeZone = {
      xMin: -0.71,
      xMax: 0.71,
      zMin: 1.5,
      zMax: 3.5,
    };

    svg
      .append("rect")
      .attr("x", x(strikeZone.xMin)!)
      .attr("y", z(strikeZone.zMax)!)
      .attr("width", x(strikeZone.xMax)! - x(strikeZone.xMin)!)
      .attr("height", z(strikeZone.zMin)! - z(strikeZone.zMax)!)
      .style("fill", "none")
      .style("stroke", "white")
      .style("stroke-width", "2px")
      .style("pointer-events", "none");

    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = width + 30;
    const legendY = margin.top;

    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    linearGradient
      .selectAll("stop")
      .data([
        { offset: "0%", color: color(minAvg) },
        { offset: "25%", color: color(minAvg + (maxAvg - minAvg) / 4) },
        { offset: "50%", color: color(minAvg + (maxAvg - minAvg) / 2) },
        { offset: "75%", color: color(minAvg + ((maxAvg - minAvg) * 3) / 4) },
        { offset: "100%", color: color(maxAvg) },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    svg
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    const legendScale = d3
      .scaleLinear()
      .domain([minAvg, maxAvg])
      .range([legendY + legendHeight, legendY]);

    const legendAxis = d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".3f"));

    svg
      .append("g")
      .attr("transform", `translate(${legendX + legendWidth}, 0)`)
      .call(legendAxis);

    svg
      .append("text")
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text("AVG");

    svg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("fill", "none")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("pointer-events", "none");
  }, [data]);

  return (
    <div>
      <p>AVG Heatmap</p>
      <svg ref={svgRef} />
    </div>
  );
};

export default HeatMap;
