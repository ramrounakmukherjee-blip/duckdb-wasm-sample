# NL Railway Dataset

Dutch railway service and stop data for March 2025, queried with SQL in the browser.

## Before you start

Run all the SQL on [https://shell.duckdb.org](https://shell.duckdb.org/). The DuckDB Web Shell is an in-browser SQL shell. DuckDB compiles to WebAssembly and runs in the browser tab. No installation and no server are necessary.

These examples use DuckDB v1.5.2 (Variegata). The shell shows the version at start-up.

## Procedure

1. Open [https://shell.duckdb.org](https://shell.duckdb.org/).
2. Click on the terminal area to set the focus.
3. Type a statement at the `memory D` prompt. End each SQL statement with a semicolon.
4. Push Enter to run the statement.

Type `.help` to see all the shell commands. The shell keeps the data in memory only. A reload of the page removes the table, and you must load the data again.

## Load the data

The dataset is a gzipped CSV file on a public server. DuckDB reads it directly over HTTPS. A download to your computer is not necessary.

```sql
CREATE TABLE services AS
FROM 'https://blobs.duckdb.org/nl-railway/services-2025-03.csv.gz';
```

```text
-- The statement takes approximately 15 seconds. The prompt does not respond during this time.
-- A successful CREATE TABLE shows no output. The shell returns to the `memory D` prompt.
-- An error message at this step usually shows a network problem.
```

Count the rows to make sure the load was successful:

```sql
SELECT COUNT(*) FROM services;
-- Result: 1902543
```

## The data

### What columns does this table have, and what type is each one?

```sql
DESCRIBE services;
```

```text
-- Result: 17 rows, one for each column. The column names have a prefix.
--   `Service:` columns describe the train:  RDT-ID, Date, Type, Company, Train number,
--                                           Completely cancelled, Partly cancelled, Maximum delay
--   `Stop:` columns describe one stop:      RDT-ID, Station code, Station name, Arrival time,
--                                           Arrival delay, Arrival cancelled, Departure time,
--                                           Departure delay, Departure cancelled
-- The column names contain a colon. Therefore you must put double quotation marks around each name in a query.
```

### What do the columns look like: min, max, how many nulls?

```sql
SUMMARIZE services;
```

```text
-- Result: 17 rows and 12 columns. The result columns are column_name, column_type, min, max,
-- approx_unique, avg, std, q25, q50, q75, count, and null_percentage.
--
-- Check `null_percentage`. The `Stop:Departure delay` column is null for 11.78% of the rows.
-- Those rows are stops with no departure, for example the last station of a train.
--
-- Check `approx_unique` for `Service:Date`. It shows 30, but March has 31 days. SUMMARIZE uses an
-- approximate count. Use COUNT(DISTINCT ...) when you need an exact number.
--
-- The shell truncates a wide or long result. The last line shows the true size, for example
-- `17 rows (5 shown)` and `12 columns (11 shown)`. The `…` and `·` characters mark the cut data.
```

## Trains and stops

### What time period does this data cover, and how many trains are in it?

```sql
SELECT MIN("Service:Date"), MAX("Service:Date"), COUNT(DISTINCT "Service:RDT-ID") AS distinct_trains
FROM services;
-- Result: 2025-03-01, 2025-03-31, and 223931 distinct trains across 31 days.
```

### Why does COUNT(*) not give the number of trains?

`COUNT(*)` counts stops, because one row is one stop. One train stops at many stations, thus it has many rows. `COUNT(DISTINCT "Service:RDT-ID")` counts the trains.

The two numbers are very different: 1,902,543 stops against 223,931 trains, thus approximately 8.5 stops for each train.

### Can COUNT(DISTINCT "Service:RDT-ID") run without SELECT and FROM?

No. An aggregate function needs both:

```sql
SELECT COUNT(DISTINCT "Service:RDT-ID") FROM services;
```

## Delays

### Which train companies have the worst average delays?

```sql
SELECT "Service:Company",
       COUNT(DISTINCT "Service:RDT-ID") AS trains,
       ROUND(AVG("Service:Maximum delay"), 1) AS avg_max_delay_min,
       MAX("Service:Maximum delay") AS worst_delay_min
FROM services
GROUP BY 1 ORDER BY avg_max_delay_min DESC;
```

```text
-- Result: 12 rows, one for each company.
--   Eu Sleeper   33 trains       2.5 min average   265 min worst
--   NS Int       3858 trains     0.9 min average   152 min worst
--   VIAS         1332 trains     0.7 min average    88 min worst
--   NS           147931 trains   0.2 min average   204 min worst
--   DB           2258 trains     0.0 min average     0 min worst
--
-- Check the `trains` column with the average. Eu Sleeper is first, but it has only 33 trains.
-- A small sample moves the average more than a large sample does.
--
-- Check the DB row. The average delay and the worst delay are both 0 for 2258 trains.
-- This is an indication of absent data, not of perfect operation.
```

### What does GROUP BY 1 mean?

It groups the rows by the first column in the SELECT list. Here that column is `"Service:Company"`. You can write `GROUP BY "Service:Company"` and get the same result.

### What does ORDER BY avg_max_delay_min DESC do?

It sorts the result by that column. `DESC` puts the largest value first.

### What does ROUND do?

It rounds a number to a quantity of decimal places. `ROUND(2.4848, 1)` gives 2.5.

Be careful with ROUND in a comparison. It changes the display only, and it can hide small differences. See the two examples that follow.

### What percentage of departures are more than 5 minutes late?

```sql
SELECT ROUND(100.0 * SUM(("Stop:Departure delay" > 5)::INT) / COUNT(*), 2) AS pct_late
FROM services WHERE "Stop:Departure delay" IS NOT NULL;
```

```text
-- Result: 2.78
-- `("Stop:Departure delay" > 5)::INT` changes each true value to 1 and each false value to 0.
-- SUM then counts the late departures.
-- The WHERE clause removes the 11.78% of rows with a null departure delay.
```

### Which 10 days had the worst average delays?

```sql
SELECT "Service:Date" AS d, ROUND(AVG("Service:Maximum delay"), 1) AS avg_delay,
       RANK() OVER (ORDER BY AVG("Service:Maximum delay") DESC) AS rnk
FROM services GROUP BY 1
QUALIFY rnk <= 10;
```

```text
-- Result: 10 rows. The avg_delay column shows 0.2 for all ten days.
-- The sequence is correct. RANK() uses the unrounded average, but ROUND(..., 1) hides the difference.
-- QUALIFY filters on the result of a window function. A WHERE clause cannot do this.
--
-- Change ROUND(..., 1) to ROUND(..., 3) to see the true values:
--   2025-03-06  0.244   2025-03-03  0.238   2025-03-18  0.230   2025-03-13  0.221
-- The difference between the best day and the worst day is approximately 0.08 minutes, that is, 5 seconds.
```

### How do delays differ between everyday trains and international or night trains?

```sql
SELECT "Service:Type", COUNT(DISTINCT "Service:RDT-ID") AS trains,
       ROUND(AVG("Service:Maximum delay"), 1) AS avg_delay
FROM services GROUP BY 1 ORDER BY trains DESC;
```

```text
-- Result: 17 rows.
--   Sprinter            84879 trains   0.2 min    domestic, the most frequent type
--   Stoptrein           47476 trains   0.2 min
--   Intercity           41212 trains   0.3 min
--   Stopbus ipv trein   13719 trains   0.0 min    `ipv trein` = a bus in place of a train
--   Eurostar              900 trains   1.4 min    international
--   Nightjet              127 trains   1.8 min    night train
--   European Sleeper       33 trains   2.5 min    night train
--
-- Check the pattern: long international and night trains have a higher average delay than domestic trains.
-- The bus and metro replacement types show 0.0, because the source system does not record their delays.
```

### Are some days of the week worse than others?

```sql
SELECT strftime("Service:Date", '%A') AS weekday,
       COUNT(*) AS n, ROUND(AVG("Service:Maximum delay"), 1) AS avg_delay
FROM services GROUP BY 1 ORDER BY avg_delay DESC;
```

```text
-- Result: 7 rows. All seven show avg_delay 0.2, thus this query answers nothing.
-- ROUND(..., 1) is too coarse again. Use ROUND(..., 3):
--   Thursday 0.221   Tuesday 0.210   Friday 0.207   Monday 0.201
--   Wednesday 0.201  Sunday 0.180    Saturday 0.168
-- Thursday is the worst day and Saturday is the best day, but the difference is small.
--
-- Check the `n` column. Monday has 325621 stops and Sunday has 250840. The weekend timetable is smaller.
```

## Cancellations and stations

### Which companies cancel the most trains?

```sql
SELECT "Service:Company",
       SUM("Service:Completely cancelled"::INT) AS fully_cancelled,
       SUM("Service:Partly cancelled"::INT) AS partly_cancelled
FROM services GROUP BY 1 ORDER BY 2 DESC;
```

```text
-- Result: 12 rows.
--   NS        14814 fully   118639 partly
--   Arriva     3678 fully    19415 partly
--   NS Int     2380 fully     5028 partly
--   DB            0 fully        0 partly
--
-- These are counts of stops, not counts of trains, because SUM operates on rows.
-- A partly cancelled train gives one row for each of its stops.
-- Use COUNT(DISTINCT "Service:RDT-ID") with a WHERE clause to count the trains.
--
-- Compare with the delay result. DB shows 0 again, which supports the absent-data conclusion.
```

### Which stations are the busiest?

```sql
SELECT "Stop:Station name", COUNT(*) AS stop_events
FROM services GROUP BY 1 ORDER BY 2 DESC LIMIT 15;
```

```text
-- Result: 15 rows.
--   Utrecht Centraal       39363
--   Amsterdam Centraal     35417
--   Amsterdam Sloterdijk   27142
--   Rotterdam Centraal     26789
--   Schiphol Airport       23228
--
-- Utrecht Centraal is first because it is the central junction of the network, not the largest city.
```

## Performance and output

### How long did that query take?

```sql
.timer on
```

The shell then shows the run time below each result. Use `.timer off` to stop this.

### How do you stop the shell from truncating the output?

```sql
.maxwidth 100000
.maxrows 100
```

`.maxwidth` sets the character width of the result. `.maxrows` sets the quantity of rows, and the default is 40. A truncated result shows its true size on the last line, for example `17 rows (5 shown)`.

Use `.last` to show the previous result again with no truncation.

### How does an approximate distinct count compare to an exact one?

```sql
SELECT COUNT(DISTINCT "Service:RDT-ID") FROM services;   -- exact:  223931
SELECT approx_count_distinct("Service:RDT-ID") FROM services;  -- approximate: 202019
```

```text
-- The approximate count is 21912 too low, that is, an error of 9.8%.
-- approx_count_distinct uses the HyperLogLog algorithm. It is faster and uses less memory,
-- but the result is an estimate. SUMMARIZE uses the same algorithm for its approx_unique column.
-- Use it to find the order of magnitude. Do not use it for a reported number.
```

### How do you save query results to a file?

```sql
COPY (SELECT * FROM services WHERE "Service:Company" = 'NS Int') TO 'nightjet.parquet' (FORMAT parquet);
```

```text
-- The statement shows no output. It writes to the virtual file system of the shell, not to your computer.
```

Use `.files list` to see the file. Then download it:

```sql
.files download nightjet.parquet
```

```text
-- `.files list` shows the source URL and `nightjet.parquet`.
-- `.files download` starts a normal browser download.
-- The file is lost at a page reload, because the shell holds it in memory.
```

## Faults and corrections

| Fault | Cause | Correction |
| --- | --- | --- |
| `Table with name services does not exist` | You reloaded the page | Run the CREATE TABLE statement again |
| `Referenced column "Service:Date" not found` | No quotation marks around the name | Put double quotation marks around each column name |
| The result stops at 40 rows | The default `.maxrows` value | Run `.maxrows 100` |
| The columns show `…` | The result is wider than the terminal | Run `.maxwidth 100000` or `.last` |
| Nothing happens after you type | The terminal does not have the focus | Click on the terminal area |
| The statement does not run | No semicolon at the end | Add `;` and push Enter |
| The COPY file is not on your computer | COPY writes to the virtual file system | Run `.files download nightjet.parquet` |

## Related

- [DuckDB WASM documentation](https://duckdb.org/docs/lts/clients/wasm/overview)
- [DuckDB_WASM_Devtools.md](DuckDB_WASM_Devtools.md) - the same engine from the Devtools console
