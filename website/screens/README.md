# Product artwork for the landing page

`website/index.html` references eight images from this folder. They are **not**
committed — they live in the design project the page was built from:

<https://claude.ai/design/p/b5601d89-0d84-43f4-b556-b88582b52466>

Download them from that project's `uploads/` folder and save them here under the
names in the right-hand column:

| File in the design project | Save as |
| --- | --- |
| `uploads/Live Location.png` | `live-location.png` |
| `uploads/Safe Zone.png` | `safe-zone.png` |
| `uploads/Journey History.png` | `journey-history.png` |
| `uploads/Route to your child.png` | `route.png` |
| `uploads/Multiple guardians.png` | `guardians.png` |
| `uploads/Setting Screen .png` | `settings.png` |
| `uploads/Generated Image September 12, 2026 - 11_13PM.jpg` | `tracker-app.jpg` |
| `uploads/Firsat generation.jpeg` | `tracker-box.jpeg` |

The six `.png` files are parent-app screenshots (roughly 880×1800). The two
photos show the tracker itself: `tracker-app.jpg` in the hardware section,
`tracker-box.jpeg` in the pricing panel.

Until they are in place the page still lays out correctly — each missing image
falls back to a neutral placeholder block rather than a broken-image icon (see
`.shot.is-missing` in `styles.css`).

These are large files. If you would rather not commit them, keep serving them
from here at deploy time, or move them to a CDN and update the `src` attributes
in `index.html`.
