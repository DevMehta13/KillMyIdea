# Database Rules

- Prefer normalized schema unless there is a clear reason not to.
- Add migrations intentionally.
- Define constraints explicitly.
- Include createdAt / updatedAt where appropriate.
- Be careful with deletes; prefer soft delete where product logic benefits from history.
- Document relationships and cardinality when proposing schema changes.
