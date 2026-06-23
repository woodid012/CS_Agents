# Capex Scraper — Output Format Specification

The scraper must produce a **JSON array** where each element is one cost line item.
The array should be written to stdout or a `.json` file and POSTed to the API endpoint below.

---

## API Endpoint

```
POST /api/capex/data-capex
Content-Type: application/json

{ "rows": [ ...row objects... ] }
```

---

## Row Schema

| Field       | Type           | Required | Description |
|-------------|----------------|----------|-------------|
| `file_name` | string         | yes      | Source file name, e.g. `"Project Alpha - Financial Model v3.xlsx"` |
| `reference` | string or null | no       | Internal reference / row label / section heading from the file, e.g. `"C.4.2"`, `"Sheet: Capex"` |
| `name`      | string         | yes      | Human-readable name of the cost item, e.g. `"Solar PV Modules"` |
| `type`      | string         | yes      | Cost category — must be one of the values below |
| `value`     | number or null | no       | Numeric value, stripped of currency symbols and commas, e.g. `1250000` |
| `unit`      | string or null | no       | Unit of the value, e.g. `"$/MW"`, `"$/MWh"`, `"AUD"`, `"AUD/yr"`, `"%"` |

---

## Allowed `type` Values

| Value     | Use for |
|-----------|---------|
| `capex`   | One-off capital expenditure (EPC, procurement, construction) |
| `opex`    | Ongoing operating expenditure (O&M, insurance, land lease) |
| `finance` | Financing costs (debt, equity, fees, interest during construction) |
| `devex`   | Development expenditure (permitting, studies, legal, grid connection) |
| `other`   | Anything that doesn't fit the above |

Use lowercase exactly as shown.

---

## Example Output

```json
[
  {
    "file_name": "Project Alpha - Financial Model v3.xlsx",
    "reference": "C.1",
    "name": "Solar PV Modules",
    "type": "capex",
    "value": 18500000,
    "unit": "AUD"
  },
  {
    "file_name": "Project Alpha - Financial Model v3.xlsx",
    "reference": "C.2",
    "name": "Inverters & Transformers",
    "type": "capex",
    "value": 4200000,
    "unit": "AUD"
  },
  {
    "file_name": "Project Alpha - Financial Model v3.xlsx",
    "reference": "O.1",
    "name": "O&M Contract",
    "type": "opex",
    "value": 12500,
    "unit": "$/MW/yr"
  },
  {
    "file_name": "Project Alpha - Financial Model v3.xlsx",
    "reference": "F.1",
    "name": "Construction Finance Fee",
    "type": "finance",
    "value": 1.5,
    "unit": "%"
  },
  {
    "file_name": "Project Alpha - Financial Model v3.xlsx",
    "reference": null,
    "name": "Grid Connection Study",
    "type": "devex",
    "value": 85000,
    "unit": "AUD"
  }
]
```

---

## Rules

1. **One row per cost line item** — do not aggregate or subtotal rows. Keep each granular line.
2. **Strip formatting** — remove `$`, `,`, `(`, `)` from values. Negative numbers should be negative floats, e.g. `(500000)` → `-500000`.
3. **Null over empty string** — if a field has no value, use `null`, not `""`.
4. **`file_name` must match the actual filename** — include the extension.
5. **`type` must be lowercase** — exactly one of: `capex`, `opex`, `finance`, `devex`, `other`.
6. **Skip header/total rows** — do not include rows that are section headers, subtotals, or grand totals.
7. **Skip blank rows** — omit any row where both `name` and `value` are null/empty.
