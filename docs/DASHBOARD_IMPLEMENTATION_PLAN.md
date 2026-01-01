# Dashboard Implementation Plan

## Overview

A comprehensive dashboard system providing financial insights, client analytics, operational views, and invoice tracking for the application.

---

## Phase Summary

| Phase | Focus | Complexity | Est. Duration |
|-------|-------|------------|---------------|
| 1 | Foundation & Setup | MODERATE | 1-2 sessions |
| 2 | Financial Insights | MODERATE | 2-3 sessions |
| 3 | Client Analytics | MODERATE | 2-3 sessions |
| 4 | Operational Dashboard | MINOR-MODERATE | 1-2 sessions |
| 5 | Invoice & Payment Tracking | MODERATE | 1-2 sessions |
| 6 | Trends & Forecasting | MAJOR | 2-3 sessions |
| 7 | Polish & Refinements | MINOR | 1 session |

---

## Phase 1: Foundation & Setup [MODERATE]

### 1.1 Install Charting Library
- [ ] Add Recharts to frontend dependencies
- [ ] Create reusable chart wrapper components
- [ ] Set up chart theme to match brand colours

### 1.2 Dashboard Layout Restructure
- [ ] Create tabbed/sectioned dashboard layout
- [ ] Design responsive grid system for widgets
- [ ] Create reusable `DashboardWidget` component with:
  - Loading states
  - Error states
  - Consistent styling

### 1.3 API Foundation
- [ ] Create `/api/dashboard/trends` endpoint (monthly aggregations)
- [ ] Create `/api/dashboard/analytics` endpoint (detailed breakdowns)
- [ ] Add date range filtering support to existing endpoints

### Deliverables:
- Recharts integrated with brand colours
- `DashboardWidget`, `ChartCard` components
- New API endpoints returning test data
- Dashboard page with tabbed navigation

---

## Phase 2: Financial Insights [MODERATE]

### 2.1 Revenue Trend Chart
- [ ] API: Monthly revenue data (last 12 months)
- [ ] UI: Area/line chart with hover tooltips
- [ ] Feature: Toggle between revenue/sessions view

### 2.2 Revenue Comparison Cards
- [ ] API: This month vs last month vs same month last year
- [ ] UI: Comparison cards with % change indicators
- [ ] Feature: Green/red arrows for trends

### 2.3 Revenue by Day of Week
- [ ] API: Aggregate revenue by weekday
- [ ] UI: Bar chart showing daily breakdown
- [ ] Feature: Highlight busiest/quietest days

### 2.4 Projected Monthly Income
- [ ] API: Calculate based on scheduled clients × rates
- [ ] UI: Progress bar showing actual vs projected
- [ ] Feature: Days remaining indicator

### 2.5 Average Session Value
- [ ] API: Calculate from register entries
- [ ] UI: KPI card with trend indicator
- [ ] Feature: Compare to previous period

### Deliverables:
- "Financial" dashboard tab
- 5 financial widgets functional
- Real data from CosmosDB

---

## Phase 3: Client Analytics [MODERATE]

### 3.1 Client Retention Rate
- [ ] API: Compare active clients over time periods
- [ ] UI: Gauge/percentage display
- [ ] Feature: 3-month and 6-month views

### 3.2 Attendance Heatmap
- [ ] API: Client attendance by date
- [ ] UI: Calendar heatmap (GitHub contribution style)
- [ ] Feature: Click to see specific day details

### 3.3 Top Attendees Leaderboard
- [ ] API: Rank clients by attendance count
- [ ] UI: Leaderboard with avatars
- [ ] Feature: Time period selector (month/quarter/year)

### 3.4 Attendance Rate Widget
- [ ] API: Expected vs actual attendance
- [ ] UI: Donut chart with percentage
- [ ] Feature: Breakdown by day of week

### 3.5 New vs Returning Clients
- [ ] API: Client creation dates analysis
- [ ] UI: Pie chart with legend
- [ ] Feature: Monthly breakdown option

### 3.6 Clients at Risk Alert
- [ ] API: Identify clients not attended in X weeks
- [ ] UI: Alert card with client list
- [ ] Feature: Quick action to contact client

### Deliverables:
- "Clients" dashboard tab
- 6 client analytics widgets
- Actionable "at risk" alerts

---

## Phase 4: Operational Dashboard [MINOR-MODERATE]

### 4.1 Weekly Schedule Overview
- [ ] API: Aggregate expected clients per day
- [ ] UI: 7-day visual grid
- [ ] Feature: Click to go to that day's register

### 4.2 Today's Quick Stats
- [ ] API: Today's specific data
- [ ] UI: Prominent hero card
- [ ] Feature: Quick link to take register

### 4.3 Busiest Days Chart
- [ ] API: Historical attendance by weekday
- [ ] UI: Horizontal bar chart
- [ ] Feature: Show average and peak

### 4.4 Capacity Utilisation (Optional)
- [ ] Setting: Max capacity per day
- [ ] UI: Progress bars per day
- [ ] Feature: Warn when nearing capacity

### 4.5 Recent Session Notes Feed
- [ ] API: Latest notes from register entries
- [ ] UI: Timeline/feed layout
- [ ] Feature: Filterable by date range

### Deliverables:
- "Operations" dashboard tab
- 4-5 operational widgets
- Quick navigation to register

---

## Phase 5: Invoice & Payment Tracking [MODERATE]

### 5.1 Outstanding Balance Gauge
- [ ] API: Sum of unpaid invoices
- [ ] UI: Large gauge with amount
- [ ] Feature: Breakdown by status

### 5.2 Invoice Ageing Report
- [ ] API: Group invoices by age brackets
- [ ] UI: Stacked bar or grouped display
- [ ] Feature: 0-30, 30-60, 60+ day categories

### 5.3 Payment Success Rate
- [ ] API: Calculate paid on time vs late vs unpaid
- [ ] UI: Percentage with trend
- [ ] Feature: Compare to previous period

### 5.4 Top Outstanding Accounts
- [ ] API: Clients sorted by unpaid balance
- [ ] UI: Table with quick actions
- [ ] Feature: Link to send reminder

### 5.5 Invoice Status Breakdown
- [ ] API: Count by status
- [ ] UI: Donut chart
- [ ] Feature: Click to filter invoice list

### Deliverables:
- "Invoices" dashboard tab
- 5 invoice tracking widgets
- Quick actions for follow-up

---

## Phase 6: Trends & Forecasting [MAJOR]

### 6.1 Year-on-Year Growth
- [ ] API: Annual aggregations
- [ ] UI: Multi-year comparison chart
- [ ] Feature: Sessions and revenue views

### 6.2 Seasonal Patterns Analysis
- [ ] API: Monthly averages across years
- [ ] UI: Pattern visualisation
- [ ] Feature: Identify peaks/troughs

### 6.3 Client Growth Chart
- [ ] API: Cumulative client count over time
- [ ] UI: Cumulative area chart
- [ ] Feature: Show active vs total

### 6.4 Rolling 12-Month View
- [ ] API: Rolling sum calculations
- [ ] UI: Smoothed trend line
- [ ] Feature: Compare multiple metrics

### 6.5 Forecasting Widget
- [ ] API: Simple projection based on trends
- [ ] UI: Projected line with confidence band
- [ ] Feature: Adjustable assumptions

### Deliverables:
- "Trends" dashboard tab
- 5 trend/forecast widgets
- Strategic planning insights

---

## Phase 7: Polish & Refinements [MINOR]

### 7.1 Dashboard Customisation
- [ ] Allow users to reorder widgets
- [ ] Save preferred layout to user profile
- [ ] Option to hide/show specific widgets

### 7.2 Export & Reporting
- [ ] Export dashboard as PDF
- [ ] Export data as CSV
- [ ] Scheduled email reports (future)

### 7.3 Performance Optimisation
- [ ] Implement data caching
- [ ] Lazy load charts
- [ ] Optimise API queries

### 7.4 Mobile Responsiveness
- [ ] Ensure all charts work on mobile
- [ ] Simplified mobile layout
- [ ] Touch-friendly interactions

### Deliverables:
- Polished, production-ready dashboard
- Export capabilities
- Optimised performance

---

## Technical Specifications

### New API Endpoints Required

```
GET /api/dashboard/trends
  - Query params: startDate, endDate, granularity (daily|weekly|monthly)
  - Returns: Array of period summaries

GET /api/dashboard/analytics
  - Query params: type (revenue|attendance|clients), period
  - Returns: Detailed breakdown data

GET /api/dashboard/clients-at-risk
  - Query params: inactiveDays (default: 14)
  - Returns: Array of at-risk clients

GET /api/dashboard/attendance-by-day
  - Query params: startDate, endDate
  - Returns: Aggregated by weekday

GET /api/dashboard/invoice-ageing
  - Returns: Invoices grouped by age bracket
```

### Frontend Components to Create

```
components/
  dashboard/
    DashboardWidget.tsx       # Base widget wrapper
    ChartCard.tsx             # Chart container with header
    StatCard.tsx              # KPI display card
    TrendIndicator.tsx        # Up/down arrow with %
    
    charts/
      AreaChart.tsx           # Revenue trends
      BarChart.tsx            # Day comparisons
      DonutChart.tsx          # Status breakdowns
      Heatmap.tsx             # Attendance calendar
      Gauge.tsx               # Progress indicators
    
    widgets/
      RevenueTrendWidget.tsx
      RevenueComparisonWidget.tsx
      ClientsAtRiskWidget.tsx
      AttendanceRateWidget.tsx
      InvoiceAgeingWidget.tsx
      TopAttendeesWidget.tsx
      WeeklyOverviewWidget.tsx
      ... (one per feature)
```

### Database Queries (CosmosDB)

Key aggregation queries needed:
1. Monthly revenue/sessions grouping
2. Client attendance frequency
3. Invoice status aggregation
4. Day-of-week breakdowns
5. Client activity recency

---

## Implementation Order Recommendation

**Start with Phase 1** (Foundation) - this unlocks all subsequent phases.

Then prioritise based on immediate value:
1. **Phase 2** (Financial) - Most requested by business owners
2. **Phase 4** (Operational) - Daily use value
3. **Phase 5** (Invoices) - Cash flow critical
4. **Phase 3** (Client Analytics) - Retention insights
5. **Phase 6** (Trends) - Strategic planning

---

## Success Criteria

- [ ] Dashboard loads in < 2 seconds
- [ ] All charts render correctly on mobile
- [ ] Data updates in real-time when register saved
- [ ] Users can understand insights at a glance
- [ ] Actionable widgets link to relevant pages

---

## Notes

- Follow existing code conventions
- Use shared UI components from `@/components/ui`
- British English throughout
- Currency formatted as £X,XXX.XX
- Dates in DD/MM/YYYY format

---

*Document created: November 2025*
*Last updated: November 2025*
























