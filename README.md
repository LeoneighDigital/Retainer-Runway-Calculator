# Retainer Runway & Savings Velocity Engine

A zero-dependency financial telemetry dashboard built for independent software consultants and sovereign operators transitioning from hourly services to asynchronous retainers.

Live Deployment: https://leoneighdigital.github.io/Retainer-Runway-Calender/

---

### Architecture & Capabilities

* **Bi-Directional Currency Engine:** Normalizes inputs into canonical ZAR while providing real-time USD display conversions via configurable exchange rates.
* **Deterministic Cashflow Projections:** Computes dynamic cash runway ($months = \frac{\text{balance}}{\text{net deficit}}$), daily capital velocity, and target arrival dates.
* **Pure Client-Side State:** Zero runtime dependencies or build steps; uses native DOM event listeners and CSS custom properties for reactive sub-5ms UI updates.
* **Visual Identity:** Matte carbon layout styled with Tailwind CSS, JetBrains Mono tabular typography, and custom high-contrast form controls.

---

### Local Development

Clone and serve directly from any static file server:

```bash
git clone [https://github.com/LeoneighDigital/retainer-runway.git](https://github.com/LeoneighDigital/retainer-runway.git)
cd retainer-runway
# Open index.html in any modern browser
