# Datadrop

## SQL Queries

What tables does this database contain and how large (num of rows) are they?

```sql
SELECT 'ghw_sessions' as table_name, COUNT (*) as num_of_rows FROM ghw_sessions
UNION ALL SELECT 'ghw_themes', COUNT (*) FROM ghw_themes
UNION ALL SELECT 'github_repos', COUNT (*) FROM github_repos
UNION ALL SELECT 'tech_jobs', COUNT (*) FROM tech_jobs;
```

What columns does each table contain?

```sql
-- Describe the structure of each table, run 1 at a time
DESCRIBE ghw_sessions;

DESCRIBE ghw_themes;

DESCRIBE github_repos;

DESCRIBE tech_jobs;
```

Summarize the contents of each table (e.g., count, min, max, avg for numeric columns)?

```sql
-- Summarize ghw_sessions
SUMMARIZE ghw_sessions;

-- Summarize ghw_themes
SUMMARIZE ghw_themes;

-- Summarize github_repos
SUMMARIZE github_repos;

-- Summarize tech_jobs
SUMMARIZE tech_jobs;
```

How many ghw_sessions were conducted in each year?

```sql
SELECT year, COUNT(*) AS total_sessions
FROM ghw_sessions
GROUP BY year,
ORDER By year;
```

How many ghw_sessions were related to "python"?

```sql
-- Case-sensitive search for "Python" in session_name
SELECT COUNT(*)
FROM ghw_sessions
WHERE session_name LIKE '%Python%';

-- Case-insensitive search for "python" in session_name
SELECT COUNT(*)
FROM ghw_sessions
WHERE session_name ILIKE '%python%';

-- Total number of ghw_sessions related to "python" in either session_name or theme
SELECT COUNT(*) AS total_python_sessions
FROM ghw_sessions
WHERE session_name ILIKE '%python%' OR theme ILIKE '%python%';
```
