"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface UsagePoint {
  day: string // ISO date string YYYY-MM-DD
  count: number
}

interface UsageChartProps {
  data: UsagePoint[]
}

export function UsageChart({ data }: UsageChartProps) {
  const filled = useMemo(() => fillMissingDays(data, 30), [data])
  const total = filled.reduce((acc, d) => acc + d.count, 0)
  const peak = filled.reduce((acc, d) => Math.max(acc, d.count), 0)

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            requests in the last 30 days
          </div>
        </div>
        <div>
          <div className="text-2xl font-semibold tracking-tight">
            {peak.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">peak day</div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filled}
            margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="usage-fill" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgb(120,119,198)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="100%"
                  stopColor="rgb(120,119,198)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
              tickFormatter={shortDay}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              contentStyle={{
                background: "rgb(15, 17, 32)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(label) => fullDay(String(label))}
              formatter={(value) => [
                Number(value).toLocaleString(),
                "Requests",
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="rgb(150,149,228)"
              strokeWidth={2}
              fill="url(#usage-fill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function fillMissingDays(data: UsagePoint[], days: number): UsagePoint[] {
  const map = new Map(data.map((d) => [d.day, d.count]))
  const out: UsagePoint[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ day: key, count: map.get(key) ?? 0 })
  }
  return out
}

function shortDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function fullDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}
