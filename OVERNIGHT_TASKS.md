# Overnight Agent Tasks - Additional Requirements

## Capex Data
Add capex/investment data:

- Create data/capex-data.json with known AUM/fund size/capex for major bidders:
  e.g. Macquarie GIG ~20B USD, IFM 200B+ AUM, AustralianSuper 300B+ AUM,
  Brookfield 900B+ AUM, BlackRock 10T AUM, Quinbrook 7B+ committed capital, etc.
- Include in australia-market.json: total Australian renewables capex forecast 2025-2030
  (AEMO estimates ~120B AUD needed by 2030)
- Add capex/AUM column to analytics dashboard tables

## Recent News (use training knowledge up to early 2025)
Add recentNews array in australia-market.json:
- Brookfield/Neoen acquisition 6.1B EUR (Apr 2025)
- Sembcorp/Alinta Energy 6.5B AUD (Dec 2025)
- Capacity Investment Scheme tenders and awards
- FIRB decisions affecting RE sector
- Transmission: HumeLink, VNI West, Project EnergyConnect updates

## Analytics Dashboard Enhancement
- Show total AUM/capex represented by filtered bidders
- Market context panel with Australia RE stats (82% by 2030 target, CIS scheme details)
