"use client";

import { useMemo, useState } from "react";

import { Story, buildTimelineStoryIndex, formatStoryYear } from "../lib/timeline";

type TimelineClientProps = {
  stories: Story[];
};

export default function TimelineClient({ stories }: TimelineClientProps) {
  const timelineStoryIndex = useMemo(() => buildTimelineStoryIndex(stories), [stories]);
  const timelineYears = useMemo(
    () => Object.keys(timelineStoryIndex).map(Number).sort((a, b) => a - b),
    [timelineStoryIndex]
  );
  const [selectedYear, setSelectedYear] = useState<number | undefined>(timelineYears[0]);
  const activeYear = selectedYear ?? timelineYears[0];
  const storiesForSelectedYear =
    activeYear === undefined ? [] : timelineStoryIndex[activeYear] ?? [];

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "grid",
        gap: 16
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0 }}>人生时间线</h1>
        <p style={{ margin: 0, color: "#4b5563" }}>点击年份，回看该年的故事详情。</p>
      </header>

      {timelineYears.length === 0 ? (
        <section
          style={{
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: 14
          }}
        >
          <p style={{ margin: 0, color: "#4b5563" }}>暂无时间线数据。</p>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 220px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start"
          }}
        >
          <nav
            aria-label="年份时间线"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: 12
            }}
          >
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "grid",
                gap: 8
              }}
            >
              {timelineYears.map((year) => {
                const count = timelineStoryIndex[year]?.length ?? 0;
                const isSelected = year === activeYear;
                return (
                  <li key={year}>
                    <button
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      aria-current={isSelected ? "true" : undefined}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 8,
                        border: isSelected ? "1px solid #2563eb" : "1px solid #d1d5db",
                        padding: "8px 10px",
                        background: isSelected ? "#eff6ff" : "#ffffff",
                        cursor: "pointer"
                      }}
                    >
                      {year}年 ({count})
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section
            aria-live="polite"
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: 14,
              display: "grid",
              gap: 12
            }}
          >
            <h2 style={{ margin: 0 }}>{activeYear} 年故事</h2>
            {storiesForSelectedYear.length === 0 ? (
              <p style={{ margin: 0, color: "#4b5563" }}>当前年份暂无故事。</p>
            ) : (
              storiesForSelectedYear.map((story) => (
                <article
                  key={story.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    display: "grid",
                    gap: 6
                  }}
                >
                  <h3 style={{ margin: 0 }}>{story.title}</h3>
                  <p style={{ margin: 0 }}>{story.summary}</p>
                  <p style={{ margin: 0, color: "#374151" }}>{story.details}</p>
                  <p style={{ margin: 0, color: "#4b5563" }}>
                    故事年份: {formatStoryYear(story.yearBinding)}
                  </p>
                </article>
              ))
            )}
          </section>
        </section>
      )}
    </main>
  );
}
